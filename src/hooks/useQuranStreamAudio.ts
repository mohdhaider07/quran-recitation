import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  JUZ_START_AYAH,
  RECITERS_LIST,
  SURAHS_META,
  getAyahLocation,
  type AyahTiming,
  type JuzMetadataResponse,
  type Reciter,
  type SurahMeta,
} from "@/lib/quranStream";

export interface UseQuranStreamAudioOptions {
  initialJuz?: number;
  initialReciterId?: number;
}

export type QuranStreamAudio = ReturnType<typeof useQuranStreamAudio>;

// ─── Metadata Fetching ────────────────────────────────────────────────────────

// Client-side cache to avoid re-fetching metadata across Juz & Reciter switches
const metadataCache = new Map<string, JuzMetadataResponse>();
const metadataRequests = new Map<string, Promise<JuzMetadataResponse>>();

function fetchJuzMetadata(juz: number, reciterId: number): Promise<JuzMetadataResponse> {
  const key = `${juz}_${reciterId}`;
  const cached = metadataCache.get(key);
  if (cached) return Promise.resolve(cached);

  let request = metadataRequests.get(key);
  if (!request) {
    request = fetch(`/api/juz-metadata?juz=${juz}&reciter=${reciterId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const meta = (await res.json()) as JuzMetadataResponse;
        metadataCache.set(key, meta);
        return meta;
      })
      .finally(() => metadataRequests.delete(key));
    metadataRequests.set(key, request);
  }
  return request;
}

/** Index of the last entry whose `startSec` is at or before `time` (entries sorted by time). */
function findIndexAtTime(entries: { startSec: number }[], time: number): number {
  let low = 0;
  let high = entries.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (entries[mid].startSec <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

// ─── Persisted Selection ──────────────────────────────────────────────────────

const STORAGE_KEY = "peaceful-quran:player";

interface SavedPlayerState {
  juz: number;
  reciterId: number;
  volume: number;
}

function readSavedState(): Partial<SavedPlayerState> {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}"
    ) as Partial<SavedPlayerState>;
    return {
      juz:
        Number.isInteger(saved.juz) && saved.juz! >= 1 && saved.juz! <= 30 ? saved.juz : undefined,
      reciterId: RECITERS_LIST.some((r) => r.id === saved.reciterId) ? saved.reciterId : undefined,
      volume:
        typeof saved.volume === "number" && saved.volume >= 0 && saved.volume <= 1
          ? saved.volume
          : undefined,
    };
  } catch {
    return {};
  }
}

function savePlayerState(patch: Partial<SavedPlayerState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSavedState(), ...patch }));
  } catch {
    // Storage unavailable (private mode or a WebView without DOM storage).
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuranStreamAudio(options: UseQuranStreamAudioOptions = {}) {
  const { initialJuz = 1, initialReciterId = 1 } = options;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [juz, setJuz] = useState<number>(initialJuz);
  const [reciterId, setReciterId] = useState<number>(initialReciterId);
  const [metadata, setMetadata] = useState<JuzMetadataResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // ─── Refs (read by audio event handlers, which outlive any single render) ────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /**
   * Whether the user wants to hear the recitation. Unlike `isPlaying` this survives the
   * `pause` event browsers fire right before `ended`, so playback continues into the next
   * segment or Juz.
   */
  const wantsPlaybackRef = useRef<boolean>(false);
  const juzRef = useRef<number>(initialJuz);
  const reciterIdRef = useRef<number>(initialReciterId);
  const metadataRef = useRef<JuzMetadataResponse | null>(null);
  const segmentIndexRef = useRef<number>(0);
  /** Juz time (seconds) at which the element's current source begins. */
  const sourceOffsetRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  /** Incremented per load so late metadata responses for an old selection are ignored. */
  const loadIdRef = useRef<number>(0);
  const autoRetriedRef = useRef<boolean>(false);

  // ─── Playback Primitives ────────────────────────────────────────────────────

  /** Points the audio element at one segment of the Juz, optionally starting at an ayah. */
  const loadSegment = useCallback(
    (meta: JuzMetadataResponse, index: number, fromAyah?: AyahTiming) => {
      const audio = audioRef.current;
      const segment = meta.segments[index];
      if (!audio || !segment) return;
      segmentIndexRef.current = index;
      sourceOffsetRef.current = fromAyah ? fromAyah.startSec : segment.startSec;
      audio.src = fromAyah ? `${segment.url}&from=${fromAyah.ayahNumber}` : segment.url;
    },
    []
  );

  /** Loads the segment containing `ayah`, starting the stream at that ayah. */
  const loadFromAyah = useCallback(
    (meta: JuzMetadataResponse, ayah: AyahTiming) => {
      const index = findIndexAtTime(meta.segments, ayah.startSec);
      const startsSegment = ayah.startSec <= meta.segments[index].startSec;
      loadSegment(meta, index, startsSegment ? undefined : ayah);
      currentTimeRef.current = ayah.startSec;
      setCurrentTime(ayah.startSec);
    },
    [loadSegment]
  );

  /** Starts the loaded source if the listener wants audio. */
  const startAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !wantsPlaybackRef.current || !audio.getAttribute("src")) return;
    setIsLoading(true);
    audio.preload = "auto";
    audio.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return; // Source changed.
      wantsPlaybackRef.current = false;
      setIsLoading(false);
      // NotAllowedError: autoplay was blocked; the play button simply stays available.
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
        setError("Unable to start playback. Please check your connection.");
      }
    });
  }, []);

  const pause = useCallback(() => {
    wantsPlaybackRef.current = false;
    setIsLoading(false);
    audioRef.current?.pause();
  }, []);

  /**
   * Loads a Juz for a reciter and keeps playing if the user was listening.
   * `startAyahNumber` continues from that ayah (used when switching reciters mid-Juz).
   */
  const loadJuz = useCallback(
    (targetJuz: number, targetReciterId: number, startAyahNumber?: number) => {
      const loadId = ++loadIdRef.current;
      juzRef.current = targetJuz;
      reciterIdRef.current = targetReciterId;
      setJuz(targetJuz);
      setReciterId(targetReciterId);
      setError(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      savePlayerState({ juz: targetJuz, reciterId: targetReciterId });

      const apply = (meta: JuzMetadataResponse) => {
        if (loadId !== loadIdRef.current) return;
        metadataRef.current = meta;
        setMetadata(meta);
        const startAyah = meta.ayahs.find((a) => a.ayahNumber === startAyahNumber);
        if (startAyah) {
          loadFromAyah(meta, startAyah);
        } else {
          loadSegment(meta, 0);
        }
        startAudio();
        // Warm the next Juz so continuous playback switches without a network round trip.
        if (targetJuz < 30) fetchJuzMetadata(targetJuz + 1, targetReciterId).catch(() => {});
      };

      const cached = metadataCache.get(`${targetJuz}_${targetReciterId}`);
      if (cached) {
        apply(cached);
        return;
      }

      // Silence the previous selection while the new timeline loads.
      const audio = audioRef.current;
      if (audio?.getAttribute("src")) {
        audio.removeAttribute("src");
        audio.load();
      }
      metadataRef.current = null;
      setMetadata(null);
      if (wantsPlaybackRef.current) setIsLoading(true);

      fetchJuzMetadata(targetJuz, targetReciterId).then(apply, (err: unknown) => {
        if (loadId !== loadIdRef.current) return;
        console.error("[useQuranStreamAudio] Metadata load error:", err);
        wantsPlaybackRef.current = false;
        setIsLoading(false);
        setError("Failed to load this Juz. Please check your connection and retry.");
      });
    },
    [loadFromAyah, loadSegment, startAudio]
  );

  const play = useCallback(() => {
    if (!audioRef.current) return;
    wantsPlaybackRef.current = true;
    setError(null);
    setIsLoading(true);

    const meta = metadataRef.current;
    if (!meta?.ayahs.length) {
      // The timeline is loading (playback starts when it arrives) or failed (load it again).
      loadJuz(juzRef.current, reciterIdRef.current);
      return;
    }
    if (audioRef.current.error || !audioRef.current.getAttribute("src")) {
      // A failed stream can't resume in place; reopen it at the current ayah.
      loadFromAyah(meta, meta.ayahs[findIndexAtTime(meta.ayahs, currentTimeRef.current)]);
    }
    startAudio();
  }, [loadFromAyah, loadJuz, startAudio]);

  /** Reopens the stream at the ayah that was playing (or reloads the Juz timeline) and plays. */
  const retry = useCallback(() => {
    const meta = metadataRef.current;
    if (meta?.ayahs.length) {
      loadFromAyah(meta, meta.ayahs[findIndexAtTime(meta.ayahs, currentTimeRef.current)]);
    }
    play();
  }, [loadFromAyah, play]);

  // ─── Persistent HTMLAudioElement Setup ────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      const time = sourceOffsetRef.current + (audio.currentTime || 0);
      currentTimeRef.current = time;
      setCurrentTime(time);
    };

    audio.onwaiting = () => {
      if (wantsPlaybackRef.current) setIsLoading(true);
    };
    audio.onplaying = () => {
      autoRetriedRef.current = false;
      setIsLoading(false);
      setIsPlaying(true);
    };
    audio.onpause = () => setIsPlaying(false);

    // Continue with the next segment of this Juz, then the next Juz.
    audio.onended = () => {
      const meta = metadataRef.current;
      if (!meta || !wantsPlaybackRef.current) return;
      const nextSegment = segmentIndexRef.current + 1;
      if (nextSegment < meta.segments.length) {
        loadSegment(meta, nextSegment);
        startAudio();
      } else if (juzRef.current < 30) {
        loadJuz(juzRef.current + 1, reciterIdRef.current);
      } else {
        wantsPlaybackRef.current = false;
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    audio.onerror = () => {
      if (!audio.getAttribute("src")) return; // Source was cleared on purpose.
      console.warn("[useQuranStreamAudio] Media error:", audio.error?.code, audio.error?.message);
      if (wantsPlaybackRef.current && !autoRetriedRef.current) {
        // One silent retry covers brief network drops (e.g. switching Wi-Fi to mobile data).
        autoRetriedRef.current = true;
        setIsLoading(true);
        setTimeout(() => wantsPlaybackRef.current && retry(), 1500);
        return;
      }
      wantsPlaybackRef.current = false;
      setIsLoading(false);
      setIsPlaying(false);
      setError(`Audio stream connection error for Juz ${juzRef.current}.`);
    };

    // Restore the last session's selection. localStorage is only readable after hydration,
    // so this has to happen in an effect rather than in the initial state.
    const saved = readSavedState();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved.volume !== undefined) setVolumeState(saved.volume);
    loadJuz(saved.juz ?? initialJuz, saved.reciterId ?? initialReciterId);

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.ontimeupdate = null;
      audio.onwaiting = null;
      audio.onplaying = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, [initialJuz, initialReciterId, loadJuz, loadSegment, startAudio, retry]);

  // ─── Volume Sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ─── Derived Display State ────────────────────────────────────────────────
  const activeReciter: Reciter = useMemo(() => {
    return RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];
  }, [reciterId]);

  const activeAyah: AyahTiming | null = useMemo(() => {
    if (!metadata?.ayahs.length) return null;
    return metadata.ayahs[findIndexAtTime(metadata.ayahs, currentTime)];
  }, [metadata, currentTime]);

  const activeSurahMeta: SurahMeta = useMemo(() => {
    const surah = activeAyah?.surahNumber ?? getAyahLocation(JUZ_START_AYAH[juz - 1]).surah;
    return SURAHS_META[surah];
  }, [activeAyah, juz]);

  // ─── Player Controls ──────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (wantsPlaybackRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const handleJuzChange = useCallback(
    (newJuz: number) => {
      const clamped = Math.max(1, Math.min(30, newJuz));
      if (clamped !== juzRef.current) loadJuz(clamped, reciterIdRef.current);
    },
    [loadJuz]
  );

  const handleNextJuz = useCallback(() => {
    if (juzRef.current < 30) loadJuz(juzRef.current + 1, reciterIdRef.current);
  }, [loadJuz]);

  const handlePrevJuz = useCallback(() => {
    if (juzRef.current > 1) loadJuz(juzRef.current - 1, reciterIdRef.current);
  }, [loadJuz]);

  const handleReciterChange = useCallback(
    (newReciterId: number) => {
      if (newReciterId === reciterIdRef.current) return;
      // Continue from the current ayah when the listener is already part-way through the Juz.
      const meta = metadataRef.current;
      const resumeAyah =
        meta?.ayahs.length && currentTimeRef.current > 0
          ? meta.ayahs[findIndexAtTime(meta.ayahs, currentTimeRef.current)].ayahNumber
          : undefined;
      loadJuz(juzRef.current, newReciterId, resumeAyah);
    },
    [loadJuz]
  );

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    if (clamped > 0) setIsMuted(false);
    savePlayerState({ volume: clamped });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    juz,
    reciterId,
    isPlaying,
    isLoading,
    totalJuzDuration: metadata?.totalDuration ?? 0,
    totalJuzElapsedTime: currentTime,
    activeSurahMeta,
    activeReciter,
    activeAyah,
    error,
    volume,
    isMuted,
    play,
    pause,
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
