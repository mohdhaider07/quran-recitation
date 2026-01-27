import { useState, useEffect, useRef, useCallback } from 'react';

export type AmbientSoundType = 'rain' | 'thunder' | 'birds';

export interface SoundControl {
  id: AmbientSoundType;
  label: string;
  src: string;
  icon: string; // we'll pass the icon name or component separately in UI
}

export interface Preset {
  id: string;
  name: string;
  icon: string;
  volumes: Record<AmbientSoundType, number>;
}

export const SOUNDS: SoundControl[] = [
  { id: 'rain', label: 'Rain', src: '/sounds/rain.mp3', icon: 'CloudRain' },
  { id: 'thunder', label: 'Thunder', src: '/sounds/thunder.mp3', icon: 'CloudLightning' },
  { id: 'birds', label: 'Birds', src: '/sounds/birds.mp3', icon: 'Bird' },
];

export const PRESETS: Preset[] = [
  { 
    id: 'calm', 
    name: 'Calm', 
    icon: 'Droplets',
    volumes: { rain: 0.4, thunder: 0, birds: 0 } 
  },
  { 
    id: 'storm', 
    name: 'Storm', 
    icon: 'CloudLightning',
    volumes: { rain: 0.7, thunder: 0.5, birds: 0 } 
  },
  { 
    id: 'forest', 
    name: 'Forest', 
    icon: 'TreePine',
    volumes: { rain: 0.2, thunder: 0, birds: 0.6 } 
  },
];

export function useAudioMixer() {
  const [volumes, setVolumes] = useState<Record<AmbientSoundType, number>>({
    rain: 0,
    thunder: 0,
    birds: 0,
  });
  
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  const audioRefs = useRef<Record<AmbientSoundType, HTMLAudioElement | null>>({
      rain: null,
      thunder: null,
      birds: null
  });

  // Initialize Audio objects
  useEffect(() => {
    const currentRefs = audioRefs.current;
    
    SOUNDS.forEach((sound) => {
        if (!currentRefs[sound.id]) {
            const audio = new Audio(sound.src);
            audio.loop = true;
            audio.volume = 0; // Start muted/0 volume
            currentRefs[sound.id] = audio;
        }
    });

    return () => {
        // Cleanup pause
        Object.values(currentRefs).forEach(audio => audio?.pause());
    };
  }, []);

  // Handle Audio State (Play/Pause & Volume)
  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
        if (!audio) return;
        
        const vol = volumes[id as AmbientSoundType];
        // Apply master volume and mute state
        const effectiveVolume = isMuted ? 0 : vol * masterVolume;
        audio.volume = effectiveVolume;

        // Determine if this specific track should be playing
        const shouldPlay = isPlaying && vol > 0 && !isMuted;

        if (shouldPlay) {
            if (audio.paused) {
                audio.play().catch(e => console.error(`Audio play failed for ${id}`, e));
            }
        } else {
            if (!audio.paused) {
                audio.pause();
            }
        }
    });
  }, [isPlaying, volumes, masterVolume, isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setVolume = useCallback((id: AmbientSoundType, val: number) => {
      setVolumes(prev => ({ ...prev, [id]: val }));
      setActivePreset(null); // Clear active preset when manually adjusting
      if (!isPlaying && val > 0) {
          setIsPlaying(true); // Auto-start mixer if user drags a volume slider
      }
  }, [isPlaying]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setVolumes(preset.volumes);
      setActivePreset(presetId);
      if (!isPlaying) {
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const resetAll = useCallback(() => {
    setVolumes({ rain: 0, thunder: 0, birds: 0 });
    setActivePreset(null);
    setIsPlaying(false);
  }, []);

  // Check if any sound is active
  const hasActiveSounds = Object.values(volumes).some(v => v > 0);

  return {
      volumes,
      setVolume,
      masterVolume,
      setMasterVolume,
      isMuted,
      toggleMute,
      isPlaying,
      togglePlay,
      activePreset,
      applyPreset,
      resetAll,
      hasActiveSounds,
  };
}

