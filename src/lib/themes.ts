export type ThemeKey = "mint";

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
};
