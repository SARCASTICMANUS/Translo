"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { ORDERS, WORKER_PERSONA } from "@/lib/mock-data";
import { getLanguage } from "@/lib/languages";

export function OrdersScreen() {
  const router = useRouter();

  return (
    <AppShell withNav>
      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-1">
        <Logo />
        <Avatar
          initials={WORKER_PERSONA.initials}
          className="h-9 w-9 text-xs"
        />
      </header>

      <section className="px-5 pt-4 pb-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Today&apos;s deliveries
        </h1>
        <p className="mt-1 text-sm text-muted">
          {ORDERS.length} orders ready on your route.
        </p>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-3 pb-6">
        {ORDERS.map((order) => {
          const customerLang = getLanguage(order.customerLanguage);
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => router.push(`/order/${order.id}`)}
              className="w-full text-left transition-transform active:scale-[0.99]"
            >
              <Card className="p-4 hover:border-line-strong">
                <div className="flex items-start gap-3">
                  <Avatar initials={order.customerInitials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {order.customerName}
                      </p>
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Order #{order.orderNumber}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-faint" />
                      <span className="truncate">{order.addressShort}</span>
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-faint" />
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
                  <span className="text-[11px] text-muted">
                    Speaks {customerLang.label}{" "}
                  </span>
                  {order.customerLanguage !== "hi" && (
                    <span className="bg-surface-raised rounded-full px-2 py-0.5 text-[11px] text-muted">
                      Translated by Translo
                    </span>
                  )}
                </div>
              </Card>
            </button>
          );
        })}
      </section>
    </AppShell>
  );
}