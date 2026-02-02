"use client";

import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Globe,
  X,
} from "lucide-react";
import { useGetJuzQuery } from "@/store/api/quranApi";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/button";
import { ShadCombobox } from "@/components/ui/ShadCombobox";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

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
    <div className="space-y-6 w-full max-w-lg mx-auto animate-fade-in-up">
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
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAyahList, setShowAyahList] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahListRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const ayahListButtonRef = useRef<HTMLButtonElement | null>(null);
  const isPlayingRef = useRef(false);
  const ayahsLengthRef = useRef(0);
  const juzRef = useRef(1);

  const currentReciter = RECITERS.find((r) => r.id === reciter) || RECITERS[0];
  const { data, isFetching, isError } = useGetJuzQuery({ juz, reciter });
  const ayahs = useMemo(() => data?.data.ayahs ?? [], [data]);

  const changeJuz = useCallback(
    (
      nextJuz: number,
      options?: { autoAdvance?: boolean; resetIndex?: boolean }
    ) => {
      const { autoAdvance = true, resetIndex = true } = options ?? {};

      // Reset time and duration instantly when switching Juz
      setCurrentTime(0);
      setDuration(0);

      if (autoAdvance) {
        setIsPlaying(true);
      }

      if (resetIndex) {
        setCurrentAyahIndex(0);
      }

      setJuz(nextJuz);
    },
    []
  );

  const changeReciter = useCallback((nextReciter: string) => {
    setIsPlaying(true); // Autoplay on reciter change too
    setCurrentAyahIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setReciter(nextReciter);
  }, []);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setCurrentAyahIndex((prev) => {
        // Use refs to get current values (avoid closure issues)
        const currentAyahsLength = ayahsLengthRef.current;
        const currentJuz = juzRef.current;

        // If we've reached the end of the current juz, move to next juz
        if (prev + 1 >= currentAyahsLength) {
          if (currentJuz < 30) {
            changeJuz(currentJuz + 1, {
              autoAdvance: isPlayingRef.current,
              resetIndex: false,
            });
            return 0;
          }

          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    };

    // Track time updates
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    // Track duration
    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [changeJuz]);

  // Sync state to refs
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    ayahsLengthRef.current = ayahs.length;
  }, [ayahs.length]);

  useEffect(() => {
    juzRef.current = juz;
  }, [juz]);

  // Handle Playback Change
  useEffect(() => {
    let isMounted = true;

    const startPlayback = async () => {
      if (!audioRef.current) return;

      // Handle pause immediately
      if (!isPlaying) {
        audioRef.current.pause();
        return;
      }

      // Wait if data is still loading
      if (ayahs.length === 0 || isFetching) return;

      const ayah = ayahs[currentAyahIndex];
      if (!ayah || !ayah.audio) {
        if (!ayah?.audio) console.warn("No audio available for this ayah");
        if (isPlaying && currentAyahIndex < ayahs.length - 1) {
          setCurrentAyahIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
        return;
      }

      try {
        if (audioRef.current.src !== ayah.audio) {
          // Reset time and duration state before loading new audio
          setCurrentTime(0);
          setDuration(0);
          audioRef.current.src = ayah.audio;
          audioRef.current.load();
        }

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (error: any) {
        // Handle AbortError specifically - it's expected during rapid changes
        if (error.name !== "AbortError" && isMounted) {
          console.error("Playback failed", error);
          setIsPlaying(false);
        }
      }
    };

    startPlayback();

    return () => {
      isMounted = false;
    };
  }, [currentAyahIndex, isPlaying, ayahs, isFetching]);

  // Scroll to current ayah in the list
  useEffect(() => {
    if (showAyahList && ayahListRef.current) {
      const activeItem = ayahListRef.current.querySelector(
        '[data-active="true"]'
      );
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentAyahIndex, showAyahList]);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Close ayah list panel if clicking outside
      if (showAyahList && ayahListRef.current && ayahListButtonRef.current) {
        if (
          !ayahListRef.current.contains(target) &&
          !ayahListButtonRef.current.contains(target)
        ) {
          setShowAyahList(false);
        }
      }
    };

    // Only add listener if at least one panel is open
    if (showAyahList) {
      document.addEventListener(
        "mousedown",
        handleClickOutside as EventListener
      );
      document.addEventListener(
        "touchstart",
        handleClickOutside as EventListener
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside as EventListener
      );
      document.removeEventListener(
        "touchstart",
        handleClickOutside as EventListener
      );
    };
  }, [showAyahList]);

  // Volume & Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const selectAyah = (index: number) => {
    setCurrentAyahIndex(index);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const togglePlay = useCallback(() => setIsPlaying((prev) => !prev), []);
  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

  const nextAyah = useCallback(() => {
    if (currentAyahIndex < ayahs.length - 1)
      setCurrentAyahIndex((prev) => prev + 1);
  }, [currentAyahIndex, ayahs.length]);

  const prevAyah = useCallback(() => {
    if (currentAyahIndex > 0) setCurrentAyahIndex((prev) => prev - 1);
  }, [currentAyahIndex]);

  const nextJuz = useCallback(() => {
    if (juz < 30) changeJuz(juz + 1);
  }, [juz, changeJuz]);

  const prevJuz = useCallback(() => {
    if (juz > 1) changeJuz(juz - 1);
  }, [juz, changeJuz]);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 10,
        duration
      );
    }
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - 10,
        0
      );
    }
  }, []);

  const currentAyah = ayahs[currentAyahIndex];
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const isLoadingState = isFetching;

  // Skeleton loader component

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <GlassCard className={`flex flex-col min-h-125 overflow-hidden group ${theme.cardBg} ${theme.border}`}>
        <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center grow">
          <SectionHeader
            title="Holy Quran"
            className="w-full mb-6 sm:mb-8"
            action={
              <div
                className={cn(
                  `flex rounded-full p-1 border ${theme.border} ${theme.bgMuted}`
                )}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAyahList(!showAyahList)}
                  className={cn(
                    "rounded-full h-8 px-3 gap-2",
                    showAyahList
                      ? `bg-linear-to-r ${theme.primary} text-white shadow-sm`
                      : theme.textMuted
                  )}
                >
                  <List className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">
                    List
                  </span>
                </Button>
              </div>
            }
          />

          {isFetching ? (
            <div className="grow flex items-center justify-center w-full">
              <SkeletonLoader />
            </div>
          ) : (
            <div className="grow flex flex-col items-center justify-center w-full text-center space-y-6 sm:space-y-10 animate-fade-in-up">
              <div className="space-y-6">

              </div>

              {/* Premium Selection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mx-auto mt-8 animate-fade-in-up">
                {/* Juz Selection Card */}
                <div
                  className={cn(
                    "relative group p-5 rounded-2xl border transition-all duration-500 ease-out",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md",
                    "border-teal-100 hover:border-teal-300",
                    "shadow-sm hover:shadow-teal-100/50 hover:-translate-y-1"
                  )}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-50/0 via-teal-50/0 to-teal-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300 shadow-sm border border-teal-100/50">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 group-hover:text-teal-800 transition-colors">
                          Selection
                        </label>
                        <span className="text-sm font-bold text-slate-800">
                          Juz Selection
                        </span>
                      </div>
                    </div>
                    <ShadCombobox
                      value={juz.toString()}
                      onValueChange={(val) => changeJuz(parseInt(val))}
                      options={Array.from({ length: 30 }, (_, i) => ({
                        value: (i + 1).toString(),
                        label: `Juz ${i + 1}`,
                      }))}
                      placeholder="Select Juz"
                      triggerClassName="w-full bg-white/60 border-teal-100/80 hover:border-teal-400 focus:ring-teal-500/20 h-11"
                    />
                  </div>
                </div>

                {/* Reciter Selection Card */}
                <div
                  className={cn(
                    "relative group p-5 rounded-2xl border transition-all duration-500 ease-out",
                    "bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md",
                    "border-teal-100 hover:border-teal-300",
                    "shadow-sm hover:shadow-teal-100/50 hover:-translate-y-1"
                  )}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-50/0 via-teal-50/0 to-teal-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300 shadow-sm border border-teal-100/50">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/70 group-hover:text-teal-800 transition-colors">
                          Audio
                        </label>
                        <span className="text-sm font-bold text-slate-800">
                          Select Reciter
                        </span>
                      </div>
                    </div>
                    <ShadCombobox
                      value={reciter}
                      onValueChange={changeReciter}
                      options={RECITERS.map((r) => ({
                        value: r.id,
                        label: r.name,
                      }))}
                      placeholder="Select Reciter"
                      triggerClassName="w-full bg-white/60 border-teal-100/80 hover:border-teal-400 focus:ring-teal-500/20 h-11"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Player Bar */}
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
              onValueChange={(val) => {
                if (audioRef.current) audioRef.current.currentTime = val[0];
              }}
              className="cursor-pointer"
            />
          </div>

          {/* Controls Layout */}
          <div className="px-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
            {/* Audio Visualization Replacement / Info */}
            <div className="hidden sm:flex items-center gap-3 w-1/4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                  isPlaying
                    ? `bg-linear-to-br ${theme.primary} text-white shadow-lg animate-pulse`
                    : `${theme.bgMuted} ${theme.textMuted}`
                )}
              >
                {isPlaying ? (
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

            {/* Player Core Controls */}
            <div className="flex items-center gap-4 sm:gap-8">
              <IconButton
                onClick={() =>
                  setCurrentAyahIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentAyahIndex === 0}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
              >
                <SkipBack className="w-5 h-5" />
              </IconButton>

              <button
                onClick={togglePlay}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl",
                  `bg-linear-to-r ${theme.primary} text-white shadow-theme-primary`
                )}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>

              <IconButton
                onClick={() =>
                  setCurrentAyahIndex((prev) =>
                    Math.min(ayahs.length - 1, prev + 1)
                  )
                }
                disabled={currentAyahIndex === ayahs.length - 1}
                variant="secondary"
                className="w-10 h-10 sm:w-12 sm:h-12"
              >
                <SkipForward className="w-5 h-5" />
              </IconButton>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-end gap-3 w-1/4">
              <div
                className={cn(
                  `hidden sm:flex items-center gap-3 rounded-full px-4 py-2 border ${theme.border} ${theme.bgMuted}`
                )}
              >
                <IconButton
                  onClick={toggleMute}
                  variant="ghost"
                  className="p-0 h-auto hover:bg-transparent"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className={`w-4 h-4 ${theme.textMuted} opacity-50`} />
                  ) : (
                    <Volume2 className={cn("w-4 h-4", theme.textAccent)} />
                  )}
                </IconButton>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={(val) => {
                    setVolume(val[0]);
                    if (val[0] > 0) setIsMuted(false);
                  }}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Slide-up Ayah List Overlay */}
        <div
          ref={ayahListRef}
          className={cn(
            "absolute inset-0 z-50 transition-all duration-500 ease-in-out transform flex flex-col backdrop-blur-2xl bg-theme-card/95",
            showAyahList ? "translate-y-0" : "translate-y-full"
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
                key={ayah.number}
                onClick={() => selectAyah(index)}
                className={cn(
                  "w-full text-right p-4 transition-all flex items-center gap-3 focus-ring",
                  index === currentAyahIndex
                    ? `bg-linear-to-r ${theme.primary} text-white`
                    : `hover:${theme.bgMuted} border-y border-transparent ${theme.text}`
                )}
              >
                {/* Playing indicator */}
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
                    Ayah {index + 1}
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
