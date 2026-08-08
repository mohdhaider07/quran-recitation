import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Ayah } from "@/store/api/quranApi";
import { useMediaSession } from "@/hooks/useMediaSession";

interface UseQuranAudioOptions {
  ayahs: Ayah[];
  juz: number;
  reciterName: string;
  isFetching: boolean;
  onNextJuz?: () => void;
}

export function useQuranAudio({
  ayahs,
  juz,
  reciterName,
  isFetching,
  onNextJuz,
}: UseQuranAudioOptions) {
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Single HTMLAudioElement reference for pure media session stability
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Source-of-truth refs for callbacks & background event handlers
  const isPlayingRef = useRef(isPlaying);
  const currentIndexRef = useRef(currentAyahIndex);
  const ayahsRef = useRef(ayahs);
  const juzRef = useRef(juz);
  const fallbackIndexRef = useRef(0);
  const onNextJuzRef = useRef(onNextJuz);

  // Keep refs in sync synchronously
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentIndexRef.current = currentAyahIndex;
  }, [currentAyahIndex]);
  useEffect(() => {
    ayahsRef.current = ayahs;
  }, [ayahs]);
  useEffect(() => {
    juzRef.current = juz;
  }, [juz]);
  useEffect(() => {
    onNextJuzRef.current = onNextJuz;
  }, [onNextJuz]);

  // Current active Ayah
  const currentAyah = useMemo(
    () => ayahs[currentAyahIndex] || null,
    [ayahs, currentAyahIndex]
  );

  // Helper to extract all available audio URLs (primary + secondary fallbacks)
  const getAudioSources = useCallback((ayah: Ayah | null | undefined): string[] => {
    if (!ayah) return [];
    const sources: string[] = [];
    if (ayah.audio && typeof ayah.audio === "string" && ayah.audio.trim()) {
      sources.push(ayah.audio.trim());
    }
    if (Array.isArray(ayah.audioSecondary)) {
      ayah.audioSecondary.forEach((sec) => {
        if (sec && typeof sec === "string" && sec.trim() && !sources.includes(sec.trim())) {
          sources.push(sec.trim());
        }
      });
    }
    return sources;
  }, []);

  // Advance to next track (internal or manual trigger)
  const advanceToNext = useCallback(() => {
    const audio = audioRef.current;
    const nextIdx = currentIndexRef.current + 1;
    const total = ayahsRef.current.length;

    if (nextIdx < total) {
      fallbackIndexRef.current = 0;
      const nextAyah = ayahsRef.current[nextIdx];
      const sources = getAudioSources(nextAyah);

      if (audio && sources.length > 0 && isPlayingRef.current) {
        const nextSrc = sources[0];
        audio.src = nextSrc;
        audio.load();
        audio.play().catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Lockscreen transition play error:", err);
          }
        });
      }

      currentIndexRef.current = nextIdx;
      setCurrentAyahIndex(nextIdx);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
    } else if (juzRef.current < 30) {
      fallbackIndexRef.current = 0;
      currentIndexRef.current = 0;
      setCurrentAyahIndex(0);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
      if (onNextJuzRef.current) {
        onNextJuzRef.current();
      }
    } else {
      setIsPlaying(false);
    }
  }, [getAudioSources]);

  // Request Screen WakeLock during playback to prevent screen dimming/locking
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (
        isPlaying &&
        typeof window !== "undefined" &&
        "wakeLock" in navigator &&
        typeof (navigator as any).wakeLock?.request === "function"
      ) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        } catch (err) {
          // Wake lock not granted or supported
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [isPlaying]);

  // Initialize HTMLAudioElement and event listeners
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime || 0);
      }
    };

    audio.onloadedmetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 0);
        setIsAudioLoading(false);
        setAudioError(null);
      }
    };

    audio.onwaiting = () => {
      setIsAudioLoading(true);
    };

    audio.oncanplay = () => {
      setIsAudioLoading(false);
    };

    audio.onended = () => {
      if (!isPlayingRef.current) return;
      advanceToNext();
    };

    audio.onerror = () => {
      setIsAudioLoading(false);
      const activeAyah = ayahsRef.current[currentIndexRef.current];
      const sources = getAudioSources(activeAyah);

      if (fallbackIndexRef.current + 1 < sources.length) {
        fallbackIndexRef.current += 1;
        const fallbackUrl = sources[fallbackIndexRef.current];
        console.warn(
          `Primary audio failed for Ayah ${currentIndexRef.current + 1}. Falling back to secondary audio:`,
          fallbackUrl
        );
        audio.src = fallbackUrl;
        audio.load();
        if (isPlayingRef.current) {
          audio.play().catch((err) => {
            if (err.name !== "AbortError") {
              console.error("Secondary audio play failed", err);
            }
          });
        }
      } else {
        const errMsg = `Audio stream unavailable for Ayah ${currentIndexRef.current + 1}`;
        console.error(errMsg);
        setAudioError(errMsg);

        if (isPlayingRef.current && currentIndexRef.current < ayahsRef.current.length - 1) {
          setTimeout(() => {
            if (isPlayingRef.current) advanceToNext();
          }, 1500);
        } else {
          setIsPlaying(false);
        }
      }
    };

    return () => {
      audio.pause();
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onwaiting = null;
      audio.oncanplay = null;
      audio.onended = null;
      audio.onerror = null;

      audioRef.current = null;
    };
  }, [advanceToNext, getAudioSources]);

  // Volume & Mute listener
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Playback changes & track updates
  useEffect(() => {
    let isCancelled = false;

    const syncPlayback = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!isPlaying) {
        audio.pause();
        return;
      }

      if (isFetching || ayahs.length === 0) {
        return;
      }

      const ayah = ayahs[currentAyahIndex];
      const sources = getAudioSources(ayah);

      if (sources.length === 0) {
        setAudioError(`No audio link available for Ayah ${currentAyahIndex + 1}`);
        setIsPlaying(false);
        return;
      }

      const targetSrc = sources[fallbackIndexRef.current] || sources[0];

      try {
        if (audio.src !== targetSrc) {
          setIsAudioLoading(true);
          setCurrentTime(0);
          setDuration(0);
          audio.src = targetSrc;
          audio.load();
        }

        if (audio.paused && isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        }

        if (!isCancelled) {
          setIsAudioLoading(false);
          setAudioError(null);
        }
      } catch (err: any) {
        if (isCancelled || err.name === "AbortError") return;
        console.error("Playback execution error:", err);
        setIsAudioLoading(false);

        if (fallbackIndexRef.current + 1 < sources.length) {
          fallbackIndexRef.current += 1;
          const fallbackUrl = sources[fallbackIndexRef.current];
          audio.src = fallbackUrl;
          audio.load();
          audio.play().catch(() => {});
        } else {
          setAudioError("Buffering recitation...");
        }
      }
    };

    syncPlayback();

    return () => {
      isCancelled = true;
    };
  }, [currentAyahIndex, isPlaying, ayahs, isFetching, getAudioSources]);

  // Controls API
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const selectAyah = useCallback((index: number) => {
    fallbackIndexRef.current = 0;
    setCurrentAyahIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
    setIsPlaying(true);
  }, []);

  const nextAyah = useCallback(() => {
    if (currentAyahIndex < ayahs.length - 1) {
      selectAyah(currentAyahIndex + 1);
    } else if (juz < 30 && onNextJuz) {
      onNextJuz();
    }
  }, [currentAyahIndex, ayahs.length, juz, onNextJuz, selectAyah]);

  const prevAyah = useCallback(() => {
    if (currentAyahIndex > 0) {
      selectAyah(currentAyahIndex - 1);
    }
  }, [currentAyahIndex, selectAyah]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (audioRef.current && duration > 0) {
        const clamped = Math.max(0, Math.min(seconds, duration));
        audioRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [duration]
  );

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      seekTo(audioRef.current.currentTime + 10);
    }
  }, [seekTo]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      seekTo(audioRef.current.currentTime - 10);
    }
  }, [seekTo]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const resetIndex = useCallback(() => {
    fallbackIndexRef.current = 0;
    setCurrentAyahIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  }, []);

  // Sync OS Media Session (Lockscreen & Bluetooth Headset controls)
  useMediaSession({
    metadata: {
      title: currentAyah
        ? `Ayah ${currentAyah.numberInSurah} • ${currentAyah.surah?.englishName || "Surah"}`
        : "Holy Quran",
      artist: reciterName,
      album: `Juz ${juz}`,
    },
    playbackState: isPlaying ? "playing" : "paused",
    positionState: duration
      ? { duration, position: Math.min(currentTime, duration), playbackRate: 1 }
      : null,
    handlers: {
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      previoustrack: prevAyah,
      nexttrack: nextAyah,
      seekbackward: skipBackward,
      seekforward: skipForward,
    },
  });

  return {
    currentAyahIndex,
    currentAyah,
    isPlaying,
    isAudioLoading,
    audioError,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    selectAyah,
    nextAyah,
    prevAyah,
    seekTo,
    skipForward,
    skipBackward,
    setVolume,
    toggleMute,
    resetIndex,
    setIsPlaying,
  };
}
