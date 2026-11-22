import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Types & Constants ────────────────────────────────────────────────────────

export type AmbientSoundType = "rain" | "thunder" | "birds";

export interface SoundControl {
  id: AmbientSoundType;
  label: string;
  src: string;
  icon: string;
}

export interface Preset {
  id: string;
  name: string;
  icon: string;
  volumes: Record<AmbientSoundType, number>;
}

export type AudioMixer = ReturnType<typeof useAudioMixer>;

export const SOUNDS: SoundControl[] = [
  { id: "rain", label: "Rain", src: "/sounds/rain.mp3", icon: "CloudRain" },
  { id: "thunder", label: "Thunder", src: "/sounds/thunder.mp3", icon: "CloudLightning" },
  { id: "birds", label: "Birds", src: "/sounds/birds.mp3", icon: "Bird" },
];

export const PRESETS: Preset[] = [
  { id: "calm", name: "Calm", icon: "Droplets", volumes: { rain: 0.4, thunder: 0, birds: 0 } },
  {
    id: "storm",
    name: "Storm",
    icon: "CloudLightning",
    volumes: { rain: 0.7, thunder: 0.5, birds: 0 },
  },
  {
    id: "forest",
    name: "Forest",
    icon: "TreePine",
    volumes: { rain: 0.2, thunder: 0, birds: 0.6 },
  },
];

const SILENT: Record<AmbientSoundType, number> = { rain: 0, thunder: 0, birds: 0 };

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Ambient nature-sound mixer. Lock-screen / headset controls for it are wired up by
 * `usePlaybackMediaSession`, which owns the page's single Media Session.
 */
export function useAudioMixer() {
  const [volumes, setVolumes] = useState<Record<AmbientSoundType, number>>(SILENT);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const audioRefs = useRef<Record<AmbientSoundType, HTMLAudioElement | null>>({
    rain: null,
    thunder: null,
    birds: null,
  });

  // ── Audio initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const refs = audioRefs.current;
    SOUNDS.forEach(({ id, src }) => {
      if (!refs[id]) {
        const audio = new Audio();
        // `new Audio(src)` would preload every track; download only once a sound is turned up.
        audio.preload = "none";
        audio.src = src;
        audio.loop = true;
        audio.volume = 0; // Volume is applied by the playback-state effect below
        refs[id] = audio;
      }
    });
    return () => Object.values(refs).forEach((a) => a?.pause());
  }, []);

  // ── Playback state + volume ─────────────────────────────────────────────────
  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (!audio) return;
      const vol = volumes[id as AmbientSoundType];
      audio.volume = isMuted ? 0 : vol * masterVolume;
      const shouldPlay = isPlaying && vol > 0 && !isMuted;
      if (shouldPlay && audio.paused)
        audio.play().catch((e) => console.warn(`Audio play failed [${id}]`, e));
      if (!shouldPlay && !audio.paused) audio.pause();
    });
  }, [isPlaying, volumes, masterVolume, isMuted]);

  // ── Public API ──────────────────────────────────────────────────────────────

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const toggleMute = useCallback(() => setIsMuted((p) => !p), []);

  const setVolume = useCallback((id: AmbientSoundType, val: number) => {
    setVolumes((prev) => ({ ...prev, [id]: val }));
    setActivePreset(null);
    if (val > 0) setIsPlaying(true);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setVolumes(preset.volumes);
    setActivePreset(presetId);
    setIsPlaying(true);
  }, []);

  const resetAll = useCallback(() => {
    setVolumes(SILENT);
    setActivePreset(null);
    setIsPlaying(false);
  }, []);

  const hasActiveSounds = Object.values(volumes).some((v) => v > 0);
  /** True when at least one ambient track is actually audible. */
  const isAudible = isPlaying && hasActiveSounds && !isMuted;

  // Memoized so components receiving the mixer only re-render when its state changes.
  return useMemo(
    () => ({
      volumes,
      setVolume,
      masterVolume,
      setMasterVolume,
      isMuted,
      toggleMute,
      isPlaying,
      isAudible,
      play,
      pause,
      togglePlay,
      activePreset,
      applyPreset,
      resetAll,
      hasActiveSounds,
    }),
    [
      volumes,
      setVolume,
      masterVolume,
      isMuted,
      toggleMute,
      isPlaying,
      isAudible,
      play,
      pause,
      togglePlay,
      activePreset,
      applyPreset,
      resetAll,
      hasActiveSounds,
    ]
  );
}
