"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The phone-shaped app column. Placed behind every screen: tab pages scroll
 * naturally (with BottomNav sticky to the shell bottom), immersive screens
 * (call, order detail) pass `withNav={false}` and layout their own content.
 */
export function AppShell({
  children,
  withNav = false,
  className,
}: {
  children: React.ReactNode;
  withNav?: boolean;
  className?: string;
}) {
  return (
    <div className="app-stage">
      <div className={cn("app-shell", className)}>
        <div className="app-scroll">
          {children}
          {withNav && <BottomNav />}
        </div>
      </div>
    </div>
  );
}

function Tab({
  href,
  icon,
  label,
}: {
  href: string;
  icon: "orders" | "history" | "settings";
  label: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const Icon =
    icon === "orders" ? Package : icon === "history" ? History : Settings;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-accent" : "text-faint hover:text-muted",
        active && "bg-accent-soft",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 border-t border-line bg-[#0b1017]/85 backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 px-6 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <Tab href="/" icon="orders" label="Orders" />
        <Tab href="/history" icon="history" label="History" />
        <Tab href="/settings" icon="settings" label="Settings" />
      </div>
    </nav>
  );
}