import { cn } from "@/lib/utils";

const BAR_COUNT = 16;

/**
 * Live waveform. Speaking = tall, fast emerald bars; listening = calmer
 * slate trace; idle = near-flat waiting trace. Muted dims whatever mode is
 * active so the worker can always tell their mic state.
 */
export function Waveform({
  mode,
  muted = false,
  className,
}: {
  mode: "idle" | "listening" | "speaking";
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-8 items-center gap-[3px]",
        mode === "speaking" && "wave-speaking text-accent",
        mode === "listening" && "wave-listening text-muted",
        mode === "idle" && "text-faint",
        muted && "opacity-40",
        className,
      )}
    >
      {Array.from({ length: BAR_COUNT }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "wave-bar",
            mode === "idle" && "animate-vpulse",
            // Idle bars stay short; their animation drives a slow trace.
            mode === "idle" && "h-1.5",
          )}
          style={
            mode === "idle"
              ? { animationDelay: `${index * 90}ms` }
              : { animationDelay: `${(index * 137) % 400}ms` }
          }
        />
      ))}
    </span>
  );
}