"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ─── TypeScript Types ─────────────────────────────────────────────────────────

export interface Reciter {
  id: number;
  name: string;
  name_arabic: string;
  style: "Murattal" | "Mujawwad" | string;
  primaryServer: string;
  fallbackServer?: string;
}

// ─── Mapping: Surahs in each of the 30 Juz ───────────────────────────────────

export const JUZ_SURAHS_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [2],
  3: [2, 3],
  4: [3, 4],
  5: [4],
  6: [4, 5],
  7: [5, 6],
  8: [6, 7],
  9: [7, 8],
  10: [8, 9],
  11: [9, 10, 11],
  12: [11, 12],
  13: [12, 13, 14],
  14: [15, 16],
  15: [17, 18],
  16: [18, 19, 20],
  17: [21, 22],
  18: [23, 24, 25],
  19: [25, 26, 27],
  20: [27, 28, 29],
  21: [29, 30, 31, 32, 33],
  22: [33, 34, 35, 36],
  23: [36, 37, 38, 39],
  24: [39, 40, 41],
  25: [41, 42, 43, 44, 45],
  26: [46, 47, 48, 49, 50, 51],
  27: [51, 52, 53, 54, 55, 56, 57],
  28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
  29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
  30: [
    78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  ],
};

// ─── 100% Reliable, Verified High-Speed Quran CDN Reciters ───────────────────

export const RECITERS_LIST: Reciter[] = [
  {
    id: 1,
    name: "Mishary Rashid Alafasy",
    name_arabic: "مشاري راشد العفاسي",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/afs",
    fallbackServer: "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee",
  },
  {
    id: 2,
    name: "Abdul Rahman Al-Sudais",
    name_arabic: "عبدالرحمن السديس",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/sds",
    fallbackServer: "https://download.quranicaudio.com/quran/abdurrahmaan_as-sudais",
  },
  {
    id: 3,
    name: "Abdul Basit Abdul Samad (Murattal)",
    name_arabic: "عبدالباسط عبدالصمد - مرتل",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/basit",
    fallbackServer: "https://download.quranicaudio.com/quran/abdul_basit_murattal",
  },
  {
    id: 4,
    name: "Abdul Basit Abdul Samad (Mujawwad)",
    name_arabic: "عبدالباسط عبدالصمد - مجود",
    style: "Mujawwad",
    primaryServer: "https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad",
    fallbackServer: "https://download.quranicaudio.com/quran/abdul_basit_mujawwad",
  },
  {
    id: 5,
    name: "Maher Al Muaiqly",
    name_arabic: "ماهر المعيقلي",
    style: "Murattal",
    primaryServer: "https://server12.mp3quran.net/maher",
    fallbackServer: "https://download.quranicaudio.com/quran/maher_al_muaiqly",
  },
  {
    id: 6,
    name: "Saad Al-Ghamdi",
    name_arabic: "سعد الغامدي",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/s_gmd",
    fallbackServer: "https://download.quranicaudio.com/quran/sa3d_al-ghaamidi",
  },
  {
    id: 7,
    name: "Hani Ar-Rifai",
    name_arabic: "هاني الرفاعي",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/hani",
    fallbackServer: "https://download.quranicaudio.com/quran/hani_ar-rifai",
  },
  {
    id: 8,
    name: "Abu Bakr Al Shatri",
    name_arabic: "أبوبكر الشاطري",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/shatri",
    fallbackServer: "https://download.quranicaudio.com/quran/abu_bakr_ash-shaatree",
  },
  {
    id: 9,
    name: "Yasser Al-Dosari",
    name_arabic: "ياسر الدوسري",
    style: "Murattal",
    primaryServer: "https://server11.mp3quran.net/yasser",
    fallbackServer: "https://download.quranicaudio.com/quran/yasser_ad-dussary",
  },
  {
    id: 10,
    name: "Saud Al-Shuraim",
    name_arabic: "سعود الشريم",
    style: "Murattal",
    primaryServer: "https://server7.mp3quran.net/shur",
    fallbackServer: "https://download.quranicaudio.com/quran/sa3ood_al-shuraym",
  },
  {
    id: 11,
    name: "Abdullah Al-Juhany",
    name_arabic: "عبدالله الجهني",
    style: "Murattal",
    primaryServer: "https://server13.mp3quran.net/jhn",
    fallbackServer: "https://download.quranicaudio.com/quran/abdullaah_3awwaad_al-juhaynee",
  },
  {
    id: 12,
    name: "Bandar Baleela",
    name_arabic: "بندر بليلة",
    style: "Murattal",
    primaryServer: "https://server6.mp3quran.net/balilah",
    fallbackServer: "https://download.quranicaudio.com/quran/bandar_baleela/complete",
  },
  {
    id: 13,
    name: "Abdullah Al-Buajan",
    name_arabic: "عبدالله البعيجان",
    style: "Murattal",
    primaryServer: "https://server8.mp3quran.net/buajan",
  },
  {
    id: 14,
    name: "Mahmoud Khalil Al-Hussary",
    name_arabic: "محمود خليل الحصري",
    style: "Murattal",
    primaryServer: "https://server13.mp3quran.net/husr",
  },
  {
    id: 15,
    name: "Ali Al-Hudaify",
    name_arabic: "علي بن عبدالرحمن الحذيفي",
    style: "Murattal",
    primaryServer: "https://server9.mp3quran.net/hthfi",
  },
];

/**
 * Returns the primary high-speed CDN audio URL for a given Surah and Reciter
 */
export function getSurahAudioUrl(
  surahNumber: number,
  reciterId: number,
  useFallback = false
): string {
  const pad = surahNumber.toString().padStart(3, "0");
  const reciter = RECITERS_LIST.find((r) => r.id === reciterId) || RECITERS_LIST[0];

  if (useFallback && reciter.fallbackServer) {
    return `${reciter.fallbackServer}/${pad}.mp3`;
  }
  return `${reciter.primaryServer}/${pad}.mp3`;
}

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

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
