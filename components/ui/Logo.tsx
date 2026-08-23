import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="text-xl font-bold tracking-[0.18em] uppercase">
        Translo
      </span>
      <span className="h-2 w-2 rounded-full bg-brand translate-y-[-2px]" />
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Translo home">
      {content}
    </Link>
  );
}
