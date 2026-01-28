import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

type GlassTone = "default" | "brand";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ tone = "default", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-theme-card backdrop-blur-xl border border-theme-border rounded-xl sm:rounded-2xl transition-all duration-500 shadow-theme-primary",
          className
        )}
        {...props}
      />
    );
  }
);

GlassCard.displayName = "GlassCard";
