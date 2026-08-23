"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "disabled:opacity-50 disabled:pointer-events-none",
          size === "md" && "px-5 h-11 text-sm",
          size === "lg" && "px-7 h-12 text-base",
          size === "icon" && "h-11 w-11",
          variant === "primary" &&
            "bg-brand text-white hover:bg-brand-strong active:scale-[0.98] shadow-sm",
          variant === "secondary" &&
            "bg-white text-foreground border border-line hover:border-ink-muted/40 active:scale-[0.98]",
          variant === "danger" &&
            "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
          variant === "ghost" &&
            "bg-transparent text-ink-muted hover:text-foreground hover:bg-black/[0.04]",
          className,
        )}
        {...props}
      />
    );
  },
);
