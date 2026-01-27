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
  return (
    <Select value={String(value)} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "dark:bg-black/20 dark:border-white/10 dark:text-white",
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
          "dark:bg-slate-900 dark:border-white/10 dark:text-white max-h-[300px]",
          contentClassName
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            className="dark:focus:bg-primary/20 dark:focus:text-accent"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
