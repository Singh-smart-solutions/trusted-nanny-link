import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Baby,
  CheckCircle2,
  MessageCircle,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [assignFor, setAssignFor] = useState<DemoBooking | null>(null);
  const seenIds = useRef<Set<string> | null>(null);

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
            toast(`New booking — ${b.customer_name}`, {
              description: `${b.emirate} · ${format(new Date(b.booking_date), "EEE d MMM")} at ${b.start_time}`,
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
    setBookings(updateDemoBooking(booking.id, patch));
    toast.success(
      status === "confirmed"
        ? `Booking ${booking.reference} confirmed${assignee ? ` · ${assignee}` : ""}`
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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
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

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
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

        {visibleBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter} bookings.</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {visibleBookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                onAssign={() => setAssignFor(b)}
                onDecline={() => setStatus(b, "declined")}
              />
            ))}
          </div>
        )}
      </main>

      <AssignDialog
        booking={assignFor}
        onClose={() => setAssignFor(null)}
        onConfirm={(name) => {
          if (assignFor) setStatus(assignFor, "confirmed", name);
          setAssignFor(null);
        }}
      />
    </div>
  );
}

function BookingRow({
  booking: b,
  onAssign,
  onDecline,
}: {
  booking: DemoBooking;
  onAssign: () => void;
  onDecline: () => void;
}) {
  const customerNumber = digitsOnly(b.customer_phone);
  const waLink = customerNumber
    ? `https://wa.me/${customerNumber}?text=${encodeURIComponent(
        `Hello ${b.customer_name}, this is Yalla Nanny regarding booking ${b.reference} on ${b.booking_date} at ${b.start_time}.`,
      )}`
    : null;

  return (
    <div className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{b.customer_name}</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {format(new Date(b.booking_date), "EEE d MMM")} · {b.start_time} · {b.duration_hours} hrs
            {" · "}
            {b.kids} {b.kids === "1" ? "child" : "kids"}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {b.emirate} — {b.address}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {b.customer_phone} · Ref {b.reference}
          </div>
          {b.status === "confirmed" && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <UserCheck className="h-3.5 w-3.5" /> {b.nanny_name}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold">AED {b.total}</div>
          <div className="text-[10px] text-muted-foreground">adv {b.advance_paid}</div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {b.status === "pending" && (
          <>
            <Button size="sm" onClick={onAssign} className="h-8 gap-1.5 rounded-full px-3 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; assign
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              className="h-8 gap-1.5 rounded-full px-3 text-xs"
            >
              <XCircle className="h-3.5 w-3.5" /> Decline
            </Button>
          </>
        )}
        {waLink && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function AssignDialog({
  booking,
  onClose,
  onConfirm,
}: {
  booking: DemoBooking | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    setName("");
  }, [booking]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter the name of the person to assign");
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <Dialog open={booking !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign this booking</DialogTitle>
          {booking && (
            <DialogDescription>
              {booking.customer_name} · {format(new Date(booking.booking_date), "EEE d MMM")} at{" "}
              {booking.start_time} · {booking.emirate}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-1">
          <Label className="mb-2 flex items-center gap-2 text-sm">
            <UserCheck className="h-4 w-4 text-primary" /> Assign to
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type the person's name, e.g. Maria Santos"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={submit} className="gap-2 rounded-full">
            <CheckCircle2 className="h-4 w-4" /> Confirm booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
