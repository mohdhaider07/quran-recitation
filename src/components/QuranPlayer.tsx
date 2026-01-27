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
} from "lucide-react";
import { useGetJuzQuery } from "@/store/api/quranApi";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IconButton } from "@/components/ui/IconButton";
import { ShadSelect } from "@/components/ui/ShadSelect";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const SkeletonLoader = () => (
  <div className="space-y-6 w-full max-w-lg mx-auto animate-fade-in-up">
    <div className="h-12 bg-white/10 rounded-xl animate-shimmer" />
    <div className="h-8 bg-white/10 rounded-lg w-3/4 mx-auto animate-shimmer" />
    <div className="h-6 bg-white/10 rounded-full w-1/2 mx-auto animate-shimmer" />
  </div>
);

export default function QuranPlayer() {
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
    <GlassCard
      ref={playerRef}
      tone="brand"
      className="p-4 sm:p-6 w-full max-w-3xl mx-auto relative overflow-hidden group"
      tabIndex={-1}
    >
      {/* Subtle Gradient Glow */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700"></div>

      {/* Header / Selector */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <SectionHeader
          title="Quran Recitation"
          subtitle={currentReciter.name}
          titleClassName="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 tracking-tight"
          subtitleClassName="font-medium text-xs sm:text-sm md:text-base"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <IconButton
                ref={ayahListButtonRef}
                onClick={() => setShowAyahList(!showAyahList)}
                variant={showAyahList ? "accent" : "secondary"}
                aria-label="Toggle ayah list"
              >
                <List className="w-4 h-4 sm:w-5 sm:h-5" />
              </IconButton>

              <div className="flex items-center gap-1 sm:gap-2 bg-black/20 p-1 rounded-lg sm:rounded-xl border border-white/5 backdrop-blur-sm">
                <IconButton
                  onClick={prevJuz}
                  disabled={juz === 1}
                  variant="ghost"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-white/60 hover:text-white"
                  aria-label="Previous Juz"
                >
                  <ChevronLeft className="w-4 h-4" />
                </IconButton>

                <ShadSelect
                  value={juz}
                  onValueChange={(val) => changeJuz(Number(val))}
                  options={Array.from({ length: 30 }, (_, i) => ({
                    value: i + 1,
                    label: `Juz ${i + 1}`,
                  }))}
                  triggerClassName="h-8 sm:h-9 border-none bg-transparent hover:bg-white/5 text-xs sm:text-sm font-medium w-24 sm:w-28"
                  icon={<BookOpen className="w-3.5 h-3.5 text-accent" />}
                />

                <IconButton
                  onClick={nextJuz}
                  disabled={juz === 30}
                  variant="ghost"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-white/60 hover:text-white"
                  aria-label="Next Juz"
                >
                  <ChevronRight className="w-4 h-4" />
                </IconButton>
              </div>
            </div>
          }
        />

        {/* Reciter/Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ShadSelect
            value={reciter}
            onValueChange={changeReciter}
            options={RECITERS.map((r) => ({
              value: r.id,
              label: `${r.name} (${r.language})`,
            }))}
            triggerClassName="w-full bg-black/20 border-white/10 text-xs sm:text-sm h-10 sm:h-11"
            icon={
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            }
          />
        </div>
      </div>

      {/* Ayah List Panel */}
      {showAyahList && (
        <div
          ref={ayahListRef}
          className="mb-4 sm:mb-6 md:mb-8 max-h-[250px] sm:max-h-[300px] overflow-y-auto rounded-xl sm:rounded-2xl bg-black/20 border border-white/5 p-2 space-y-1 scrollbar-thin animate-fade-in-up"
        >
          {ayahs.map((ayah, index) => (
            <button
              key={ayah.number}
              data-active={index === currentAyahIndex}
              onClick={() => selectAyah(index)}
              className={cn(
                "w-full text-right p-3 rounded-xl transition-all flex items-center gap-3 focus-ring",
                index === currentAyahIndex
                  ? "bg-primary/20 border border-primary/30"
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              {/* Playing indicator */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  index === currentAyahIndex
                    ? "bg-primary text-white"
                    : "bg-white/10 text-white/50"
                )}
              >
                {index === currentAyahIndex && isPlaying ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <span
                      className="w-0.5 bg-white rounded-full animate-pulse"
                      style={{ height: "100%", animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-0.5 bg-white rounded-full animate-pulse"
                      style={{ height: "60%", animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-0.5 bg-white rounded-full animate-pulse"
                      style={{ height: "100%", animationDelay: "300ms" }}
                    ></span>
                  </div>
                ) : (
                  ayah.numberInSurah
                )}
              </div>

              <div className="flex-1 text-right" dir="rtl">
                <p
                  className={cn(
                    "text-lg font-arabic leading-relaxed line-clamp-1",
                    index === currentAyahIndex ? "text-white" : "text-white/70"
                  )}
                >
                  {ayah.text}
                </p>
                <p
                  className={cn(
                    "text-xs mt-1",
                    index === currentAyahIndex
                      ? "text-accent/70"
                      : "text-white/40"
                  )}
                >
                  {ayah.surah.englishName} • Ayah {ayah.numberInSurah}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Display */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8 min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col justify-center items-center relative">
        {isLoadingState ? (
          <SkeletonLoader />
        ) : isError ? (
          <div className="text-white/50">
            Failed to load this Juz. Try again.
          </div>
        ) : currentAyah ? (
          <div
            className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in-up"
            key={currentAyahIndex}
          >
            <div
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-arabic leading-loose tracking-wide drop-shadow-sm px-2 sm:px-0"
              dir="rtl"
            >
              {currentAyah.text}
            </div>
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-surface/30 border border-primary/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-accent/80 text-xs sm:text-sm font-medium">
              <span>{currentAyah.surah.englishName}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50"></span>
              <span>Ayah {currentAyah.numberInSurah}</span>
              <span className="w-1 h-1 rounded-full bg-primary/50"></span>
              <span className="text-accent">
                {currentAyahIndex + 1}/{ayahs.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-white/50">Select a Juz to begin</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 max-w-md mx-auto">
        {/* Progress Bar with Time */}
        <div className="space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            variant="brand"
            className="cursor-pointer"
            aria-label="Playback progress"
          />
          <div className="flex justify-between text-xs text-accent/60 font-medium tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
          <IconButton
            onClick={prevAyah}
            disabled={currentAyahIndex === 0}
            variant="ghost"
            className="text-white/40 hover:text-accent"
            aria-label="Previous ayah"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
          </IconButton>

          <IconButton
            onClick={skipBackward}
            variant="ghost"
            className="text-white/40 hover:text-accent"
            aria-label="Skip back 10 seconds"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </IconButton>

          <Button
            onClick={togglePlay}
            size="icon"
            className={cn(
              "relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary hover:bg-accent text-white shadow-glow-primary hover:shadow-glow-primary-strong transition-all duration-300",
              isLoadingState && "opacity-50 pointer-events-none"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {/* Pulse ring animation when playing */}
            {isPlaying && (
              <span className="absolute inset-0 rounded-full bg-accent animate-pulse-ring" />
            )}
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current relative z-10" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1 relative z-10" />
            )}
          </Button>

          <IconButton
            onClick={skipForward}
            variant="ghost"
            className="text-white/40 hover:text-accent"
            aria-label="Skip forward 10 seconds"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </IconButton>

          <IconButton
            onClick={nextAyah}
            disabled={!ayahs.length || currentAyahIndex === ayahs.length - 1}
            variant="ghost"
            className="text-white/40 hover:text-accent"
            aria-label="Next ayah"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
          </IconButton>
        </div>

        <div className="flex items-center gap-4 w-full">
          <IconButton
            onClick={toggleMute}
            variant="ghost"
            className={cn(
              "p-1",
              isMuted
                ? "text-red-400"
                : volume === 0
                ? "text-white/30"
                : "text-accent"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </IconButton>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={(val) => {
              setVolume(val[0]);
              if (isMuted && val[0] > 0) setIsMuted(false);
            }}
            className={cn("cursor-pointer", isMuted && "opacity-50")}
            aria-label="Volume"
          />
          <span className="text-xs text-white/40 tabular-nums w-10 text-right">
            {isMuted ? "0" : Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
