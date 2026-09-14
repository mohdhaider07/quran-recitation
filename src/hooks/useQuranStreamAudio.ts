import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RECITERS_LIST, SURAHS_META, Reciter, SurahMeta } from "@/lib/quranStream";
import { useMediaSession } from "@/hooks/useMediaSession";

export interface UseQuranStreamAudioOptions {
  initialJuz?: number;
  initialReciterId?: number;
}

export interface AyahTiming {
  ayahNumber: number;
  surahNumber: number;
  surahName: string;
  surahArabicName: string;
  numberInSurah: number;
  startSec: number;
  endSec: number;
  duration: number;
}

export interface JuzMetadataResponse {
  juz: number;
  reciter: string;
  totalDuration: number;
  totalSize: number;
  totalAyahs: number;
  ayahs: AyahTiming[];
}

// Client-side cache to avoid re-fetching metadata across Juz & Reciter switches
const metadataCache = new Map<string, JuzMetadataResponse>();

export function useQuranStreamAudio(options: UseQuranStreamAudioOptions = {}) {
  const { initialJuz = 1, initialReciterId = 1 } = options;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [juz, setJuz] = useState<number>(initialJuz);
  const [reciterId, setReciterId] = useState<number>(initialReciterId);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalJuzDuration, setTotalJuzDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeAyah, setActiveAyah] = useState<AyahTiming | null>(null);

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const juzRef = useRef<number>(juz);
  const reciterIdRef = useRef<number>(reciterId);
  const metadataRef = useRef<JuzMetadataResponse | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    juzRef.current = juz;
  }, [juz]);
  useEffect(() => {
    reciterIdRef.current = reciterId;
  }, [reciterId]);

  // ─── Active Reciter & Surah Metadata ──────────────────────────────────────
  const activeReciter: Reciter = useMemo(() => {
    return RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];
  }, [reciterId]);

  const activeSurahMeta: SurahMeta = useMemo(() => {
    if (activeAyah) {
      return (
        SURAHS_META[activeAyah.surahNumber] || {
          number: activeAyah.surahNumber,
          name: activeAyah.surahArabicName,
          englishName: activeAyah.surahName,
        }
      );
    }
    return SURAHS_META[1];
  }, [activeAyah]);

  // ─── Persistent HTMLAudioElement Setup ────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      const cur = audio.currentTime || 0;
      setCurrentTime(cur);

      // Locate the active Ayah from pre-computed timings
      const meta = metadataRef.current;
      if (meta && meta.ayahs && meta.ayahs.length > 0) {
        // Fast binary search or range check for active Ayah
        const found = meta.ayahs.find((a) => cur >= a.startSec && cur < a.endSec);
        if (found) {
          setActiveAyah(found);
        } else if (cur >= meta.totalDuration && meta.ayahs.length > 0) {
          setActiveAyah(meta.ayahs[meta.ayahs.length - 1]);
        }
      }
    };

    audio.onwaiting = () => setIsLoading(true);
    audio.oncanplay = () => setIsLoading(false);
    audio.onplaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    audio.onpause = () => setIsPlaying(false);

    // Auto-advance to the NEXT Juz when the continuous stream completes
    audio.onended = () => {
      const curJuz = juzRef.current;
      if (curJuz < 30) {
        const nextJuz = curJuz + 1;
        juzRef.current = nextJuz;
        setJuz(nextJuz);
        setCurrentTime(0);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setError(`Audio stream connection error for Juz ${juzRef.current}.`);
    };

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.ontimeupdate = null;
      audio.onwaiting = null;
      audio.oncanplay = null;
      audio.onplaying = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, []);

  // ─── Volume Sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ─── Fetch Metadata & Connect Stream on Juz/Reciter Change ────────────────
  useEffect(() => {
    let isCancelled = false;
    const audio = audioRef.current;
    if (!audio) return;

    const streamUrl = `/api/juz-stream?juz=${juz}&reciter=${reciterId}`;

    async function loadStream() {
      setIsLoading(true);
      setError(null);
      setCurrentTime(0);
      try {
        const cacheKey = `${juz}_${reciterId}`;
        let meta = metadataCache.get(cacheKey);
        if (!meta) {
          const res = await fetch(`/api/juz-metadata?juz=${juz}&reciter=${reciterId}`);
          if (res.ok) {
            meta = (await res.json()) as JuzMetadataResponse;
            metadataCache.set(cacheKey, meta);
          }
        }

        if (isCancelled) return;

        if (meta) {
          metadataRef.current = meta;
          setTotalJuzDuration(meta.totalDuration);
          if (meta.ayahs && meta.ayahs.length > 0) {
            setActiveAyah(meta.ayahs[0]);
          }
        }

        const currentAudio = audioRef.current;
        if (!currentAudio || isCancelled) return;

        // Connect single continuous stream to HTMLAudioElement
        currentAudio.src = streamUrl;
        currentAudio.load();

        if (isPlayingRef.current) {
          const playPromise = currentAudio.play();
          if (playPromise) {
            playPromise.catch((err) => {
              if (err.name !== "AbortError") {
                console.warn("[useQuranStreamAudio] Play error:", err);
              }
            });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[useQuranStreamAudio] Stream load error:", err);
          setError("Failed to load audio stream. Please retry.");
          setIsLoading(false);
        }
      }
    }

    loadStream();

    return () => {
      isCancelled = true;
    };
  }, [juz, reciterId]);

  // ─── Player Controls ──────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src || audio.src === window.location.href) {
        audio.src = `/api/juz-stream?juz=${juzRef.current}&reciter=${reciterIdRef.current}`;
        audio.load();
      }
      setIsLoading(true);
      const p = audio.play();
      if (p) {
        p.then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        }).catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Audio play failed:", err);
            setError("Unable to play audio. Please check network connection.");
          }
          setIsLoading(false);
        });
      }
    }
  }, [isPlaying]);

  const handleJuzChange = useCallback((newJuz: number) => {
    const clamped = Math.max(1, Math.min(30, newJuz));
    setJuz(clamped);
  }, []);

  const handleNextJuz = useCallback(() => {
    if (juz < 30) {
      setJuz((prev) => prev + 1);
    }
  }, [juz]);

  const handlePrevJuz = useCallback(() => {
    if (juz > 1) {
      setJuz((prev) => prev - 1);
    }
  }, [juz]);

  const handleReciterChange = useCallback((newReciterId: number) => {
    setReciterId(newReciterId);
  }, []);

  const setVolume = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
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

  const seek = useCallback(
    (targetSeconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const clamped = Math.max(0, Math.min(totalJuzDuration, targetSeconds));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [totalJuzDuration]
  );

  const retry = useCallback(() => {
    setError(null);
    const audio = audioRef.current;
    if (audio) {
      audio.src = `/api/juz-stream?juz=${juz}&reciter=${reciterId}`;
      audio.load();
      audio.play().catch(() => {});
    }
  }, [juz, reciterId]);

  // ─── W3C MediaSession API (Lock-Screen Controls & Metadata) ────────────────
  useMediaSession({
    metadata: {
      title: `Juz ${juz}`,
      artist: `${activeReciter.name} • ${activeSurahMeta.englishName}`,
      album: "Holy Quran",
    },
    playbackState: isPlaying ? "playing" : "paused",
    positionState: totalJuzDuration
      ? {
          duration: totalJuzDuration,
          position: Math.min(currentTime, totalJuzDuration),
          playbackRate: 1,
        }
      : null,
    handlers: {
      play: togglePlay,
      pause: togglePlay,
      previoustrack: juz > 1 ? handlePrevJuz : null,
      nexttrack: juz < 30 ? handleNextJuz : null,
      seekbackward: () => seek(Math.max(0, currentTime - 10)),
      seekforward: () => seek(Math.min(totalJuzDuration, currentTime + 10)),
    },
  });

  return {
    juz,
    reciterId,
    isPlaying,
    isLoading,
    totalJuzDuration,
    totalJuzElapsedTime: currentTime,
    activeSurahMeta,
    activeReciter,
    activeAyah,
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
    seek,
  };
}
