import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Baby,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDemoBookings,
  updateDemoBooking,
  type DemoBooking,
} from "@/lib/demo-bookings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Yalla Nanny" },
      {
        name: "description",
        content:
          "Review incoming nanny bookings, confirm or decline them and assign a team member.",
      },
    ],
  }),
  component: AdminDashboard,
});

type Filter = "all" | "pending" | "confirmed" | "declined";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function AdminDashboard() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const seenIds = useRef<Set<string> | null>(null);

  // Load from the local demo store and keep it fresh so a booking made in
  // another tab shows up here (and pops a toast) within a few seconds.
  useEffect(() => {
    function refresh() {
      const data = getDemoBookings();
      setBookings(data);
      if (seenIds.current === null) {
        seenIds.current = new Set(data.map((b) => b.id));
      } else {
        for (const b of data) {
          if (seenIds.current.has(b.id)) continue;
          seenIds.current.add(b.id);
          if (b.status === "pending") {
            toast(`New booking request — ${b.customer_name}`, {
              description: `${b.emirate} · ${format(new Date(b.booking_date), "EEE d MMM")} at ${b.start_time} · ${b.address}`,
            });
          }
        }
      }
    }
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, []);

  function setStatus(booking: DemoBooking, status: "confirmed" | "declined", assignee?: string) {
    const patch: Partial<DemoBooking> = assignee ? { status, nanny_name: assignee } : { status };
    const next = updateDemoBooking(booking.id, patch);
    setBookings(next);
    toast.success(
      status === "confirmed"
        ? `Booking ${booking.reference} confirmed${assignee ? ` · assigned to ${assignee}` : ""}`
        : `Booking ${booking.reference} declined`,
    );
  }

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    declined: bookings.filter((b) => b.status === "declined").length,
  };
  const visibleBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Baby className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-semibold">Owner dashboard</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {counts.pending} pending {counts.pending === 1 ? "booking" : "bookings"}
              </div>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back to site
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" /> All bookings
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {([
              ["all", "All"],
              ["pending", "Pending"],
              ["confirmed", "Confirmed"],
              ["declined", "Declined"],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  filter === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {label} ({counts[key]})
              </button>
            ))}
          </div>
        </div>

        {bookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        )}
        {bookings.length > 0 && visibleBookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No {filter} bookings.</p>
        )}

        <div className="space-y-4">
          {visibleBookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onConfirm={(assignee) => setStatus(b, "confirmed", assignee)}
              onDecline={() => setStatus(b, "declined")}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function BookingCard({
  booking: b,
  onConfirm,
  onDecline,
}: {
  booking: DemoBooking;
  onConfirm: (assignee: string) => void;
  onDecline: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const customerNumber = digitsOnly(b.customer_phone);
  const message =
    `Hello ${b.customer_name}, this is Yalla Nanny regarding booking ${b.reference} ` +
    `on ${b.booking_date} at ${b.start_time} for ${b.duration_hours} hours in ${b.emirate}. ` +
    `Advance received: AED ${b.advance_paid}. Balance due: AED ${b.balance_due}.`;
  const customerLink = customerNumber
    ? `https://wa.me/${customerNumber}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold">{b.customer_name}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Ref {b.reference}</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-lg font-semibold">AED {b.total}</div>
            <div className="text-xs text-muted-foreground">
              Advance AED {b.advance_paid} · Balance AED {b.balance_due}
            </div>
          </div>
        </div>

        {b.status === "confirmed" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">
            <UserCheck className="h-4 w-4" /> Assigned to {b.nanny_name}
          </div>
        )}
        {b.notes && (
          <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{b.notes}</p>
        )}

        <Separator className="my-4" />

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Row icon={CalendarDays} text={format(new Date(b.booking_date), "EEE d MMM yyyy")} />
          <Row
            icon={Clock}
            text={`${b.start_time} · ${b.duration_hours} hrs · ${b.kids} ${b.kids === "1" ? "child" : "children"}`}
          />
          <Row icon={MapPin} text={`${b.emirate} — ${b.address}`} />
          <Row icon={Phone} text={b.customer_phone} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {b.status === "pending" && (
            <>
              <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-2 rounded-full">
                <CheckCircle2 className="h-4 w-4" /> Accept &amp; assign
              </Button>
              <Button size="sm" variant="outline" onClick={onDecline} className="gap-2 rounded-full">
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </>
          )}
          {customerLink && (
            <Button asChild size="sm" variant="secondary" className="gap-2 rounded-full">
              <a href={customerLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp family
              </a>
            </Button>
          )}
        </div>

        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign this booking</DialogTitle>
              <DialogDescription>
                Choose the team member for {b.customer_name}&apos;s booking on{" "}
                {format(new Date(b.booking_date), "EEE d MMM")} at {b.start_time} in {b.emirate}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-1">
              <Label className="mb-2 flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-primary" /> Assign to
              </Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Type the person's name, e.g. Maria Santos"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && assignee.trim()) {
                    onConfirm(assignee.trim());
                    setAssignOpen(false);
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const name = assignee.trim();
                  if (!name) {
                    toast.error("Enter the name of the person to assign");
                    return;
                  }
                  onConfirm(name);
                  setAssignOpen(false);
                }}
                className="gap-2 rounded-full"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Row({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="text-muted-foreground">{text}</span>
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
