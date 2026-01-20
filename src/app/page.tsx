import QuranPlayer from "@/components/QuranPlayer";
import AmbianceMixer from "@/components/AmbianceMixer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-6 md:p-12 relative overflow-hidden flex flex-col justify-center">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start relative z-10">
        
        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
            <header className="animate-fade-in-up">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-3 md:mb-4 bg-gradient-to-r from-emerald-200 to-white bg-clip-text text-transparent">
                  Peaceful Quran
                </h1>
                <p className="text-emerald-200/60 text-base md:text-lg lg:text-xl font-light max-w-xl">
                  Immerse yourself in divine recitation and calming nature sounds.
                </p>
            </header>
            <QuranPlayer />
        </div>
        
        <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-6 pt-0">
            <AmbianceMixer />
            
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 md:p-6 border border-white/5 text-sm text-white/40 space-y-2">
                <p>Recitation by Mishary Rashid Alafasy.</p>
                <p>Select a Juz to begin playback. Adjust ambient sounds to your preference.</p>
                <p className="text-emerald-400/60 text-xs pt-2 border-t border-white/5 mt-3">
                  💡 Pro tip: Use keyboard shortcuts for quick control!
                </p>
            </div>
        </div>
      </div>
    </main>
  );
}
