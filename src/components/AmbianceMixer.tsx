"use client";

import React from "react";
import { useAudioMixer, SOUNDS, PRESETS } from "@/hooks/useAudioMixer";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import {
  CloudRain,
  CloudLightning,
  Bird,
  Volume2,
  VolumeX,
  Droplets,
  TreePine,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    hasActiveSounds,
  } = useAudioMixer();

  const getIcon = (iconName: string, isActive: boolean = false) => {
    const baseClass = cn(
      "w-5 h-5 transition-all duration-300",
      isActive && "text-accent"
    );

    switch (iconName) {
      case "CloudRain":
        return <CloudRain className={baseClass} />;
      case "CloudLightning":
        return <CloudLightning className={baseClass} />;
      case "Bird":
        return <Bird className={baseClass} />;
      case "Droplets":
        return <Droplets className={baseClass} />;
      case "TreePine":
        return <TreePine className={baseClass} />;
      default:
        return null;
    }
  };

  return (
    <GlassCard className="p-4 sm:p-6 w-full">
      <SectionHeader
        title="Nature Sounds"
        action={
          hasActiveSounds ? (
            <IconButton
              onClick={resetAll}
              variant="ghost"
              aria-label="Reset all sounds"
              title="Reset all"
            >
              <RotateCcw className="w-4 h-4" />
            </IconButton>
          ) : null
        }
        className="mb-4 sm:mb-6"
      />

      {/* Quick Presets */}
      <div className="mb-4 sm:mb-6">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2 sm:mb-3">
          Quick Presets
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              variant="outline"
              className={cn(
                "h-auto flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all duration-300",
                activePreset === preset.id
                  ? "bg-primary/20 border-primary/40 text-accent hover:bg-primary/30 hover:text-accent"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg transition-all",
                  activePreset === preset.id ? "bg-primary/30" : "bg-white/10"
                )}
              >
                {getIcon(preset.icon, activePreset === preset.id)}
              </div>
              <span className="text-xs font-medium">{preset.name}</span>
            </Button>
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
              <div
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary/20 text-accent shadow-glow-primary"
                    : "bg-white/5 text-white/50"
                )}
              >
                {getIcon(sound.icon, isActive)}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-white/60"
                    )}
                  >
                    {sound.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs tabular-nums transition-colors",
                      isActive ? "text-accent" : "text-white/30"
                    )}
                  >
                    {Math.round(volumes[sound.id] * 100)}%
                  </span>
                </div>
                <Slider
                  value={[volumes[sound.id]]}
                  max={1}
                  step={0.01}
                  onValueChange={(val) => setVolume(sound.id, val[0])}
                  variant="brand"
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
          <IconButton
            onClick={toggleMute}
            variant={
              isMuted ? "danger" : hasActiveSounds ? "accent" : "secondary"
            }
            className="p-2.5"
            aria-label={isMuted ? "Unmute all sounds" : "Mute all sounds"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </IconButton>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-white/60">
                Master Volume
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isMuted ? "text-red-400" : "text-white/50"
                )}
              >
                {isMuted ? "Muted" : `${Math.round(masterVolume * 100)}%`}
              </span>
            </div>
            <Slider
              value={[masterVolume]}
              max={1}
              step={0.01}
              onValueChange={(val) => setMasterVolume(val[0])}
              disabled={isMuted}
              variant="brand"
              className={cn("w-full", isMuted && "opacity-50")}
              aria-label="Master volume"
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
