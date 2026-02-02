"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
}

interface ShadComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  width?: string;
}

export function ShadCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  className,
  triggerClassName,
}: ShadComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white/60 border-teal-100/80 hover:border-teal-400 hover:bg-white/80 focus:ring-teal-500/20 text-slate-700 font-normal",
            triggerClassName
          )}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-teal-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0 bg-white/95 backdrop-blur-xl border-teal-100 shadow-xl rounded-xl", className)}>
        <Command className="bg-transparent">
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <CommandEmpty className="py-2 text-center text-sm text-slate-500">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Command typically searches by "value" (content provided here), or use dedicated value prop if supported by shadcn implementation
                  onSelect={(currentValue) => {
                    // shadcn command returns lowercase label usually if value prop isn't strict
                    // But here we want the original ID.
                    // We can map back or ensure value matches label if simple.
                    // Better: standard approach is value={option.value} but ensure Shadcn Command works as expected.
                    // To be safe: onSelect passes the value prop of CommandItem if set, or text content.
                    // Let's pass option.value as value prop to CommandItem if the installed version supports it.
                    // Standard shadcn sets value to lowercase label by default if value prop missing.
                    // Let's rely on finding the option.
                    const matched = options.find(o => o.label.toLowerCase() === currentValue.toLowerCase()) || options.find(o => o.value === currentValue);
                    onValueChange(matched ? matched.value : currentValue);
                    setOpen(false);
                  }}
                  className="aria-selected:bg-teal-50 aria-selected:text-teal-900 cursor-pointer text-slate-700"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-teal-600",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
