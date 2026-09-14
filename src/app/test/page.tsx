"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

import {
  Reciter,
  JUZ_SURAHS_MAP,
  RECITERS_LIST,
  getSurahAudioUrl,
  formatTime,
} from "@/lib/quranStream";

export type { Reciter };
export { JUZ_SURAHS_MAP, RECITERS_LIST, getSurahAudioUrl };

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestPage() {
  const [juz, setJuz] = useState<number>(1);
  const [reciterId, setReciterId] = useState<number>(1);
  const [currentSurahIndex, setCurrentSurahIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [surahDurations, setSurahDurations] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronous refs to prevent stale state in callbacks
  const isPlayingRef = useRef<boolean>(isPlaying);
  const juzRef = useRef<number>(juz);
  const reciterIdRef = useRef<number>(reciterId);
  const currentSurahIndexRef = useRef<number>(currentSurahIndex);

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

  const surahsInActiveJuz = useMemo(() => {
    return JUZ_SURAHS_MAP[juz] || [1];
  }, [juz]);

  const activeSurahNumber = surahsInActiveJuz[currentSurahIndex] || surahsInActiveJuz[0];

  const activeReciter = useMemo(() => {
    return RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];
  }, [reciterId]);

  const currentAudioUrl = useMemo(() => {
    return getSurahAudioUrl(activeSurahNumber, reciterId);
  }, [activeSurahNumber, reciterId]);

  // ── Pre-fetch Surah Durations for the Active Juz ──────────────────────────
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
        // Try fallback server for duration probe if available
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

  // ── Overall Juz Total Duration & Elapsed Time ─────────────────────────────
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

  // ── Setup Audio Element & Listeners ───────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
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
          [activeSurahNumber]: d,
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
      const list = JUZ_SURAHS_MAP[juzRef.current] || [];
      const nextIdx = currentSurahIndexRef.current + 1;

      if (nextIdx < list.length) {
        setCurrentSurahIndex(nextIdx);
        setCurrentTime(0);
        const nextSurahNum = list[nextIdx];
        const nextUrl = getSurahAudioUrl(nextSurahNum, reciterIdRef.current);
        audio.src = nextUrl;
        audio.load();
        audio.play().catch(console.warn);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.onerror = () => {
      if (!audio.getAttribute("src") || audio.src === "" || audio.src === window.location.href) {
        return;
      }

      // Check if fallback URL is available
      const fallbackUrl = getSurahAudioUrl(activeSurahNumber, reciterIdRef.current, true);
      if (audio.src !== fallbackUrl) {
        console.warn(
          `Primary CDN failed for Surah ${activeSurahNumber}, trying fallback: ${fallbackUrl}`
        );
        audio.src = fallbackUrl;
        audio.load();
        if (isPlayingRef.current) {
          audio.play().catch(console.warn);
        }
        return;
      }

      setIsLoading(false);
      setError("Failed to load audio stream from CDN. Check connection.");
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
  }, [activeSurahNumber]);

  // ── Seek across the whole Juz ─────────────────────────────────────────────
  const handleSeekJuz = useCallback(
    (targetJuzSec: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const list = JUZ_SURAHS_MAP[juzRef.current] || [1];
      let accumulated = 0;
      let targetSurahIndex = 0;
      let offsetWithinSurah = targetJuzSec;

      for (let i = 0; i < list.length; i++) {
        const sNum = list[i];
        const dur =
          surahDurations[sNum] || (i === currentSurahIndexRef.current ? currentDuration : 0);
        if (dur > 0 && accumulated + dur >= targetJuzSec) {
          targetSurahIndex = i;
          offsetWithinSurah = targetJuzSec - accumulated;
          break;
        }
        accumulated += dur;
        targetSurahIndex = i;
        offsetWithinSurah = Math.max(0, targetJuzSec - accumulated);
      }

      if (targetSurahIndex !== currentSurahIndexRef.current) {
        setCurrentSurahIndex(targetSurahIndex);
        const targetSurahNum = list[targetSurahIndex];
        const targetUrl = getSurahAudioUrl(targetSurahNum, reciterIdRef.current);
        audio.src = targetUrl;
        audio.load();
        audio.onloadedmetadata = () => {
          audio.currentTime = offsetWithinSurah;
          setCurrentTime(offsetWithinSurah);
          if (isPlayingRef.current) {
            audio.play().catch(console.warn);
          }
        };
      } else {
        audio.currentTime = offsetWithinSurah;
        setCurrentTime(offsetWithinSurah);
      }
    },
    [surahDurations, currentDuration]
  );

  const handleSkipJuz = useCallback(
    (deltaSeconds: number) => {
      const newTarget = Math.max(
        0,
        Math.min(totalJuzElapsedTime + deltaSeconds, totalJuzDuration || Infinity)
      );
      handleSeekJuz(newTarget);
    },
    [totalJuzElapsedTime, totalJuzDuration, handleSeekJuz]
  );

  const handleJuzChange = useCallback((newJuz: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setJuz(newJuz);
    setCurrentSurahIndex(0);
    setCurrentTime(0);
    setCurrentDuration(0);
    setIsPlaying(false);
    setError(null);

    const firstSurah = (JUZ_SURAHS_MAP[newJuz] || [1])[0];
    const newUrl = getSurahAudioUrl(firstSurah, reciterIdRef.current);
    if (audio) {
      audio.src = newUrl;
      audio.load();
    }
  }, []);

  // ── MediaSession for Lock-Screen Controls ────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Juz ${juz}`,
      artist: activeReciter.name,
      album: "Holy Quran",
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      handleSkipJuz(-10);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      handleSkipJuz(10);
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (juzRef.current > 1) {
        handleJuzChange(juzRef.current - 1);
      }
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (juzRef.current < 30) {
        handleJuzChange(juzRef.current + 1);
      }
    });

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
      } catch {
        /* ignore */
      }
    };
  }, [juz, activeReciter, handleJuzChange, handleSkipJuz]);

  // ── Playback Controls ────────────────────────────────────────────────────

  const handlePlay = useCallback(() => {
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

  const handleReciterChange = useCallback(
    (newReciterId: number) => {
      const audio = audioRef.current;
      const wasPlaying = isPlayingRef.current;
      setReciterId(newReciterId);
      setError(null);

      const newUrl = getSurahAudioUrl(activeSurahNumber, newReciterId);
      if (audio) {
        audio.src = newUrl;
        audio.load();
        if (wasPlaying) {
          setIsLoading(true);
          audio.play().catch(console.warn);
        }
      }
    },
    [activeSurahNumber]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "480px",
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        🎧 Juz Audio Stream
      </h1>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>
        Fast CDN audio playback for Holy Quran by Juz.
      </p>

      {/* Juz Selector */}
      <div style={{ marginBottom: "14px" }}>
        <label
          style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
        >
          Juz
        </label>
        <select
          value={juz}
          onChange={(e) => handleJuzChange(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        >
          {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
            <option key={j} value={j}>
              Juz {j}
            </option>
          ))}
        </select>
      </div>

      {/* Reciter Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
        >
          Reciter
        </label>
        <select
          value={reciterId}
          onChange={(e) => handleReciterChange(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        >
          {RECITERS_LIST.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Seeker / Progress bar */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="range"
          min={0}
          max={totalJuzDuration > 0 ? totalJuzDuration : 100}
          step={1}
          value={totalJuzElapsedTime}
          disabled={!totalJuzDuration}
          onChange={(e) => handleSeekJuz(Number(e.target.value))}
          style={{
            width: "100%",
            cursor: totalJuzDuration > 0 ? "pointer" : "not-allowed",
            accentColor: "#0d9488",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "#666",
            marginTop: "4px",
          }}
        >
          <span>{formatTime(totalJuzElapsedTime)}</span>
          <span>
            {totalJuzDuration > 0 ? formatTime(totalJuzDuration) : "calculating duration..."}
          </span>
        </div>
      </div>

      {/* Quick skip buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={() => handleSkipJuz(-30)}
          disabled={!totalJuzDuration}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#f9fafb",
            fontSize: "13px",
            cursor: totalJuzDuration ? "pointer" : "not-allowed",
          }}
        >
          ⏪ -30s
        </button>
        <button
          onClick={() => handleSkipJuz(-10)}
          disabled={!totalJuzDuration}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#f9fafb",
            fontSize: "13px",
            cursor: totalJuzDuration ? "pointer" : "not-allowed",
          }}
        >
          ⏪ -10s
        </button>
        <button
          onClick={() => handleSkipJuz(10)}
          disabled={!totalJuzDuration}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#f9fafb",
            fontSize: "13px",
            cursor: totalJuzDuration ? "pointer" : "not-allowed",
          }}
        >
          +10s ⏩
        </button>
        <button
          onClick={() => handleSkipJuz(30)}
          disabled={!totalJuzDuration}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#f9fafb",
            fontSize: "13px",
            cursor: totalJuzDuration ? "pointer" : "not-allowed",
          }}
        >
          +30s ⏩
        </button>
      </div>

      {/* Play / Pause & Prev / Next Juz Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          onClick={() => juz > 1 && handleJuzChange(juz - 1)}
          disabled={juz <= 1}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            background: "#f9fafb",
            fontSize: "14px",
            cursor: juz <= 1 ? "not-allowed" : "pointer",
          }}
          title="Previous Juz"
        >
          ⏮ Prev Juz
        </button>

        <button
          onClick={handlePlay}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: isPlaying ? "#ef4444" : "#0d9488",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {isLoading ? "⏳ Loading..." : isPlaying ? "⏸ Pause" : "▶ Play Juz Stream"}
        </button>

        <button
          onClick={() => juz < 30 && handleJuzChange(juz + 1)}
          disabled={juz >= 30}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            background: "#f9fafb",
            fontSize: "14px",
            cursor: juz >= 30 ? "not-allowed" : "pointer",
          }}
          title="Next Juz"
        >
          Next Juz ⏭
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {/* Debug info */}
      <details style={{ fontSize: "12px", color: "#999" }}>
        <summary style={{ cursor: "pointer", marginBottom: "8px" }}>Debug Info</summary>
        <pre
          style={{
            background: "#f4f4f5",
            padding: "12px",
            borderRadius: "8px",
            overflow: "auto",
            fontSize: "11px",
            lineHeight: "1.6",
          }}
        >
          {`Active URL: ${currentAudioUrl}
Juz: ${juz}
Reciter: ${activeReciter.name} (ID: ${reciterId})
Playing: ${isPlaying}
Loading: ${isLoading}
Juz Elapsed: ${totalJuzElapsedTime.toFixed(1)}s (${formatTime(totalJuzElapsedTime)})
Juz Total Duration: ${totalJuzDuration > 0 ? `${totalJuzDuration.toFixed(1)}s (${formatTime(totalJuzDuration)})` : "calculating..."}`}
        </pre>
      </details>
    </div>
  );
}
