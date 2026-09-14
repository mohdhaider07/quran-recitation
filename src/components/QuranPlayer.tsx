"use client";

import React, { useState, useCallback } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  BookOpen,
  ChevronRight,
  Globe,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useQuranStreamAudio } from "@/hooks/useQuranStreamAudio";
import { RECITERS_LIST, formatTime } from "@/lib/quranStream";

export default function QuranPlayer() {
  const { theme } = useTheme();

  const [showReciterList, setShowReciterList] = useState(false);
  const [showJuzList, setShowJuzList] = useState(false);

  const {
    juz,
    reciterId,
    isPlaying,
    isLoading,
    totalJuzDuration,
    totalJuzElapsedTime,
    activeSurahMeta,
    activeReciter,
    error,
    volume,
    isMuted,
    togglePlay,
    handleJuzChange,
    handleNextJuz,
    handlePrevJuz,
    handleReciterChange,
    setVolume,
    toggleMute,
    retry,
  } = useQuranStreamAudio();

  const openReciterList = useCallback(() => {
    setShowJuzList(false);
    setShowReciterList(true);
  }, []);

  const openJuzList = useCallback(() => {
    setShowReciterList(false);
    setShowJuzList(true);
  }, []);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <GlassCard
        className={`relative flex flex-col min-h-125 overflow-hidden group ${theme.cardBg} ${theme.border}`}
      >
        <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center grow">
          <SectionHeader title="Holy Quran" className="w-full mb-6 sm:mb-8" />

          {/* Error Banner when Audio CDN stream fails */}
          {error ? (
            <div className="grow flex flex-col items-center justify-center w-full p-6 text-center space-y-4">
              <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Failed to stream Juz {juz}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{error}</p>
              </div>
              <button
                onClick={retry}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full animate-fade-in-up gap-6">
              {/* Selection Trigger Buttons (Reciter & Juz only) */}
              <div className="flex flex-col gap-3 w-full">
                {/* Reciter Trigger */}
                <button
                  onClick={openReciterList}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md",
                    "border-teal-100 hover:border-teal-300 hover:shadow-md dark:bg-slate-900/40 dark:border-slate-800"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/50 dark:border-teal-900/40">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 dark:text-teal-400/80">
                      Reciter
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {activeReciter.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activeReciter.style} • {activeReciter.name_arabic}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-400" />
                </button>

                {/* Juz Trigger */}
                <button
                  onClick={openJuzList}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md",
                    "border-teal-100 hover:border-teal-300 hover:shadow-md dark:bg-slate-900/40 dark:border-slate-800"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/50 dark:border-teal-900/40">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 dark:text-teal-400/80">
                      Juz
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Juz {juz}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Para {juz} • {activeSurahMeta.englishName} ({activeSurahMeta.name})
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Player Controls Bar */}
        <div
          className={cn(
            `relative mt-auto border-t ${theme.border} transition-all duration-500 ${theme.bgMuted}`
          )}
        >
          {/* Read-Only Progress Bar Container */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-[10px] font-mono", theme.textMuted)}>
                {formatTime(totalJuzElapsedTime)}
              </span>
              <span className={cn("text-[10px] font-mono", theme.textMuted)}>
                {totalJuzDuration > 0 ? formatTime(totalJuzDuration) : "calculating..."}
              </span>
            </div>
            <Slider
              value={[totalJuzElapsedTime]}
              max={totalJuzDuration > 0 ? totalJuzDuration : 100}
              step={1}
              disabled={true}
              className="pointer-events-none opacity-80 cursor-default"
              aria-label="Juz playback progress"
            />
          </div>

          {/* Controls Layout */}
          <div className="px-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
            {/* Reciter Status / Audio Visualization */}
            <div className="hidden sm:flex items-center gap-3 w-1/4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                  isPlaying
                    ? `bg-gradient-to-br ${theme.primary} text-white shadow-lg animate-pulse`
                    : `${theme.bgMuted} ${theme.textMuted}`
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-widest font-bold",
                    theme.textAccent
                  )}
                >
                  Reciting
                </span>
                <span
                  className={cn("text-xs font-medium truncate max-w-[140px]", theme.text)}
                  title={activeReciter.name}
                >
                  {activeReciter.name}
                </span>
                <span className={cn("text-[10px] truncate max-w-[140px]", theme.textMuted)}>
                  Juz {juz} • {activeSurahMeta.englishName}
                </span>
              </div>
            </div>

            {/* Core Controls: Prev Juz / Play / Next Juz */}
            <div className="flex items-center gap-4 sm:gap-8">
              <IconButton
                onClick={handlePrevJuz}
                disabled={juz <= 1}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
                aria-label="Previous Juz"
                title="Previous Juz"
              >
                <SkipBack className="w-5 h-5" />
              </IconButton>

              <button
                onClick={togglePlay}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50 disabled:pointer-events-none",
                  `bg-gradient-to-r ${theme.primary} text-white shadow-theme-primary`
                )}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              <IconButton
                onClick={handleNextJuz}
                disabled={juz >= 30}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
                aria-label="Next Juz"
                title="Next Juz"
              >
                <SkipForward className="w-5 h-5" />
              </IconButton>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-4 w-full sm:w-auto sm:justify-end">
              <IconButton
                onClick={toggleMute}
                variant={isMuted || volume === 0 ? "danger" : "brand"}
                className="p-2.5 shrink-0"
                aria-label={isMuted ? "Unmute" : "Mute"}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </IconButton>
              <div className="flex-1 sm:w-40 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={cn("text-sm font-medium", theme.textMuted)}>Volume</span>
                  <span
                    className={cn(
                      "text-xs tabular-nums font-bold",
                      isMuted || volume === 0 ? "text-red-400" : theme.textAccent
                    )}
                  >
                    {isMuted || volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={(val) => setVolume(val[0])}
                  disabled={isMuted}
                  className={cn("w-full", isMuted && "opacity-50")}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reciter Selector Drawer Overlay */}
        <div
          className={cn(
            "absolute inset-0 z-50 transition-all duration-500 ease-in-out transform flex flex-col backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl",
            showReciterList
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div
            className={cn(
              `p-6 flex items-center justify-between border-b ${theme.border} ${theme.bgMuted}`
            )}
          >
            <h3 className={cn("text-lg font-bold", theme.text)}>Select Reciter</h3>
            <IconButton
              onClick={() => setShowReciterList(false)}
              variant="ghost"
              className={theme.textMuted}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          <div className="grow overflow-y-auto">
            {RECITERS_LIST.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  handleReciterChange(r.id);
                  setShowReciterList(false);
                }}
                className={cn(
                  "w-full p-4 transition-all flex items-center gap-3 focus-ring",
                  reciterId === r.id
                    ? `bg-gradient-to-r ${theme.primary} text-white`
                    : `hover:${theme.bgMuted} border-y border-transparent ${theme.text}`
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    reciterId === r.id
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left flex-1">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      reciterId === r.id ? "text-white" : theme.text
                    )}
                  >
                    {r.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      reciterId === r.id ? "text-white/80" : theme.textMuted
                    )}
                  >
                    {r.style} • {r.name_arabic}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Juz Selector Drawer Overlay */}
        <div
          className={cn(
            "absolute inset-0 z-50 transition-all duration-500 ease-in-out transform flex flex-col backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl",
            showJuzList
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div
            className={cn(
              `p-6 flex items-center justify-between border-b ${theme.border} ${theme.bgMuted}`
            )}
          >
            <h3 className={cn("text-lg font-bold", theme.text)}>Select Juz</h3>
            <IconButton
              onClick={() => setShowJuzList(false)}
              variant="ghost"
              className={theme.textMuted}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          <div className="grow overflow-y-auto">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => (
              <button
                key={juzNum}
                onClick={() => {
                  handleJuzChange(juzNum);
                  setShowJuzList(false);
                }}
                className={cn(
                  "w-full p-4 transition-all flex items-center gap-3 focus-ring",
                  juz === juzNum
                    ? `bg-gradient-to-r ${theme.primary} text-white`
                    : `hover:${theme.bgMuted} border-y border-transparent ${theme.text}`
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    juz === juzNum
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  {juzNum}
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      juz === juzNum ? "text-white" : theme.text
                    )}
                  >
                    Juz {juzNum}
                  </span>
                  <span
                    className={cn("text-xs", juz === juzNum ? "text-white/80" : theme.textMuted)}
                  >
                    Para {juzNum}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
