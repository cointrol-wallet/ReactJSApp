import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-border hover:bg-card",
      secondary: "bg-card text-foreground hover:bg-muted/20",
      ghost: "hover:bg-card",
    } as const;
    const sizes = {
      sm: "h-11 sm:h-8 px-3",
      md: "h-11 sm:h-9 px-4",
      lg: "h-11 sm:h-10 px-5",
      icon: "h-11 w-11 sm:h-9 sm:w-9 p-0",
    } as const;

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
