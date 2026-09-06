"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  onBack,
  backLabel = "Back",
  right,
  children,
  className,
}: {
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {

  return (
    <header
      className={cn(
        "flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2",
        className,
      )}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {children}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </header>
  );
}