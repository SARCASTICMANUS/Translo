import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(tsMs: number): string {
  return new Date(tsMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatClock(tsMs: number): string {
  return formatTime(tsMs);
}