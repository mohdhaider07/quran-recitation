import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type IconButtonVariant = "ghost" | "secondary" | "accent" | "danger";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: "text-white/40 hover:text-accent dark:hover:bg-accent/50",
  secondary:
    "bg-white/5 border border-white/10 text-white/60 dark:hover:bg-input/50 transition-colors",
  accent:
    "bg-primary/20 border border-primary/30 text-accent dark:hover:bg-primary/30 transition-colors",
  danger:
    "bg-red-500/20 text-red-400 border border-red-500/30 dark:hover:bg-red-500/30 transition-colors",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", className, type = "button", ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      variant="ghost"
      size="icon-sm"
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
);

IconButton.displayName = "IconButton";
