"use client";

import { useState } from "react";
import { Clock, MapPin, ChevronDown } from "lucide-react";
import type { Order } from "@/types";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface DetectedDetail {
  label: string;
  detail: string;
}

/**
 * Compact delivery context strip that expands into the full order details.
 * When a turn carries an AI-detected detail, a detection row mounts below
 * the header with a one-shot highlight animation (CSS-only, runs exactly once
 * on first mount) so the worker notices it landed without needing to expand.
 */
export function DeliveryContextCard({
  order,
  detected,
  live,
}: {
  order: Order;
  detected: DetectedDetail | null;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mx-4 overflow-hidden bg-surface/95">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {order.customerName} — {order.addressShort}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <Clock className="h-3 w-3" /> ETA {order.etaMinutes} min · Order #
            {order.orderNumber}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-faint transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* AI-detected detail — appears when detected, highlights once on mount */}
      {detected && (
        <div className="border-t border-line px-4 py-3 animate-highlight">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
            <MapPin className="h-3.5 w-3.5" /> Detected from conversation
          </p>
          <p className="mt-1.5 text-sm font-semibold text-foreground">
            📍 {detected.label}
          </p>
          <p className="mt-0.5 text-xs text-muted">{detected.detail}</p>
        </div>
      )}

      {open && (
        <div className="border-t border-line px-4 py-3 animate-fade-in">
          <p className="text-sm leading-relaxed text-foreground">
            {order.address}
          </p>
          <p className="mt-1 text-xs text-muted">{order.items.join(" · ")}</p>
          {live && (
            <p className="mt-2 text-[11px] uppercase tracking-widest text-faint">
              Delivery note may be saved when you confirm
            </p>
          )}
        </div>
      )}
    </Card>
  );
}