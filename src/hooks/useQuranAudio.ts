import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Ayah } from "@/store/api/quranApi";
import { useMediaSession } from "@/hooks/useMediaSession";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseQuranAudioOptions {
  ayahs: Ayah[];
  juz: number;
  reciterId: string;
  reciterName: string;
  isFetching: boolean;
  onNextJuz?: () => void;
}

/**
 * Two playback strategies for lock-screen continuous audio:
 *
 * "native-hls" — Safari (iOS/macOS)
 *   Safari's built-in C++ media engine handles the M3U8 segment queue.
 *   No JavaScript needed for track transitions → survives screen lock.
 *
 * "direct" — Chrome, Firefox, Android
 *   Plays individual MP3 files. The NEXT track is pre-downloaded as a Blob
 *   and stored in memory. When `onended` fires, the next track loads from
 *   a `blob:` URL (zero network needed), so transitions work even when
 *   the screen is locked and Android throttles network requests.
 *   MediaSession keeps the audio session alive so `onended` fires reliably.
 */

// ─── Blob Pre-Cache ───────────────────────────────────────────────────────────

interface BlobCacheEntry {
  url: string;     // original CDN URL
  blobUrl: string; // blob: URL (in-memory)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuranAudio({
  ayahs,
  juz,
  reciterId,
  reciterName,
  isFetching,
  onNextJuz,
}: UseQuranAudioOptions) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<"native-hls" | "direct">("direct");
  const blobCacheRef = useRef<Map<string, string>>(new Map()); // cdnUrl → blobUrl
  const prefetchControllerRef = useRef<AbortController | null>(null);

  // Synchronous refs for lock-screen event handlers
  const isPlayingRef = useRef(isPlaying);
  const currentIndexRef = useRef(currentAyahIndex);
  const ayahsRef = useRef(ayahs);
  const juzRef = useRef(juz);
  const onNextJuzRef = useRef(onNextJuz);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentIndexRef.current = currentAyahIndex; }, [currentAyahIndex]);
  useEffect(() => { ayahsRef.current = ayahs; }, [ayahs]);
  useEffect(() => { juzRef.current = juz; }, [juz]);
  useEffect(() => { onNextJuzRef.current = onNextJuz; }, [onNextJuz]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const currentAyah = useMemo(
    () => ayahs[currentAyahIndex] || null,
    [ayahs, currentAyahIndex]
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Get the primary audio URL for an Ayah */
  const getAudioUrl = useCallback((ayah: Ayah | null | undefined): string | null => {
    if (!ayah) return null;
    if (ayah.audio && typeof ayah.audio === "string" && ayah.audio.trim()) {
      return ayah.audio.trim();
    }
    if (Array.isArray(ayah.audioSecondary) && ayah.audioSecondary[0]?.trim()) {
      return ayah.audioSecondary[0].trim();
    }
    return null;
  }, []);

  /** Get a playable URL: blob URL if cached, otherwise CDN URL */
  const getPlayableUrl = useCallback((cdnUrl: string): string => {
    return blobCacheRef.current.get(cdnUrl) || cdnUrl;
  }, []);

  /** Revoke all blob URLs to free memory */
  const clearBlobCache = useCallback(() => {
    blobCacheRef.current.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    blobCacheRef.current.clear();
  }, []);

  /** Pre-fetch upcoming tracks as Blobs into memory */
  const prefetchUpcoming = useCallback((fromIndex: number) => {
    // Cancel any in-flight prefetch
    if (prefetchControllerRef.current) {
      prefetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    prefetchControllerRef.current = controller;

    // Pre-fetch next 3 tracks
    const LOOKAHEAD = 3;
    const currentAyahs = ayahsRef.current;

    for (let i = 1; i <= LOOKAHEAD; i++) {
      const idx = fromIndex + i;
      if (idx >= currentAyahs.length) break;

      const ayah = currentAyahs[idx];
      const cdnUrl = ayah?.audio?.trim() ||
        (Array.isArray(ayah?.audioSecondary) ? ayah.audioSecondary?.[0]?.trim() : null);

      if (!cdnUrl || blobCacheRef.current.has(cdnUrl)) continue;

      // Download via proxy (fetch() requires CORS, but CDN doesn't provide it)
      // The <audio> element is CORS-exempt, but fetch() is not.
      const proxyUrl = `/api/hls/segment?url=${encodeURIComponent(cdnUrl)}`;
      fetch(proxyUrl, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (!controller.signal.aborted) {
            const blobUrl = URL.createObjectURL(blob);
            blobCacheRef.current.set(cdnUrl, blobUrl);
          }
        })
        .catch(() => {
          // Network error or aborted — silently ignore
        });
    }
  }, []);

  // ── WakeLock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let wakeLock: any = null;
    const request = async () => {
      if (
        isPlaying &&
        typeof window !== "undefined" &&
        "wakeLock" in navigator &&
        typeof (navigator as any).wakeLock?.request === "function"
      ) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        } catch { /* not available */ }
      }
    };
    request();
    return () => {
      if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    };
  }, [isPlaying]);

  // ── Audio Element Setup (once) ────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (!audioRef.current) return;
      setCurrentTime(audioRef.current.currentTime || 0);
    };

    audio.onloadedmetadata = () => {
      if (audioRef.current) {
        const d = audioRef.current.duration;
        if (d && !isNaN(d) && isFinite(d)) setDuration(d);
        setIsAudioLoading(false);
        setAudioError(null);
      }
    };

    audio.onwaiting = () => {
      if (isPlayingRef.current) setIsAudioLoading(true);
    };
    audio.oncanplay = () => setIsAudioLoading(false);
    audio.onplaying = () => setIsAudioLoading(false);

    // ── onended: THE CRITICAL LOCK-SCREEN HANDLER ───────────────────────
    // This fires even on a locked Android screen because MediaSession
    // keeps the audio session alive. The key is that the NEXT track
    // loads from a blob: URL (in-memory), so NO network request is needed.
    audio.onended = () => {
      if (!isPlayingRef.current) return;

      if (modeRef.current === "direct") {
        const nextIdx = currentIndexRef.current + 1;
        const total = ayahsRef.current.length;

        if (nextIdx < total) {
          const nextAyah = ayahsRef.current[nextIdx];
          const cdnUrl = nextAyah?.audio?.trim() ||
            (Array.isArray(nextAyah?.audioSecondary) ? nextAyah.audioSecondary?.[0]?.trim() : null);

          if (cdnUrl) {
            // Use blob: URL if pre-cached, otherwise fall back to CDN URL
            const playUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;

            // Synchronous: src → load → play on the SAME call stack tick
            // This keeps the OS audio pipeline active on locked screen
            audio.src = playUrl;
            audio.load();
            audio.play().catch((err) => {
              if (err.name !== "AbortError") {
                console.error("Lock-screen transition error:", err);
              }
            });

            currentIndexRef.current = nextIdx;
            setCurrentAyahIndex(nextIdx);
            setCurrentTime(0);
            setDuration(0);
            setAudioError(null);

            // Pre-fetch the NEXT batch of tracks
            prefetchUpcoming(nextIdx);
          }
        } else if (juzRef.current < 30 && onNextJuzRef.current) {
          // Advance to next Juz
          currentIndexRef.current = 0;
          setCurrentAyahIndex(0);
          setCurrentTime(0);
          setDuration(0);
          setAudioError(null);
          onNextJuzRef.current();
        } else {
          setIsPlaying(false);
        }
      } else {
        // native-hls: entire playlist finished
        if (juzRef.current < 30 && onNextJuzRef.current) {
          currentIndexRef.current = 0;
          setCurrentAyahIndex(0);
          onNextJuzRef.current();
        } else {
          setIsPlaying(false);
        }
      }
    };

    audio.onerror = () => {
      if (modeRef.current !== "direct") return;
      setIsAudioLoading(false);

      // Try CDN URL directly if blob URL failed
      const activeAyah = ayahsRef.current[currentIndexRef.current];
      const cdnUrl = activeAyah?.audio?.trim();
      if (cdnUrl && audio.src.startsWith("blob:")) {
        // Blob was corrupt, try direct CDN URL
        audio.src = cdnUrl;
        audio.load();
        if (isPlayingRef.current) audio.play().catch(() => {});
        return;
      }

      // Skip to next ayah after delay
      setAudioError(`Audio unavailable for Ayah ${currentIndexRef.current + 1}`);
      if (isPlayingRef.current && currentIndexRef.current < ayahsRef.current.length - 1) {
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          const nextIdx = currentIndexRef.current + 1;
          const nextAyah = ayahsRef.current[nextIdx];
          const nextUrl = nextAyah?.audio?.trim();
          if (nextUrl) {
            const playUrl = blobCacheRef.current.get(nextUrl) || nextUrl;
            audio.src = playUrl;
            audio.load();
            audio.play().catch(() => {});
            currentIndexRef.current = nextIdx;
            setCurrentAyahIndex(nextIdx);
            setCurrentTime(0);
            setDuration(0);
            setAudioError(null);
          }
        }, 1500);
      }
    };

    return () => {
      audio.pause();
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onwaiting = null;
      audio.oncanplay = null;
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, [prefetchUpcoming]);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── Load source when juz/reciter/ayahs change ────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isFetching || ayahs.length === 0) return;

    // Reset
    setAudioError(null);
    setCurrentTime(0);
    setDuration(0);
    currentIndexRef.current = 0;
    setCurrentAyahIndex(0);

    // Clear old blob cache (different juz/reciter = different tracks)
    clearBlobCache();

    // ── Safari/iOS: Native HLS ──────────────────────────────────────────
    const isSafari =
      typeof navigator !== "undefined" &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const supportsNativeHLS =
      isSafari &&
      (audio.canPlayType("application/vnd.apple.mpegurl") !== "" ||
       audio.canPlayType("application/x-mpegurl") !== "");

    if (supportsNativeHLS) {
      modeRef.current = "native-hls";
      const playlistUrl = `/api/hls/playlist?juz=${juz}&reciter=${encodeURIComponent(reciterId)}`;
      audio.src = playlistUrl;
      audio.load();
      // Don't auto-play; user must click play
      return;
    }

    // ── Chrome/Android/Firefox: Direct MP3 with Blob Pre-Caching ────────
    modeRef.current = "direct";

    const firstUrl = getAudioUrl(ayahs[0]);
    if (firstUrl) {
      audio.src = firstUrl;
      audio.load();
      // Start pre-fetching upcoming tracks immediately
      prefetchUpcoming(0);
    }
  }, [juz, reciterId, isFetching, ayahs, getAudioUrl, prefetchUpcoming, clearBlobCache]);

  // ── Re-prefetch when current track changes ────────────────────────────────
  useEffect(() => {
    if (modeRef.current === "direct" && isPlaying && ayahs.length > 0) {
      prefetchUpcoming(currentAyahIndex);
    }
  }, [currentAyahIndex, isPlaying, ayahs, prefetchUpcoming]);

  // ── Cleanup blob cache on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearBlobCache();
      if (prefetchControllerRef.current) {
        prefetchControllerRef.current.abort();
      }
    };
  }, [clearBlobCache]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingRef.current) {
      // Pause
      setIsPlaying(false);
      setIsAudioLoading(false);
      audio.pause();
    } else {
      // Play — ensure source is set
      if (!audio.src || audio.src === window.location.href) {
        const ayah = ayahsRef.current[currentIndexRef.current];
        const cdnUrl = getAudioUrl(ayah);
        if (cdnUrl) {
          audio.src = getPlayableUrl(cdnUrl);
          audio.load();
        }
      }

      setIsPlaying(true);
      setIsAudioLoading(true);

      // Synchronous audio.play() inside user gesture context
      const p = audio.play();
      if (p) {
        p.then(() => {
          setIsAudioLoading(false);
          setAudioError(null);
        }).catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Play error:", err);
          }
          setIsAudioLoading(false);
        });
      }
    }
  }, [getAudioUrl, getPlayableUrl]);

  const selectAyah = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (modeRef.current === "native-hls") {
        // Can't seek to specific ayah in native HLS easily
        // Just update the index for display
        currentIndexRef.current = index;
        setCurrentAyahIndex(index);
        if (!isPlayingRef.current) setIsPlaying(true);
        return;
      }

      const ayah = ayahsRef.current[index];
      const cdnUrl = getAudioUrl(ayah);
      if (!cdnUrl) {
        setAudioError(`No audio for Ayah ${index + 1}`);
        return;
      }

      const playUrl = getPlayableUrl(cdnUrl);

      currentIndexRef.current = index;
      setCurrentAyahIndex(index);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);

      audio.src = playUrl;
      audio.load();

      setIsPlaying(true);
      setIsAudioLoading(true);

      const p = audio.play();
      if (p) {
        p.then(() => {
          setIsAudioLoading(false);
          setAudioError(null);
        }).catch((err) => {
          if (err.name !== "AbortError") console.error("Select ayah error:", err);
          setIsAudioLoading(false);
        });
      }

      // Pre-fetch from new position
      prefetchUpcoming(index);
    },
    [getAudioUrl, getPlayableUrl, prefetchUpcoming]
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (audio && duration > 0) {
        const clamped = Math.max(0, Math.min(seconds, duration));
        audio.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [duration]
  );

  const nextAyah = useCallback(() => {
    if (currentAyahIndex < ayahs.length - 1) {
      selectAyah(currentAyahIndex + 1);
    } else if (juz < 30 && onNextJuz) {
      onNextJuz();
    }
  }, [currentAyahIndex, ayahs.length, juz, onNextJuz, selectAyah]);

  const prevAyah = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (currentAyahIndex > 0) {
      selectAyah(currentAyahIndex - 1);
    }
  }, [currentAyahIndex, selectAyah]);

  const skipForward = useCallback(() => {
    if (audioRef.current) seekTo(audioRef.current.currentTime + 10);
  }, [seekTo]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) seekTo(audioRef.current.currentTime - 10);
  }, [seekTo]);

  const toggleMute = useCallback(() => setIsMuted((p) => !p), []);

  const resetIndex = useCallback(() => {
    setCurrentAyahIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  }, []);

  // ── MediaSession (lock-screen & bluetooth controls) ───────────────────────
  useMediaSession({
    metadata: {
      title: currentAyah
        ? `Ayah ${currentAyah.numberInSurah} • ${currentAyah.surah?.englishName || "Surah"}`
        : `Juz ${juz}`,
      artist: reciterName,
      album: `Juz ${juz}`,
    },
    playbackState: isPlaying ? "playing" : "paused",
    positionState: duration
      ? { duration, position: Math.min(currentTime, duration), playbackRate: 1 }
      : null,
    handlers: {
      play: () => setIsPlaying(true),
      pause: () => { setIsPlaying(false); audioRef.current?.pause(); },
      previoustrack: prevAyah,
      nexttrack: nextAyah,
      seekbackward: skipBackward,
      seekforward: skipForward,
    },
  });

  // ── Return ────────────────────────────────────────────────────────────────
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
