"use client";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"] });

export default function ThemeBody({ children }: { children: React.ReactNode }) {
  const { theme, themeKey } = useTheme();
  const isDark = (themeKey as string) === "dark";

  return (
    <body
      data-theme={themeKey}
      className={cn(
        outfit.className,
        "transition-all duration-700 min-h-screen bg-gradient-to-br bg-fixed bg-cover",
        theme.gradient,
        theme.text,
        isDark && "dark"
      )}
    >
      {children}
    </body>
  );
}
