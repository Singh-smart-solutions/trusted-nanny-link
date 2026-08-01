import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Baby, CheckCircle2 } from "lucide-react";

import { getDemoBookings, type DemoBooking } from "@/lib/demo-bookings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-bookings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Bookings — Yalla Nanny" },
      {
        name: "description",
        content:
          "See your Yalla Nanny bookings, their status and the nanny assigned to your confirmed sessions.",
      },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);

  useEffect(() => {
    // Only the visitor's own bookings — not other customers' bookings.
    setBookings(getDemoBookings().filter((b) => b.mine));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Baby className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-semibold">My bookings</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Yalla Nanny · UAE
              </div>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Book again
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {bookings.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">You have no bookings yet.</p>
            <Button asChild className="mt-3 rounded-full">
              <Link to="/">Book a nanny</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {bookings.map((b) => (
              <ClientBookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ClientBookingRow({ booking: b }: { booking: DemoBooking }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">Ref {b.reference}</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {format(new Date(b.booking_date), "EEE d MMM")} · {b.start_time} · {b.duration_hours} hrs
            {" · "}
            {b.emirate}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm font-semibold">AED {b.total}</div>
      </div>

      {b.status === "confirmed" && (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed · Your nanny: {b.nanny_name}
        </div>
      )}
      {b.status === "pending" && (
        <div className="mt-2 text-xs text-muted-foreground">
          Awaiting confirmation — we&apos;ll assign your nanny shortly.
        </div>
      )}
      {b.status === "declined" && (
        <div className="mt-2 text-xs text-destructive">
          Not available — please try another time.
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full text-[10px] uppercase tracking-wide",
        status === "confirmed" && "bg-primary/15 text-primary",
        status === "declined" && "bg-destructive/10 text-destructive",
      )}
    >
      {status}
    </Badge>
  );
}
