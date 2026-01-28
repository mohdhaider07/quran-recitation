"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: "default" | "brand";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center group/slider",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 sm:h-2 w-full grow overflow-hidden rounded-full bg-theme-bg-muted transition-colors">
        <SliderPrimitive.Range className="absolute h-full bg-linear-to-r from-theme-primary-start to-theme-primary-end transition-all duration-150" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          "block h-6 w-6 sm:h-5 sm:w-5 rounded-full border-2 bg-white border-theme-border shadow-lg ring-offset-background transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-theme-accent/50",
          "disabled:pointer-events-none disabled:opacity-50",
          "hover:scale-110 active:scale-95",
          "opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 focus-visible:opacity-100 transition-opacity",
          "touch-manipulation cursor-grab active:cursor-grabbing"
        )}
      />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
