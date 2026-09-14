import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  RECITERS_LIST,
  JUZ_SURAHS_MAP,
  SURAHS_META,
  Reciter,
  getSurahAudioUrl,
} from "@/lib/quranStream";
import { useMediaSession } from "@/hooks/useMediaSession";

export interface UseQuranStreamAudioOptions {
  initialJuz?: number;
  initialReciterId?: number;
}

export function useQuranStreamAudio(options: UseQuranStreamAudioOptions = {}) {
  const { initialJuz = 1, initialReciterId = 1 } = options;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [juz, setJuz] = useState<number>(initialJuz);
  const [reciterId, setReciterId] = useState<number>(initialReciterId);
  const [currentSurahIndex, setCurrentSurahIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [surahDurations, setSurahDurations] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronous refs to prevent stale closure issues in audio callbacks
  const isPlayingRef = useRef<boolean>(isPlaying);
  const juzRef = useRef<number>(juz);
  const reciterIdRef = useRef<number>(reciterId);
  const currentSurahIndexRef = useRef<number>(currentSurahIndex);

  // ─── Computed Properties ───────────────────────────────────────────────────
  const surahsInActiveJuz = useMemo(() => {
    return JUZ_SURAHS_MAP[juz] || [1];
  }, [juz]);

  const activeSurahNumber = surahsInActiveJuz[currentSurahIndex] || surahsInActiveJuz[0];

  const surahsInActiveJuzRef = useRef<number[]>(surahsInActiveJuz);
  const activeSurahNumberRef = useRef<number>(activeSurahNumber);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    juzRef.current = juz;
  }, [juz]);
  useEffect(() => {
    reciterIdRef.current = reciterId;
  }, [reciterId]);
  useEffect(() => {
    currentSurahIndexRef.current = currentSurahIndex;
  }, [currentSurahIndex]);
  useEffect(() => {
    surahsInActiveJuzRef.current = surahsInActiveJuz;
  }, [surahsInActiveJuz]);
  useEffect(() => {
    activeSurahNumberRef.current = activeSurahNumber;
  }, [activeSurahNumber]);

  const activeSurahMeta = useMemo(() => {
    return (
      SURAHS_META[activeSurahNumber] || {
        number: activeSurahNumber,
        name: `سورة ${activeSurahNumber}`,
        englishName: `Surah ${activeSurahNumber}`,
      }
    );
  }, [activeSurahNumber]);

  const activeReciter: Reciter = useMemo(() => {
    return RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];
  }, [reciterId]);

  const currentAudioUrl = useMemo(() => {
    return getSurahAudioUrl(activeSurahNumber, reciterId);
  }, [activeSurahNumber, reciterId]);

  // ─── Pre-fetch Surah Durations for Active Juz ──────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const surahNumbers = JUZ_SURAHS_MAP[juz] || [];

    surahNumbers.forEach((sNum) => {
      const url = getSurahAudioUrl(sNum, reciterId);
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = url;

      probe.onloadedmetadata = () => {
        if (isMounted && probe.duration && isFinite(probe.duration)) {
          setSurahDurations((prev) => ({
            ...prev,
            [sNum]: probe.duration,
          }));
        }
      };

      probe.onerror = () => {
        // Probe fallback server if available
        const fallbackUrl = getSurahAudioUrl(sNum, reciterId, true);
        if (fallbackUrl !== url) {
          const fallbackProbe = new Audio();
          fallbackProbe.preload = "metadata";
          fallbackProbe.src = fallbackUrl;
          fallbackProbe.onloadedmetadata = () => {
            if (isMounted && fallbackProbe.duration && isFinite(fallbackProbe.duration)) {
              setSurahDurations((prev) => ({
                ...prev,
                [sNum]: fallbackProbe.duration,
              }));
            }
          };
        }
      };
    });

    return () => {
      isMounted = false;
    };
  }, [juz, reciterId]);

  // ─── Pre-buffer Next Surah Audio (Zero-Gap Transition) ────────────────────
  useEffect(() => {
    const list = surahsInActiveJuz;
    const nextIdx = currentSurahIndex + 1;
    if (nextIdx < list.length) {
      const nextSurahNum = list[nextIdx];
      const nextUrl = getSurahAudioUrl(nextSurahNum, reciterId);
      const prefetchAudio = new Audio();
      prefetchAudio.preload = "auto";
      prefetchAudio.src = nextUrl;
      return () => {
        prefetchAudio.removeAttribute("src");
      };
    }
  }, [surahsInActiveJuz, currentSurahIndex, reciterId]);

  // ─── Overall Juz Total Duration & Elapsed Time ─────────────────────────────
  const totalJuzDuration = useMemo(() => {
    return surahsInActiveJuz.reduce((acc, sNum) => {
      return acc + (surahDurations[sNum] || (sNum === activeSurahNumber ? currentDuration : 0));
    }, 0);
  }, [surahsInActiveJuz, surahDurations, activeSurahNumber, currentDuration]);

  const totalJuzElapsedTime = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < currentSurahIndex; i++) {
      const sNum = surahsInActiveJuz[i];
      elapsed += surahDurations[sNum] || 0;
    }
    elapsed += currentTime;
    return elapsed;
  }, [surahsInActiveJuz, currentSurahIndex, surahDurations, currentTime]);

  // ─── Setup HTML Audio Element (Single Persistent Instance) ────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    audio.onloadedmetadata = () => {
      const d = audio.duration;
      if (d && !isNaN(d) && isFinite(d)) {
        setCurrentDuration(d);
        setSurahDurations((prev) => ({
          ...prev,
          [activeSurahNumberRef.current]: d,
        }));
      }
      setIsLoading(false);
      setError(null);
    };

    audio.onwaiting = () => setIsLoading(true);
    audio.oncanplay = () => setIsLoading(false);
    audio.onplaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    audio.onpause = () => setIsPlaying(false);

    // Auto-advance sequentially to the NEXT Surah in this Juz
    audio.onended = () => {
      const list = surahsInActiveJuzRef.current;
      const nextIdx = currentSurahIndexRef.current + 1;

      if (nextIdx < list.length) {
        // Continuous transition to next Surah in this Juz
        currentSurahIndexRef.current = nextIdx;
        setCurrentSurahIndex(nextIdx);
        setCurrentTime(0);
        const nextSurahNum = list[nextIdx];
        activeSurahNumberRef.current = nextSurahNum;
        const nextUrl = getSurahAudioUrl(nextSurahNum, reciterIdRef.current);
        audio.src = nextUrl;
        audio.load();
        audio.play().catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Auto-advance play error:", err);
          }
        });
      } else {
        // Reached end of current Juz!
        const curJuz = juzRef.current;
        if (curJuz < 30) {
          const nextJuz = curJuz + 1;
          const nextJuzSurahs = JUZ_SURAHS_MAP[nextJuz] || [1];
          juzRef.current = nextJuz;
          currentSurahIndexRef.current = 0;
          surahsInActiveJuzRef.current = nextJuzSurahs;
          activeSurahNumberRef.current = nextJuzSurahs[0];
          setJuz(nextJuz);
          setCurrentSurahIndex(0);
          setCurrentTime(0);
          const nextUrl = getSurahAudioUrl(nextJuzSurahs[0], reciterIdRef.current);
          audio.src = nextUrl;
          audio.load();
          audio.play().catch((err) => {
            if (err.name !== "AbortError") {
              console.warn("Juz auto-advance play error:", err);
            }
          });
        } else {
          // Finished entire Quran
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
    };

    audio.onerror = () => {
      if (!audio.getAttribute("src") || audio.src === "" || audio.src === window.location.href) {
        return;
      }

      const sNum = activeSurahNumberRef.current;
      const fallbackUrl = getSurahAudioUrl(sNum, reciterIdRef.current, true);
      if (audio.src !== fallbackUrl) {
        console.warn(`Primary CDN failed for Surah ${sNum}, trying fallback: ${fallbackUrl}`);
        audio.src = fallbackUrl;
        audio.load();
        if (isPlayingRef.current) {
          audio.play().catch(console.warn);
        }
        return;
      }

      setIsLoading(false);
      setError("Failed to load audio stream from CDN. Please check your internet connection.");
    };

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onwaiting = null;
      audio.oncanplay = null;
      audio.onplaying = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, []);

  // ─── Sync Volume with Audio Element ───────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ─── Audio Controls ───────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (audio.src !== currentAudioUrl) {
      audio.src = currentAudioUrl;
      audio.load();
    }

    setIsLoading(true);
    setError(null);
    audio.play().catch((err) => {
      if (err.name !== "AbortError") {
        setError(`Playback error: ${err.message}`);
        setIsLoading(false);
      }
    });
  }, [isPlaying, currentAudioUrl]);

  const handleJuzChange = useCallback((newJuz: number) => {
    if (newJuz < 1 || newJuz > 30) return;
    const audio = audioRef.current;
    const wasPlaying = isPlayingRef.current;

    if (audio) {
      audio.pause();
    }

    setJuz(newJuz);
    juzRef.current = newJuz;
    setCurrentSurahIndex(0);
    currentSurahIndexRef.current = 0;
    setCurrentTime(0);
    setCurrentDuration(0);
    setError(null);

    const firstSurah = (JUZ_SURAHS_MAP[newJuz] || [1])[0];
    activeSurahNumberRef.current = firstSurah;
    const newUrl = getSurahAudioUrl(firstSurah, reciterIdRef.current);
    if (audio) {
      audio.src = newUrl;
      audio.load();
      if (wasPlaying) {
        setIsLoading(true);
        audio.play().catch(console.warn);
      } else {
        setIsPlaying(false);
      }
    }
  }, []);

  const handleNextJuz = useCallback(() => {
    if (juz < 30) {
      handleJuzChange(juz + 1);
    }
  }, [juz, handleJuzChange]);

  const handlePrevJuz = useCallback(() => {
    if (juz > 1) {
      handleJuzChange(juz - 1);
    }
  }, [juz, handleJuzChange]);

  const handleReciterChange = useCallback((newReciterId: number) => {
    const audio = audioRef.current;
    const wasPlaying = isPlayingRef.current;
    const currentTimePos = audio?.currentTime || 0;

    setReciterId(newReciterId);
    reciterIdRef.current = newReciterId;
    setError(null);

    const sNum = activeSurahNumberRef.current;
    const newUrl = getSurahAudioUrl(sNum, newReciterId);
    if (audio) {
      audio.src = newUrl;
      audio.load();
      audio.currentTime = currentTimePos;
      if (wasPlaying) {
        setIsLoading(true);
        audio.play().catch(console.warn);
      }
    }
  }, []);

  const retry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    setIsLoading(true);
    audio.src = currentAudioUrl;
    audio.load();
    audio.play().catch((err) => {
      if (err.name !== "AbortError") {
        setError(`Playback error: ${err.message}`);
        setIsLoading(false);
      }
    });
  }, [currentAudioUrl]);

  const setVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(val, 1));
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // ─── MediaSession for Lock-Screen / Headset Controls ──────────────────────
  useMediaSession({
    metadata: {
      title: `Juz ${juz} • ${activeSurahMeta.englishName}`,
      artist: activeReciter.name,
      album: "Holy Quran",
    },
    playbackState: isPlaying ? "playing" : "paused",
    positionState: totalJuzDuration
      ? {
          duration: totalJuzDuration,
          position: Math.min(totalJuzElapsedTime, totalJuzDuration),
          playbackRate: 1,
        }
      : null,
    handlers: {
      play: togglePlay,
      pause: togglePlay,
      previoustrack: handlePrevJuz,
      nexttrack: handleNextJuz,
    },
  });

  return {
    juz,
    reciterId,
    currentSurahIndex,
    isPlaying,
    isLoading,
    currentTime,
    currentDuration,
    totalJuzDuration,
    totalJuzElapsedTime,
    activeSurahNumber,
    activeSurahMeta,
    activeReciter,
    currentAudioUrl,
    error,
    volume,
    isMuted,
    togglePlay,
    handleJuzChange,
    handleNextJuz,
    handlePrevJuz,
    handleReciterChange,
    setVolume,
    toggleMute,
    retry,
  };
}
