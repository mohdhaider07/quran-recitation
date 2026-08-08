"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  BookOpen,
  ChevronRight,
  List,
  Globe,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useGetJuzQuery } from "@/store/api/quranApi";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useQuranAudio } from "@/hooks/useQuranAudio";

interface Reciter {
  id: string;
  name: string;
  language: string;
}

const RECITERS: Reciter[] = [
  {
    id: "ar.abdulbasitmurattal",
    name: "Abdul Basit (Murattal)",
    language: "Arabic",
  },
  { id: "en.walk", name: "Ibrahim Walk", language: "English" },
  { id: "ur.khan", name: "Fateh Muhammad Jalandhari", language: "Urdu" },
];

const SkeletonLoader = () => {
  return (
    <div className="space-y-6 w-full max-w-lg mx-auto animate-fade-in-up py-8">
      <div className="h-12 rounded-xl animate-shimmer bg-theme-bg-muted" />
      <div className="h-8 rounded-lg w-3/4 mx-auto animate-shimmer bg-theme-bg-muted" />
      <div className="h-6 rounded-full w-1/2 mx-auto animate-shimmer bg-theme-bg-muted" />
    </div>
  );
};

export default function QuranPlayer() {
  const { theme } = useTheme();

  const [juz, setJuz] = useState(1);
  const [reciter, setReciter] = useState(RECITERS[0].id);

  const [showAyahList, setShowAyahList] = useState(false);
  const [showReciterList, setShowReciterList] = useState(false);
  const [showJuzList, setShowJuzList] = useState(false);

  const ayahListRef = useRef<HTMLDivElement | null>(null);

  const currentReciter = useMemo(
    () => RECITERS.find((r) => r.id === reciter) || RECITERS[0],
    [reciter]
  );

  const { data, isFetching, isError, refetch } = useGetJuzQuery({ juz, reciter });
  const ayahs = useMemo(() => data?.data?.ayahs ?? [], [data]);

  const handleNextJuz = useCallback(() => {
    if (juz < 30) {
      setJuz((prev) => prev + 1);
    }
  }, [juz]);

  const {
    currentAyahIndex,
    currentAyah,
    isPlaying,
    isAudioLoading,
    audioError,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    selectAyah,
    nextAyah,
    prevAyah,
    seekTo,
    setVolume,
    toggleMute,
    resetIndex,
    setIsPlaying,
  } = useQuranAudio({
    ayahs,
    juz,
    reciterId: reciter,
    reciterName: currentReciter.name,
    isFetching,
    onNextJuz: handleNextJuz,
  });

  const changeJuz = useCallback(
    (nextJuz: number) => {
      setJuz(nextJuz);
      resetIndex();
      setIsPlaying(true);
    },
    [resetIndex, setIsPlaying]
  );

  const changeReciter = useCallback(
    (nextReciter: string) => {
      setReciter(nextReciter);
      resetIndex();
      setIsPlaying(true);
    },
    [resetIndex, setIsPlaying]
  );

  // Scroll to current ayah in the list modal when opened
  useEffect(() => {
    if (showAyahList && ayahListRef.current) {
      const timer = setTimeout(() => {
        const activeItem = ayahListRef.current?.querySelector('[data-active="true"]');
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentAyahIndex, showAyahList]);

  const openReciterList = useCallback(() => {
    setShowJuzList(false);
    setShowAyahList(false);
    setShowReciterList(true);
  }, []);

  const openJuzList = useCallback(() => {
    setShowReciterList(false);
    setShowAyahList(false);
    setShowJuzList(true);
  }, []);

  const openAyahList = useCallback(() => {
    setShowReciterList(false);
    setShowJuzList(false);
    setShowAyahList(true);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <GlassCard className={`relative flex flex-col min-h-125 overflow-hidden group ${theme.cardBg} ${theme.border}`}>
        <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center grow">
          <SectionHeader title="Holy Quran" className="w-full mb-6 sm:mb-8" />

          {/* Error Banner when API load fails */}
          {isError ? (
            <div className="grow flex flex-col items-center justify-center w-full p-6 text-center space-y-4">
              <div className="p-3 rounded-full bg-red-500/10 text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Failed to load Juz {juz} recitations
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Please check your internet connection and try again.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : isFetching ? (
            <div className="grow flex items-center justify-center w-full">
              <SkeletonLoader />
            </div>
          ) : (
            <div className="flex flex-col w-full animate-fade-in-up gap-6">
             

              {/* Selection Trigger Buttons */}
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
                      {currentReciter.name}
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
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-400" />
                </button>

                {/* Ayat Trigger */}
                <button
                  onClick={openAyahList}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md",
                    "border-teal-100 hover:border-teal-300 hover:shadow-md dark:bg-slate-900/40 dark:border-slate-800"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100/50 dark:border-teal-900/40">
                    <List className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 dark:text-teal-400/80">
                      Ayat
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {ayahs.length} verses • Playing Ayah {currentAyahIndex + 1}
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
          {/* Progress Bar Container */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-[10px] font-mono", theme.textMuted)}>
                {formatTime(currentTime)}
              </span>
              <span className={cn("text-[10px] font-mono", theme.textMuted)}>
                {formatTime(duration)}
              </span>
            </div>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={(val) => seekTo(val[0])}
              className="cursor-pointer"
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
                {isAudioLoading ? (
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
                  className={cn(
                    "text-xs font-medium truncate max-w-[120px]",
                    theme.text
                  )}
                >
                  {currentReciter.name}
                </span>
              </div>
            </div>

            {/* Core Controls: Prev / Play / Next */}
            <div className="flex items-center gap-4 sm:gap-8">
              <IconButton
                onClick={prevAyah}
                disabled={currentAyahIndex === 0 && juz === 1}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
              >
                <SkipBack className="w-5 h-5" />
              </IconButton>

              <button
                onClick={togglePlay}
                disabled={isFetching || ayahs.length === 0}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50 disabled:pointer-events-none",
                  `bg-gradient-to-r ${theme.primary} text-white shadow-theme-primary`
                )}
              >
                {isAudioLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              <IconButton
                onClick={nextAyah}
                disabled={currentAyahIndex === ayahs.length - 1 && juz === 30}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
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
                  <span className={cn("text-sm font-medium", theme.textMuted)}>
                    Volume
                  </span>
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
            showReciterList ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
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
            {RECITERS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  changeReciter(r.id);
                  setShowReciterList(false);
                }}
                className={cn(
                  "w-full p-4 transition-all flex items-center gap-3 focus-ring",
                  reciter === r.id
                    ? `bg-gradient-to-r ${theme.primary} text-white`
                    : `hover:${theme.bgMuted} border-y border-transparent ${theme.text}`
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    reciter === r.id
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      reciter === r.id ? "text-white" : theme.text
                    )}
                  >
                    {r.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      reciter === r.id ? "text-white/80" : theme.textMuted
                    )}
                  >
                    {r.language}
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
            showJuzList ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
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
                  changeJuz(juzNum);
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
                    className={cn(
                      "text-xs",
                      juz === juzNum ? "text-white/80" : theme.textMuted
                    )}
                  >
                    Para {juzNum}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ayat List Drawer Overlay */}
        <div
          ref={ayahListRef}
          className={cn(
            "absolute inset-0 z-50 transition-all duration-500 ease-in-out transform flex flex-col backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 shadow-2xl",
            showAyahList ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
          )}
        >
          <div
            className={cn(
              `p-6 flex items-center justify-between border-b ${theme.border} ${theme.bgMuted}`
            )}
          >
            <h3 className={cn("text-lg font-bold", theme.text)}>Ayat List</h3>
            <IconButton
              onClick={() => setShowAyahList(false)}
              variant="ghost"
              className={theme.textMuted}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </div>

          <div className="grow overflow-y-auto">
            {ayahs.map((ayah, index) => (
              <button
                key={ayah.number || index}
                data-active={index === currentAyahIndex}
                onClick={() => {
                  selectAyah(index);
                  setShowAyahList(false);
                }}
                className={cn(
                  "w-full text-right p-4 transition-all flex items-center gap-3 focus-ring",
                  index === currentAyahIndex
                    ? `bg-gradient-to-r ${theme.primary} text-white`
                    : `hover:${theme.bgMuted} border-y border-transparent ${theme.text}`
                )}
              >
                {/* Playing indicator / Index */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    index === currentAyahIndex
                      ? "bg-white text-theme-primary-start"
                      : `${theme.bgMuted} ${theme.textMuted}`
                  )}
                >
                  {index === currentAyahIndex && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4">
                      <span
                        className="w-0.5 rounded-full animate-pulse bg-current"
                        style={{ height: "100%", animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-0.5 rounded-full animate-pulse bg-current"
                        style={{ height: "60%", animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-0.5 rounded-full animate-pulse bg-current"
                        style={{ height: "100%", animationDelay: "300ms" }}
                      ></span>
                    </div>
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="flex-1 text-right" dir="rtl">
                  <p
                    className={cn(
                      "text-lg font-arabic leading-relaxed line-clamp-1",
                      index === currentAyahIndex ? "font-bold" : theme.text
                    )}
                  >
                    {ayah.text}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      index === currentAyahIndex
                        ? "text-white/80"
                        : theme.textMuted
                    )}
                  >
                    Ayah {index + 1} • {ayah.surah?.englishName || ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
