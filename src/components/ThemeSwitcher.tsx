"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { setTheme } from "@/store/themeSlice";
import { themes, ThemeKey } from "@/lib/themes";
import { Sparkles, Sun, Cloud, Sunrise, Moon } from "lucide-react";

import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  Sparkles,
  Sun,
  Cloud,
  Sunrise,
  Moon,
};

export default function ThemeSwitcher() {
  const dispatch = useDispatch();
  const activeThemeKey = useSelector(
    (state: RootState) => state.theme.activeTheme
  );

  return (
    <div className="w-full max-w-6xl mx-auto mb-8 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(themes).map(([key, t]) => {
          const Icon = iconMap[t.icon] || Sparkles;
          const isActive = activeThemeKey === key;

          return (
            <button
              key={key}
              data-theme={key}
              onClick={() => dispatch(setTheme(key as ThemeKey))}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2",
                isActive
                  ? cn(
                      `bg-gradient-to-br ${t.gradient}`,
                      t.border,
                      "scale-105 shadow-xl",
                      t.shadow
                    )
                  : "bg-white/50 border-gray-200 hover:border-gray-300 hover:scale-102"
              )}
            >
              <Icon
                className={cn(
                  "w-8 h-8 mx-auto",
                  isActive ? t.textAccent : "text-gray-400"
                )}
              />
              <div
                className={cn(
                  "text-xs font-semibold",
                  isActive ? t.text : "text-gray-600"
                )}
              >
                {t.name.split(" ")[0]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
