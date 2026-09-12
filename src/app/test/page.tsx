"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Test page for the Juz stream API.
 *
 * Points a single <audio> element at /api/juz-stream?juz=X&reciter=Y.
 * The API concatenates all ayah MP3s server-side into one continuous stream.
 * No JS-triggered fetches between tracks → survives Android screen lock.
 *
 * MediaSession API is configured so Android/iOS lock screens show controls.
 */

const RECITERS = [
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", language: "Arabic" },
  { id: "en.walk", name: "Ibrahim Walk", language: "English" },
  { id: "ur.khan", name: "Fateh Muhammad Jalandhari", language: "Urdu" },
];

export default function TestPage() {
  const [juz, setJuz] = useState(1);
  const [reciter, setReciter] = useState(RECITERS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reciterName = RECITERS.find((r) => r.id === reciter)?.name || reciter;

  // Build the stream URL
  const streamUrl = `/api/juz-stream?juz=${juz}&reciter=${encodeURIComponent(reciter)}`;

  // ── Audio element setup ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none"; // Don't preload — user triggers playback
    audioRef.current = audio;

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);

    audio.onloadedmetadata = () => {
      const d = audio.duration;
      if (d && !isNaN(d) && isFinite(d)) setDuration(d);
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

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsLoading(false);
      setError("Failed to load audio stream. Check console for details.");
    };

    return () => {
      audio.pause();
      audio.src = "";
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

  // ── MediaSession for lock-screen controls ────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Juz ${juz}`,
      artist: reciterName,
      album: "Holy Quran",
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (audioRef.current) audioRef.current.currentTime -= 10;
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (audioRef.current) audioRef.current.currentTime += 10;
    });

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
      } catch {
        /* ignore */
      }
    };
  }, [juz, reciterName]);

  // ── Update MediaSession position state ───────────────────────────────────
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(currentTime, duration),
        playbackRate: 1,
      });
    } catch {
      /* ignore */
    }
  }, [currentTime, duration]);

  // ── Playback controls ────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    // If source changed or not set, load the stream URL
    if (!audio.src || !audio.src.includes("/api/juz-stream")) {
      audio.src = streamUrl;
      audio.load();
    }

    setIsLoading(true);
    setError(null);
    audio.play().catch((err) => {
      if (err.name !== "AbortError") {
        setError(`Play failed: ${err.message}`);
        setIsLoading(false);
      }
    });
  }, [isPlaying, streamUrl]);

  const handleJuzChange = useCallback((newJuz: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setJuz(newJuz);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const handleReciterChange = useCallback((newReciter: string) => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setReciter(newReciter);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "480px", margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
        🧪 Juz Stream Test
      </h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>
        Single concatenated MP3 stream — no JS fetches between ayahs.
      </p>

      {/* Juz selector */}
      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
          Juz
        </span>
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
      </label>

      {/* Reciter selector */}
      <label style={{ display: "block", marginBottom: "20px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
          Reciter
        </span>
        <select
          value={reciter}
          onChange={(e) => handleReciterChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.language})
            </option>
          ))}
        </select>
      </label>

      {/* Play/Pause button */}
      <button
        onClick={handlePlay}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "12px",
          border: "none",
          background: isPlaying ? "#ef4444" : "#0d9488",
          color: "white",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        {isLoading ? "⏳ Loading stream..." : isPlaying ? "⏸ Pause" : "▶ Play Juz Stream"}
      </button>

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

      {/* Time display */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          color: "#666",
          marginBottom: "4px",
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{duration > 0 ? formatTime(duration) : "streaming..."}</span>
      </div>

      {/* Progress bar (visual only — seeking on a chunked stream is limited) */}
      <div
        style={{
          width: "100%",
          height: "6px",
          borderRadius: "3px",
          background: "#e5e7eb",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            height: "100%",
            background: "#0d9488",
            borderRadius: "3px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

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
          {`Stream URL: ${streamUrl}
Playing: ${isPlaying}
Loading: ${isLoading}
Current Time: ${currentTime.toFixed(1)}s
Duration: ${duration > 0 ? `${duration.toFixed(1)}s` : "unknown (chunked)"}
Reciter: ${reciterName}
Juz: ${juz}`}
        </pre>
      </details>
    </div>
  );
}
