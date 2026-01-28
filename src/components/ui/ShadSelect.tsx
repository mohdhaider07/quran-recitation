"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface ShadSelectProps {
  value: string | number;
  onValueChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
}

export function ShadSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  triggerClassName,
  contentClassName,
  icon,
}: ShadSelectProps) {
  const { theme } = useTheme();

  return (
    <Select value={String(value)} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "bg-theme-card border border-theme-border text-theme-text font-semibold focus:ring-4 ring-theme-ring transition-all duration-300",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2">
          {icon && <div className="shrink-0">{icon}</div>}
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent
        className={cn(
          "bg-theme-card/95 border border-theme-border text-theme-text backdrop-blur-3xl shadow-xl rounded-2xl",
          "max-h-75",
          contentClassName
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            className={cn(
              "focus:bg-linear-to-r focus:from-theme-primary-start focus:to-theme-primary-end focus:text-white cursor-pointer transition-all"
            )}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
