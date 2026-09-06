"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, PhoneCall } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguagePickerSheet } from "@/components/language-picker/LanguagePickerSheet";
import { getLanguage } from "@/lib/languages";
import { usePreferences } from "@/lib/prefs";
import { getOrder } from "@/lib/mock-data";

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [prefs, updatePrefs] = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);

  const order = getOrder(orderId);

  if (!order) {
    return (
      <AppShell>
        <PageHeader onBack={() => router.push("/")} />
        <section className="px-5 pt-6 text-center">
          <p className="text-sm text-muted">This order is no longer available.</p>
          <Button className="mt-4" fullWidth onClick={() => router.push("/")}>
            Back to orders
          </Button>
        </section>
      </AppShell>
    );
  }

  const customerLang = getLanguage(order.customerLanguage);
  const myLang = getLanguage(prefs.myLanguage);

  return (
    <AppShell>
      <PageHeader
        onBack={() => router.push("/")}
        right={<Logo className="scale-90" />}
      />

      <section className="flex flex-col gap-4 px-5 pt-2 pb-8">
        {/* Customer */}
        <Card className="flex items-center gap-4 p-5">
          <Avatar initials={order.customerInitials} tone="emerald" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold text-foreground">
              {order.customerName}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Order #{order.orderNumber} · ETA {order.etaMinutes} min
            </p>
          </div>
        </Card>

        {/* Delivery address */}
        <Card className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
              Delivery address
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {order.address}
            </p>
            <p className="mt-1 text-xs text-muted">
              {order.items.join(" · ")}
            </p>
          </div>
        </Card>

        {/* Languages */}
        <Card className="p-5">
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
                  Customer speaks
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {customerLang.flag} {customerLang.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground"
              >
                Change
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
                  You speak
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {myLang.flag} {myLang.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground"
              >
                Change
              </button>
            </div>
          </div>
        </Card>

        {/* Reassurance */}
        <p className="px-1 text-[13px] leading-relaxed text-muted">
          Translo calls {order.customerName} directly and translates your call
          live. They don&apos;t need to install anything — their phone just
          rings.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          fullWidth
          className="mt-2"
          onClick={() => router.push(`/call/${order.id}`)}
        >
          <PhoneCall className="h-5 w-5" />
          Call Customer
        </Button>
      </section>

      <LanguagePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={prefs.myLanguage}
        onSelect={(code) => updatePrefs({ myLanguage: code })}
      />
    </AppShell>
  );
}