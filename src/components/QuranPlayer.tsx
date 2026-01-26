"use client";

import { Play, Pause, SkipForward, SkipBack, Loader2, Volume2, VolumeX, BookOpen, ChevronLeft, ChevronRight, List, Globe, Keyboard } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Ayah {
  number: number;
  audio: string;
  text: string;
  numberInSurah: number;
  surah: {
    englishName: string;
    name: string;
    number: number;
  };
  juz: number;
}

interface Reciter {
  id: string;
  name: string;
  language: string;
}

const RECITERS: Reciter[] = [

  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', language: 'Arabic' },

  { id: 'en.walk', name: 'Ibrahim Walk', language: 'English' },
  { id: 'ur.khan', name: 'Fateh Muhammad Jalandhari', language: 'Urdu' },
];

export default function QuranPlayer() {
  const [juz, setJuz] = useState(1);
  const [reciter, setReciter] = useState(RECITERS[0].id);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAyahList, setShowAyahList] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahListRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const shortcutsPanelRef = useRef<HTMLDivElement | null>(null);
  const shortcutsButtonRef = useRef<HTMLButtonElement | null>(null);
  const ayahListButtonRef = useRef<HTMLButtonElement | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const isPlayingRef = useRef(false);
  const ayahsLengthRef = useRef(0);
  const juzRef = useRef(1);

  const currentReciter = RECITERS.find(r => r.id === reciter) || RECITERS[0];

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setCurrentAyahIndex(prev => {
        // Use refs to get current values (avoid closure issues)
        const currentAyahsLength = ayahsLengthRef.current;
        const currentJuz = juzRef.current;

        // If we've reached the end of the current juz, move to next juz
        if (prev + 1 >= currentAyahsLength) {
          if (currentJuz < 30) {
            // Mark that we should auto-play the next juz (use ref to get current value)
            shouldAutoPlayRef.current = isPlayingRef.current;
            // Move to next juz - this will trigger a fetch and reset currentAyahIndex to 0
            setJuz(prevJuz => prevJuz + 1);
            return 0; // Will be reset when new juz loads
          } else {
            // Last juz, stop playing
            setIsPlaying(false);
            return prev;
          }
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
  }, []); // Empty deps - we use refs to access current values

  // Fetch Juz Data
  useEffect(() => {
    async function fetchJuz() {
      setIsLoading(true);
      const wasAutoAdvancing = shouldAutoPlayRef.current;
      shouldAutoPlayRef.current = false; // Reset the flag

      // Only stop playing if user manually changed juz, not when auto-advancing
      if (!wasAutoAdvancing) {
        setIsPlaying(false);
      }

      try {
        const res = await fetch(`https://api.alquran.cloud/v1/juz/${juz}/${reciter}`);
        const data = await res.json();
        if (data.code === 200) {
          setAyahs(data.data.ayahs);
          setCurrentAyahIndex(0);
          // If we were auto-advancing, ensure playing state is maintained
          if (wasAutoAdvancing) {
            setIsPlaying(true);
          }
        }
      } catch (e) {
        console.error("Failed to fetch juz", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchJuz();
  }, [juz, reciter]);

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
    const startPlayback = async () => {
      if (!audioRef.current || ayahs.length === 0) return;

      const ayah = ayahs[currentAyahIndex];
      if (!ayah) {
        setIsPlaying(false);
        return;
      }

      // Check if audio is available for this edition
      if (!ayah.audio) {
        console.warn("No audio available for this edition");
        // Auto-advance to next ayah if no audio
        if (isPlaying && currentAyahIndex < ayahs.length - 1) {
          setCurrentAyahIndex(prev => prev + 1);
        }
        return;
      }

      if (audioRef.current.src !== ayah.audio) {
        audioRef.current.src = ayah.audio;
        audioRef.current.load();
      }

      if (isPlaying) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error("Playback failed", error);
          setIsPlaying(false);
        }
      } else {
        audioRef.current.pause();
      }
    };
    startPlayback();
  }, [currentAyahIndex, isPlaying, ayahs]);

  // Scroll to current ayah in the list
  useEffect(() => {
    if (showAyahList && ayahListRef.current) {
      const activeItem = ayahListRef.current.querySelector('[data-active="true"]');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentAyahIndex, showAyahList]);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Close shortcuts panel if clicking outside
      if (showShortcuts && shortcutsPanelRef.current && shortcutsButtonRef.current) {
        if (
          !shortcutsPanelRef.current.contains(target) &&
          !shortcutsButtonRef.current.contains(target)
        ) {
          setShowShortcuts(false);
        }
      }

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
    if (showShortcuts || showAyahList) {
      document.addEventListener('mousedown', handleClickOutside as EventListener);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [showShortcuts, showAyahList]);

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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);
  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

  const nextAyah = useCallback(() => {
    if (currentAyahIndex < ayahs.length - 1) setCurrentAyahIndex(prev => prev + 1);
  }, [currentAyahIndex, ayahs.length]);

  const prevAyah = useCallback(() => {
    if (currentAyahIndex > 0) setCurrentAyahIndex(prev => prev - 1);
  }, [currentAyahIndex]);

  const nextJuz = useCallback(() => {
    if (juz < 30) setJuz(prev => prev + 1);
  }, [juz]);

  const prevJuz = useCallback(() => {
    if (juz > 1) setJuz(prev => prev - 1);
  }, [juz]);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  }, []);

  const adjustVolume = useCallback((delta: number) => {
    setVolume(prev => Math.max(0, Math.min(1, prev + delta)));
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          prevAyah();
          break;
        case 'arrowright':
          e.preventDefault();
          nextAyah();
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'j':
          e.preventDefault();
          skipBackward();
          break;
        case 'l':
          e.preventDefault();
          skipForward();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          if (showAyahList) {
            e.preventDefault();
            setShowAyahList(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, prevAyah, nextAyah, adjustVolume, skipBackward, skipForward, toggleMute, showAyahList]);

  const currentAyah = ayahs[currentAyahIndex];
  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-6 w-full max-w-lg mx-auto animate-fade-in-up">
      <div className="h-12 bg-white/10 rounded-xl animate-shimmer" />
      <div className="h-8 bg-white/10 rounded-lg w-3/4 mx-auto animate-shimmer" />
      <div className="h-6 bg-white/10 rounded-full w-1/2 mx-auto animate-shimmer" />
    </div>
  );

  return (
    <div
      ref={playerRef}
      className="bg-white/5 backdrop-blur-md rounded-none sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border-0 sm:border border-white/10 w-full max-w-3xl mx-auto shadow-2xl relative overflow-hidden group"
      tabIndex={-1}
    >
      {/* Subtle Gradient Glow */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-emerald-500/5 blur-3xl -z-10 group-hover:bg-emerald-500/10 transition-all duration-700"></div>

      {/* Header / Selector */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 tracking-tight">Quran Recitation</h2>
            <p className="text-emerald-200/60 font-medium text-xs sm:text-sm md:text-base">{currentReciter.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Keyboard Shortcuts Toggle */}
            <button
              ref={shortcutsButtonRef}
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={cn(
                "p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all focus-ring touch-manipulation",
                showShortcuts
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : "bg-black/20 border-white/5 text-white/50 hover:text-white hover:bg-white/10"
              )}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Ayah List Toggle */}
            <button
              ref={ayahListButtonRef}
              onClick={() => setShowAyahList(!showAyahList)}
              className={cn(
                "p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all focus-ring touch-manipulation",
                showAyahList
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : "bg-black/20 border-white/5 text-white/50 hover:text-white hover:bg-white/10"
              )}
              aria-label="Toggle ayah list"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/20 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-white/5 backdrop-blur-sm">
              <button
                onClick={prevJuz}
                disabled={juz === 1}
                className="p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all focus-ring touch-manipulation"
                aria-label="Previous Juz"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="relative group/select">
                <select
                  value={juz}
                  onChange={(e) => setJuz(Number(e.target.value))}
                  className="appearance-none bg-transparent text-white pl-2 sm:pl-4 pr-8 sm:pr-10 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base outline-none cursor-pointer hover:bg-white/5 transition-colors focus-ring"
                  aria-label="Select Juz"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                    <option key={j} value={j} className="text-black bg-white">Juz {j}</option>
                  ))}
                </select>
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
              </div>

              <button
                onClick={nextJuz}
                disabled={juz === 30}
                className="p-1.5 sm:p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all focus-ring touch-manipulation"
                aria-label="Next Juz"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Reciter/Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            className="appearance-none bg-black/20 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-white/10 outline-none cursor-pointer hover:bg-white/5 transition-colors flex-1 focus-ring"
            aria-label="Select reciter"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id} className="text-black bg-white">
                {r.name} ({r.language})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div
          ref={shortcutsPanelRef}
          className="mb-4 sm:mb-6 md:mb-8 p-3 sm:p-4 bg-black/30 rounded-xl sm:rounded-2xl border border-white/10 animate-fade-in-up"
        >
          <p className="text-white/60 text-sm mb-3 font-medium">Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="kbd">Space</kbd>
              <span className="text-white/50">Play/Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd">←</kbd>
              <kbd className="kbd">→</kbd>
              <span className="text-white/50">Prev/Next</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd">J</kbd>
              <kbd className="kbd">L</kbd>
              <span className="text-white/50">-10s/+10s</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd">M</kbd>
              <span className="text-white/50">Mute</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd>
              <span className="text-white/50">Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="kbd">Esc</kbd>
              <span className="text-white/50">Close list</span>
            </div>
          </div>
        </div>
      )}

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
                  ? "bg-emerald-500/20 border border-emerald-500/30"
                  : "hover:bg-white/5 border border-transparent"
              )}
            >
              {/* Playing indicator */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                index === currentAyahIndex
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-white/50"
              )}>
                {index === currentAyahIndex && isPlaying ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <span className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0ms' }}></span>
                    <span className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: '60%', animationDelay: '150ms' }}></span>
                    <span className="w-0.5 bg-white rounded-full animate-pulse" style={{ height: '100%', animationDelay: '300ms' }}></span>
                  </div>
                ) : (
                  ayah.numberInSurah
                )}
              </div>

              <div className="flex-1 text-right" dir="rtl">
                <p className={cn(
                  "text-lg font-arabic leading-relaxed line-clamp-1",
                  index === currentAyahIndex ? "text-white" : "text-white/70"
                )}>
                  {ayah.text}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  index === currentAyahIndex ? "text-emerald-300/70" : "text-white/40"
                )}>
                  {ayah.surah.englishName} • Ayah {ayah.numberInSurah}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main Display */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8 min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col justify-center items-center relative">
        {isLoading ? (
          <SkeletonLoader />
        ) : currentAyah ? (
          <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in-up" key={currentAyahIndex}>
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-arabic leading-loose tracking-wide drop-shadow-sm px-2 sm:px-0" dir="rtl">
              {currentAyah.text}
            </div>
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3 bg-emerald-950/30 border border-emerald-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-emerald-200/80 text-xs sm:text-sm font-medium">
              <span>{currentAyah.surah.englishName}</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500/50"></span>
              <span>Ayah {currentAyah.numberInSurah}</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500/50"></span>
              <span className="text-emerald-400">{currentAyahIndex + 1}/{ayahs.length}</span>
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
            variant="emerald"
            className="cursor-pointer"
            aria-label="Playback progress"
          />
          <div className="flex justify-between text-xs text-emerald-200/60 font-medium tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
          <button
            onClick={prevAyah}
            disabled={currentAyahIndex === 0}
            className="text-white/40 hover:text-emerald-400 disabled:opacity-20 transition-colors p-2 sm:p-2.5 focus-ring rounded-lg touch-manipulation"
            aria-label="Previous ayah"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={skipBackward}
            className="text-white/40 hover:text-emerald-400 transition-colors p-2 sm:p-2.5 focus-ring rounded-lg touch-manipulation"
            aria-label="Skip back 10 seconds"
            title="Skip -10s (J)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={togglePlay}
            className={cn(
              "relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 focus-ring",
              isLoading && "opacity-50 pointer-events-none"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {/* Pulse ring animation when playing */}
            {isPlaying && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
            )}
            {isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current relative z-10" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1 relative z-10" />}
          </button>

          <button
            onClick={skipForward}
            className="text-white/40 hover:text-emerald-400 transition-colors p-2 sm:p-2.5 focus-ring rounded-lg touch-manipulation"
            aria-label="Skip forward 10 seconds"
            title="Skip +10s (L)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={nextAyah}
            disabled={!ayahs.length || currentAyahIndex === ayahs.length - 1}
            className="text-white/40 hover:text-emerald-400 disabled:opacity-20 transition-colors p-2 sm:p-2.5 focus-ring rounded-lg touch-manipulation"
            aria-label="Next ayah"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4 w-full">
          <button
            onClick={toggleMute}
            className={cn(
              "p-1 transition-colors focus-ring rounded",
              isMuted ? "text-red-400" : volume === 0 ? "text-white/30" : "text-emerald-400"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
            title="Mute (M)"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
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
    </div>
  );
}
