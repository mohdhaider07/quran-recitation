import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

type IconButtonVariant = "ghost" | "secondary" | "accent" | "danger" | "brand";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", className, type = "button", ...props }, ref) => {
    const variantClasses: Record<IconButtonVariant, string> = {
      ghost:
        "text-theme-text-muted hover:text-theme-text-accent transition-colors",
      secondary:
        "bg-theme-card/50 border border-theme-border text-theme-text-muted hover:bg-theme-card transition-all",
      accent:
        "bg-linear-to-br from-theme-primary-start to-theme-primary-end text-white shadow-md hover:opacity-90 transition-all",
      danger:
        "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all",
      brand:
        "bg-linear-to-br from-theme-primary-start to-theme-primary-end text-white shadow-md transition-all",
    };

    return (
      <Button
        ref={ref}
        type={type}
        variant="ghost"
        size="icon-sm"
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    );
  }
);

IconButton.displayName = "IconButton";
