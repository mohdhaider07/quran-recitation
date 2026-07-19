import { useState, useEffect, useRef, useCallback } from 'react';
import { useMediaSession } from '@/hooks/useMediaSession';

// ─── Types & Constants ────────────────────────────────────────────────────────

export type AmbientSoundType = 'rain' | 'thunder' | 'birds';

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

export const SOUNDS: SoundControl[] = [
  { id: 'rain',    label: 'Rain',    src: '/sounds/rain.mp3',    icon: 'CloudRain' },
  { id: 'thunder', label: 'Thunder', src: '/sounds/thunder.mp3', icon: 'CloudLightning' },
  { id: 'birds',   label: 'Birds',   src: '/sounds/birds.mp3',   icon: 'Bird' },
];

export const PRESETS: Preset[] = [
  { id: 'calm',   name: 'Calm',   icon: 'Droplets',       volumes: { rain: 0.4, thunder: 0,   birds: 0   } },
  { id: 'storm',  name: 'Storm',  icon: 'CloudLightning', volumes: { rain: 0.7, thunder: 0.5, birds: 0   } },
  { id: 'forest', name: 'Forest', icon: 'TreePine',       volumes: { rain: 0.2, thunder: 0,   birds: 0.6 } },
];

// Static metadata — ambient sounds don't change track, so this never varies.
const AMBIENT_MEDIA_METADATA = {
  title:  'Nature Ambience',
  artist: 'Quran Ambience',
  album:  'Ambient Sounds',
} as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudioMixer() {
  const [volumes, setVolumes] = useState<Record<AmbientSoundType, number>>({
    rain: 0, thunder: 0, birds: 0,
  });
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const audioRefs = useRef<Record<AmbientSoundType, HTMLAudioElement | null>>({
    rain: null, thunder: null, birds: null,
  });

  // ── Audio initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const refs = audioRefs.current;
    SOUNDS.forEach(({ id, src }) => {
      if (!refs[id]) {
        const audio = new Audio(src);
        audio.loop   = true;
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
      const vol             = volumes[id as AmbientSoundType];
      audio.volume          = isMuted ? 0 : vol * masterVolume;
      const shouldPlay      = isPlaying && vol > 0 && !isMuted;
      if (shouldPlay && audio.paused)  audio.play().catch((e) => console.error(`Audio play failed [${id}]`, e));
      if (!shouldPlay && !audio.paused) audio.pause();
    });
  }, [isPlaying, volumes, masterVolume, isMuted]);

  // ── Media Session ────────────────────────────────────────────────────────────
  // Delegates entirely to useMediaSession — no Media Session API code here.
  // The handlers object is defined inline; useMediaSession's ref-delegate
  // pattern means it won't trigger unnecessary re-registrations.
  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setVolumes({ rain: 0, thunder: 0, birds: 0 });
  }, []);

  useMediaSession({
    metadata:      AMBIENT_MEDIA_METADATA,
    playbackState: isPlaying ? 'playing' : 'paused',
    handlers: {
      play:  () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      stop:  handleStop,
    },
  });

  // ── Public API ──────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const toggleMute = useCallback(() => setIsMuted((p) => !p), []);

  const setVolume = useCallback((id: AmbientSoundType, val: number) => {
    setVolumes((prev) => ({ ...prev, [id]: val }));
    setActivePreset(null);
    if (!isPlaying && val > 0) setIsPlaying(true);
  }, [isPlaying]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setVolumes(preset.volumes);
    setActivePreset(presetId);
    if (!isPlaying) setIsPlaying(true);
  }, [isPlaying]);

  const resetAll = useCallback(() => {
    setVolumes({ rain: 0, thunder: 0, birds: 0 });
    setActivePreset(null);
    setIsPlaying(false);
  }, []);

  const hasActiveSounds = Object.values(volumes).some((v) => v > 0);

  return {
    volumes,       setVolume,
    masterVolume,  setMasterVolume,
    isMuted,       toggleMute,
    isPlaying,     togglePlay,
    activePreset,  applyPreset,
    resetAll,      hasActiveSounds,
  };
}
