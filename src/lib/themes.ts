export type ThemeKey =
  | "pearl"
  | "cream"
  | "mint"
  | "lavender"
  | "sand"
  | "rose"
  | "dark";

export interface ThemeConfig {
  name: string;
  description: string;
  gradient: string;
  primary: string;
  accent: string;
  cardBg: string;
  border: string;
  text: string;
  textMuted: string;
  textAccent: string;
  sliderThumb: string;
  shadow: string;
  ring: string;
  icon: string;
  bgMuted: string;
  activeBorder: string;
}

export const themes: Record<ThemeKey, ThemeConfig> = {
  pearl: {
    name: "Pearl White",
    description: "Clean and elegant with soft emerald accents",
    gradient: "from-slate-50 via-emerald-50/30 to-slate-50",
    primary: "from-emerald-600 to-teal-600",
    accent: "emerald",
    cardBg: "bg-white/80",
    border: "border-emerald-200",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textAccent: "text-emerald-700",
    sliderThumb: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-200/50",
    icon: "Sparkles",
    ring: "ring-emerald-500/20",
    bgMuted: "bg-emerald-50/50",
    activeBorder: "border-emerald-500",
  },
  cream: {
    name: "Cream Gold",
    description: "Warm beige with golden highlights",
    gradient: "from-amber-50 via-yellow-50/30 to-amber-50",
    primary: "from-amber-600 to-yellow-600",
    accent: "amber",
    cardBg: "bg-white/70",
    border: "border-amber-200",
    text: "text-amber-950",
    textMuted: "text-amber-700",
    textAccent: "text-amber-800",
    sliderThumb: "from-amber-500 to-yellow-500",
    shadow: "shadow-amber-200/50",
    icon: "Sun",
    ring: "ring-amber-500/20",
    bgMuted: "bg-amber-50/50",
    activeBorder: "border-amber-500",
  },
  mint: {
    name: "Mint Fresh",
    description: "Refreshing mint with teal touches",
    gradient: "from-teal-50 via-cyan-50/30 to-teal-50",
    primary: "from-teal-600 to-cyan-600",
    accent: "teal",
    cardBg: "bg-white/70",
    border: "border-teal-200",
    text: "text-slate-900",
    textMuted: "text-teal-700",
    textAccent: "text-teal-800",
    sliderThumb: "from-teal-500 to-cyan-500",
    shadow: "shadow-teal-200/50",
    icon: "Cloud",
    ring: "ring-teal-500/20",
    bgMuted: "bg-teal-50/50",
    activeBorder: "border-teal-500",
  },
  lavender: {
    name: "Lavender Sky",
    description: "Soft purple with peaceful vibes",
    gradient: "from-purple-50 via-indigo-50/30 to-purple-50",
    primary: "from-purple-600 to-indigo-600",
    accent: "purple",
    cardBg: "bg-white/70",
    border: "border-purple-200",
    text: "text-purple-950",
    textMuted: "text-purple-700",
    textAccent: "text-purple-800",
    sliderThumb: "from-purple-500 to-indigo-500",
    shadow: "shadow-purple-200/50",
    icon: "Sparkles",
    ring: "ring-purple-500/20",
    bgMuted: "bg-purple-50/50",
    activeBorder: "border-purple-500",
  },
  sand: {
    name: "Desert Sand",
    description: "Natural sandy tones with warmth",
    gradient: "from-orange-50 via-amber-50/30 to-orange-50",
    primary: "from-orange-600 to-amber-600",
    accent: "orange",
    cardBg: "bg-white/70",
    border: "border-orange-200",
    text: "text-orange-950",
    textMuted: "text-orange-700",
    textAccent: "text-orange-800",
    sliderThumb: "from-orange-500 to-amber-500",
    shadow: "shadow-orange-200/50",
    icon: "Sunrise",
    ring: "ring-orange-500/20",
    bgMuted: "bg-orange-50/50",
    activeBorder: "border-orange-500",
  },
  rose: {
    name: "Rose Garden",
    description: "Gentle rose with elegant touches",
    gradient: "from-rose-50 via-pink-50/30 to-rose-50",
    primary: "from-rose-600 to-pink-600",
    accent: "rose",
    cardBg: "bg-white/70",
    border: "border-rose-200",
    text: "text-rose-950",
    textMuted: "text-rose-700",
    textAccent: "text-rose-800",
    sliderThumb: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-200/50",
    icon: "Sparkles",
    ring: "ring-rose-500/20",
    bgMuted: "bg-rose-50/50",
    activeBorder: "border-rose-500",
  },
  dark: {
    name: "Midnight",
    description: "Deep and peaceful dark theme",
    gradient: "from-slate-950 via-slate-900 to-slate-950",
    primary: "from-emerald-500 to-teal-500",
    accent: "emerald",
    cardBg: "bg-slate-900/50",
    border: "border-slate-800",
    text: "text-slate-50",
    textMuted: "text-slate-400",
    textAccent: "text-emerald-400",
    sliderThumb: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-900/20",
    icon: "Moon",
    ring: "ring-emerald-500/20",
    bgMuted: "bg-slate-800/50",
    activeBorder: "border-emerald-500",
  },
};
