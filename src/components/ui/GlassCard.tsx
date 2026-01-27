import React from "react";
import { cn } from "@/lib/utils";

type GlassTone = "default" | "brand";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ tone = "default", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 shadow-glass",
        tone === "brand" && "shadow-glass-brand",
        className
      )}
      {...props}
    />
  )
);

GlassCard.displayName = "GlassCard";
