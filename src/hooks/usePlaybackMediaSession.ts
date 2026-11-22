import { useRef } from "react";
import { useMediaSession } from "@/hooks/useMediaSession";
import type { AudioMixer } from "@/hooks/useAudioMixer";
import type { QuranStreamAudio } from "@/hooks/useQuranStreamAudio";

const ARTWORK: MediaImage[] = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

/**
 * Owns the page's single Media Session (lock screen, notification and headset buttons) for
 * both the recitation and the ambient mixer. The session is page-wide, so wiring both players
 * here keeps one from silently overriding the other's handlers and metadata.
 *
 * Pause silences both players; play resumes whatever the session paused, or the recitation
 * when nothing was paused from the lock screen.
 */
export function usePlaybackMediaSession(quran: QuranStreamAudio, mixer: AudioMixer): void {
  const pausedBySessionRef = useRef({ quran: false, mixer: false });

  const quranActive = quran.isPlaying || quran.isLoading;
  // Describe the recitation unless only the ambient sounds are playing.
  const showQuran = quranActive || !mixer.isAudible;

  const pauseAll = () => {
    pausedBySessionRef.current = { quran: quranActive, mixer: mixer.isAudible };
    quran.pause();
    mixer.pause();
  };

  const resume = () => {
    const paused = pausedBySessionRef.current;
    pausedBySessionRef.current = { quran: false, mixer: false };
    if (paused.mixer) mixer.play();
    if (paused.quran || !paused.mixer) quran.play();
  };

  useMediaSession({
    metadata: showQuran
      ? {
          title: `Juz ${quran.juz} • ${quran.activeSurahMeta.englishName}`,
          artist: quran.activeReciter.name,
          album: "Holy Quran",
          artwork: ARTWORK,
        }
      : { title: "Nature Sounds", artist: "Peaceful Quran", album: "Ambient", artwork: ARTWORK },
    playbackState: quranActive || mixer.isAudible ? "playing" : "paused",
    positionState:
      showQuran && quran.totalJuzDuration
        ? {
            duration: quran.totalJuzDuration,
            position: quran.totalJuzElapsedTime,
            playbackRate: 1,
          }
        : null,
    handlers: {
      play: resume,
      pause: pauseAll,
      stop: pauseAll,
      previoustrack: showQuran && quran.juz > 1 ? quran.handlePrevJuz : null,
      nexttrack: showQuran && quran.juz < 30 ? quran.handleNextJuz : null,
    },
  });
}
