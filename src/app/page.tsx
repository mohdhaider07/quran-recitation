"use client";

import QuranPlayer from "@/components/QuranPlayer";
import AmbianceMixer from "@/components/AmbianceMixer";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/hooks/useTheme";

export default function Home() {
  const { theme } = useTheme();

  return (
    <main
      className={`min-h-screen transition-all duration-700 px-4 py-8 sm:px-6 md:px-12 relative overflow-hidden flex flex-col items-center ${theme.text}`}
    >
      {/* Decorative Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <header className="animate-fade-in-up px-4 sm:px-0 text-center lg:text-left flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <img src="/logo.png" alt="Quran Ambience Logo" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg border border-teal-500/20 bg-teal-950/5 dark:bg-emerald-950/20 p-1 flex-shrink-0" />
            <div>
              <h1
                className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent`}
              >
                Quran Ambience
              </h1>
              <p
                className={`text-lg sm:text-xl font-light max-w-xl mx-auto lg:mx-0 ${theme.textMuted}`}
              >
                Immerse yourself in divine recitation and calming nature sounds.
              </p>
            </div>
          </header>
          <QuranPlayer />
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6 pt-0">
          <AmbianceMixer />

          <GlassCard className={`p-6 text-sm space-y-3 ${theme.cardBg} ${theme.border}`}>
            <p className={theme.textMuted}>
              Select a Juz to begin playback. Adjust ambient sounds to your
              preference.
            </p>
            <p
              className={`text-xs pt-3 border-t mt-3 ${theme.border} ${theme.textAccent}`}
            >
              💡 Pro tip: Adjust ambient sounds to create your perfect focus
              environment.
            </p>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
