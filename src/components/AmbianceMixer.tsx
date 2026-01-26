"use client";

import React from 'react';
import { useAudioMixer, SOUNDS, PRESETS } from '@/hooks/useAudioMixer';
import { Slider } from '@/components/ui/slider';
import { 
  CloudRain, 
  CloudLightning, 
  Bird, 
  Volume2, 
  VolumeX, 
  Droplets, 
  TreePine,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AmbianceMixer() {
  const { 
    volumes, 
    setVolume, 
    masterVolume, 
    setMasterVolume,
    isMuted,
    toggleMute,
    activePreset,
    applyPreset,
    resetAll,
    hasActiveSounds
  } = useAudioMixer();

  const getIcon = (iconName: string, isActive: boolean = false) => {
    const baseClass = cn(
      "w-5 h-5 transition-all duration-300",
      isActive && "text-emerald-400"
    );
    
    switch (iconName) {
      case 'CloudRain': return <CloudRain className={baseClass} />;
      case 'CloudLightning': return <CloudLightning className={baseClass} />;
      case 'Bird': return <Bird className={baseClass} />;
      case 'Droplets': return <Droplets className={baseClass} />;
      case 'TreePine': return <TreePine className={baseClass} />;
      default: return null;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-white/90">Nature Sounds</h2>
        {hasActiveSounds && (
          <button
            onClick={resetAll}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Reset all sounds"
            title="Reset all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="mb-4 sm:mb-6">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2 sm:mb-3">Quick Presets</p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-200",
                activePreset === preset.id
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg transition-all",
                activePreset === preset.id 
                  ? "bg-emerald-500/30" 
                  : "bg-white/10"
              )}>
                {getIcon(preset.icon, activePreset === preset.id)}
              </div>
              <span className="text-xs font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="h-px bg-white/10 mb-4 sm:mb-6" />

      {/* Individual Sound Controls */}
      <div className="space-y-4 sm:space-y-5">
        {SOUNDS.map((sound) => {
          const isActive = volumes[sound.id] > 0;
          return (
            <div key={sound.id} className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]" 
                  : "bg-white/5 text-white/50"
              )}>
                {getIcon(sound.icon, isActive)}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-white/60"
                  )}>
                    {sound.label}
                  </span>
                  <span className={cn(
                    "text-xs tabular-nums transition-colors",
                    isActive ? "text-emerald-400" : "text-white/30"
                  )}>
                    {Math.round(volumes[sound.id] * 100)}%
                  </span>
                </div>
                <Slider
                  value={[volumes[sound.id]]}
                  max={1}
                  step={0.01}
                  onValueChange={(val) => setVolume(sound.id, val[0])}
                  variant="emerald"
                  className="w-full"
                  aria-label={`${sound.label} volume`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 my-4 sm:my-6" />

      {/* Master Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMute}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              isMuted 
                ? "bg-red-500/20 text-red-400" 
                : hasActiveSounds 
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-white/40"
            )}
            aria-label={isMuted ? "Unmute all sounds" : "Mute all sounds"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-white/60">Master Volume</span>
              <span className={cn(
                "text-xs tabular-nums",
                isMuted ? "text-red-400" : "text-white/50"
              )}>
                {isMuted ? "Muted" : `${Math.round(masterVolume * 100)}%`}
              </span>
            </div>
            <Slider
              value={[masterVolume]}
              max={1}
              step={0.01}
              onValueChange={(val) => setMasterVolume(val[0])}
              disabled={isMuted}
              className={cn("w-full", isMuted && "opacity-50")}
              aria-label="Master volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
