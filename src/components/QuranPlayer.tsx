"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { useDrawerDismiss } from "@/hooks/useDrawerDismiss";
import type { QuranStreamAudio } from "@/hooks/useQuranStreamAudio";
import {
  JUZ_START_AYAH,
  RECITERS_LIST,
  SURAHS_META,
  formatTime,
  getAyahLocation,
} from "@/lib/quranStream";

type DrawerId = "reciter" | "juz";

/** Where each Juz begins, e.g. Juz 2 → Al-Baqarah 142. */
const JUZ_STARTS = JUZ_START_AYAH.map((ayahNumber) => {
  const { surah, verse } = getAyahLocation(ayahNumber);
  return { surah: SURAHS_META[surah], verse };
});

const TRIGGER_CLASS = cn(
  "w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 focus-ring",
  "bg-linear-to-br from-white/60 to-white/30 backdrop-blur-md",
  "border-teal-100 hover:border-teal-300 hover:shadow-md dark:bg-slate-900/40 dark:border-slate-800"
);

interface SelectionDrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Slide-up selection list covering the player card. */
function SelectionDrawer({ title, open, onClose, children }: SelectionDrawerProps) {
  const { theme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  // Bring the current selection into view and give it keyboard focus.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>("[aria-current='true']");
    if (!list || !selected) return;
    list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.offsetHeight / 2;
    selected.focus({ preventScroll: true });
  }, [open]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      inert={!open}
      className={cn(
        "absolute inset-0 z-50 transition-all duration-500 ease-in-out transform flex flex-col backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl",
        open
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          `p-6 flex items-center justify-between border-b ${theme.border} ${theme.bgMuted}`
        )}
      >
        <h3 className={cn("text-lg font-bold", theme.text)}>{title}</h3>
        <IconButton
          onClick={onClose}
          variant="ghost"
          className={cn("size-11", theme.textMuted)}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div ref={listRef} className="grow overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}

interface QuranPlayerProps {
  player: QuranStreamAudio;
}

export default function QuranPlayer({ player }: QuranPlayerProps) {
  const { theme } = useTheme();
  const [openDrawer, setOpenDrawer] = useState<DrawerId | null>(null);
  const reciterTriggerRef = useRef<HTMLButtonElement>(null);
  const juzTriggerRef = useRef<HTMLButtonElement>(null);

  const {
    juz,
    reciterId,
    isPlaying,
    isLoading,
    totalJuzDuration,
    totalJuzElapsedTime,
    activeSurahMeta,
    activeReciter,
    activeAyah,
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
  } = player;

  const closeDrawer = useCallback(() => {
    setOpenDrawer((current) => {
      // Return focus to the trigger that opened the drawer.
      const trigger = current === "reciter" ? reciterTriggerRef : juzTriggerRef;
      trigger.current?.focus({ preventScroll: true });
      return null;
    });
  }, []);
  useDrawerDismiss(openDrawer !== null, closeDrawer);

  const progressPercent =
    totalJuzDuration > 0 ? Math.min(100, (totalJuzElapsedTime / totalJuzDuration) * 100) : 0;
  const isActive = isPlaying || isLoading;
  const ayahLabel = activeAyah ? `, Ayah ${activeAyah.numberInSurah}` : "";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <GlassCard
        className={`relative flex flex-col min-h-125 overflow-hidden group ${theme.cardBg} ${theme.border}`}
      >
        <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center grow">
          <SectionHeader title="Holy Quran" className="w-full mb-6 sm:mb-8" />

          <div className="flex flex-col w-full animate-fade-in-up gap-6">
            {/* Stream error with retry; the selectors stay usable below it. */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 w-full p-3 rounded-2xl border border-red-200 bg-red-50/80 text-left"
              >
                <div className="p-2 rounded-full bg-red-500/10 text-red-500 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Failed to stream Juz {juz}</p>
                  <p className="text-xs text-slate-500">{error}</p>
                </div>
                <button
                  onClick={retry}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md active:scale-95 shrink-0 focus-ring"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            )}

            {/* Selection Trigger Buttons (Reciter & Juz only) */}
            <div className="flex flex-col gap-3 w-full">
              {/* Reciter Trigger */}
              <button
                ref={reciterTriggerRef}
                onClick={() => setOpenDrawer("reciter")}
                className={TRIGGER_CLASS}
                aria-haspopup="dialog"
              >
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/50 dark:border-teal-900/40">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 dark:text-teal-400/80">
                      Reciter
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100/70 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                      {activeReciter.language}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {activeReciter.name}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-teal-400 shrink-0" />
              </button>

              {/* Juz Trigger */}
              <button
                ref={juzTriggerRef}
                onClick={() => setOpenDrawer("juz")}
                className={TRIGGER_CLASS}
                aria-haspopup="dialog"
              >
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/50 dark:border-teal-900/40">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 dark:text-teal-400/80">
                    Juz
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Juz {juz}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Para {juz} • {activeSurahMeta.englishName}
                    {ayahLabel} (
                    <span className="font-arabic text-sm" dir="rtl" lang="ar">
                      {activeSurahMeta.name}
                    </span>
                    )
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-teal-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Player Controls Bar */}
        <div
          className={cn(
            `relative mt-auto border-t ${theme.border} transition-all duration-500 ${theme.bgMuted}`
          )}
        >
          {/* Read-only progress (seeking is intentionally not offered) */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-[10px] font-mono tabular-nums", theme.textMuted)}>
                {formatTime(totalJuzElapsedTime)}
              </span>
              <span className={cn("text-[10px] font-mono tabular-nums", theme.textMuted)}>
                {totalJuzDuration > 0 ? formatTime(totalJuzDuration) : "calculating..."}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Juz playback progress"
              aria-valuemin={0}
              aria-valuemax={Math.round(totalJuzDuration)}
              aria-valuenow={Math.round(totalJuzElapsedTime)}
              aria-valuetext={`${formatTime(totalJuzElapsedTime)} of ${formatTime(totalJuzDuration)}`}
              className="relative h-3 sm:h-2 w-full overflow-hidden rounded-full bg-theme-bg-muted"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-theme-primary-start to-theme-primary-end transition-[width] duration-300 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls Layout */}
          <div className="px-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
            {/* Reciter Status / Audio Visualization */}
            <div className="hidden sm:flex items-center gap-3 w-1/4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                  isPlaying
                    ? `bg-linear-to-br ${theme.primary} text-white shadow-lg animate-pulse`
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
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-widest font-bold",
                    theme.textAccent
                  )}
                >
                  Reciting
                </span>
                <span
                  className={cn("text-xs font-medium truncate max-w-35", theme.text)}
                  title={activeReciter.name}
                >
                  {activeReciter.name}
                </span>
                <span className={cn("text-[10px] truncate max-w-35", theme.textMuted)}>
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
                className="w-11 h-11 sm:w-12 sm:h-12"
                aria-label="Previous Juz"
                title="Previous Juz"
              >
                <SkipBack className="w-5 h-5" />
              </IconButton>

              <button
                onClick={togglePlay}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl focus-ring",
                  `bg-linear-to-r ${theme.primary} text-white shadow-theme-primary`
                )}
                aria-label={isActive ? "Pause" : "Play"}
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
                className="w-11 h-11 sm:w-12 sm:h-12"
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
                className="size-11 sm:size-9 shrink-0"
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
        <SelectionDrawer
          title="Select Reciter"
          open={openDrawer === "reciter"}
          onClose={closeDrawer}
        >
          {RECITERS_LIST.map((r) => {
            const selected = reciterId === r.id;
            return (
              <button
                key={r.id}
                aria-current={selected}
                onClick={() => {
                  handleReciterChange(r.id);
                  closeDrawer();
                }}
                className={cn(
                  "w-full p-4 transition-all flex items-center gap-3 focus-ring",
                  selected
                    ? `bg-linear-to-r ${theme.primary} text-white`
                    : `hover:bg-theme-bg-muted border-y border-transparent ${theme.text}`
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    selected
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-base font-semibold leading-tight",
                      selected ? "text-white" : theme.text
                    )}
                  >
                    {r.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs mt-0.5 font-medium",
                      selected ? "text-white/80" : theme.textMuted
                    )}
                  >
                    {r.language} • {r.style}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-arabic text-base leading-relaxed shrink-0 hidden min-[400px]:block",
                    selected ? "text-white/90" : theme.textMuted
                  )}
                  dir="rtl"
                  lang={r.language === "Urdu" ? "ur" : "ar"}
                >
                  {r.name_arabic}
                </span>
              </button>
            );
          })}
        </SelectionDrawer>

        {/* Juz Selector Drawer Overlay */}
        <SelectionDrawer title="Select Juz" open={openDrawer === "juz"} onClose={closeDrawer}>
          {JUZ_STARTS.map((start, i) => {
            const juzNum = i + 1;
            const selected = juz === juzNum;
            return (
              <button
                key={juzNum}
                aria-current={selected}
                onClick={() => {
                  handleJuzChange(juzNum);
                  closeDrawer();
                }}
                className={cn(
                  "w-full p-4 transition-all flex items-center gap-3 focus-ring",
                  selected
                    ? `bg-linear-to-r ${theme.primary} text-white`
                    : `hover:bg-theme-bg-muted border-y border-transparent ${theme.text}`
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    selected
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  {juzNum}
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={cn("text-base font-semibold", selected ? "text-white" : theme.text)}
                  >
                    Juz {juzNum}
                  </span>
                  <span className={cn("text-xs", selected ? "text-white/80" : theme.textMuted)}>
                    Para {juzNum} • Starts at {start.surah.englishName} {start.verse}
                  </span>
                </div>
              </button>
            );
          })}
        </SelectionDrawer>
      </GlassCard>
    </div>
  );
}
