import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Baby,
  CheckCircle2,
  Inbox,
  LayoutList,
  Menu,
  MessageCircle,
  MessageSquare,
  Search,
  Star,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  getDemoBookings,
  updateDemoBooking,
  type DemoBooking,
} from "@/lib/demo-bookings";
import { getDemoFeedback, type DemoFeedback } from "@/lib/demo-feedback";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

type View = "incoming" | "all" | "feedback";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function AdminDashboard() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [feedback, setFeedback] = useState<DemoFeedback[]>([]);
  const [view, setView] = useState<View>("incoming");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assignFor, setAssignFor] = useState<DemoBooking | null>(null);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    function refresh() {
      const data = getDemoBookings();
      setBookings(data);
      setFeedback(getDemoFeedback());
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
        ? `Confirmed · ${assignee ?? booking.nanny_name}`
        : `Booking ${booking.reference} declined`,
    );
  }

  const pending = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const hay = `${b.customer_name} ${b.booking_date} ${format(
        new Date(b.booking_date),
        "EEE d MMMM yyyy",
      )} ${b.emirate} ${b.reference}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, query]);

  function go(v: View) {
    setView(v);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border/60 p-4 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Baby className="h-4 w-4" />
                    </div>
                    Yalla Nanny
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-2">
                  <MenuItem
                    active={view === "incoming"}
                    icon={Inbox}
                    label="Incoming requests"
                    badge={pending.length || undefined}
                    onClick={() => go("incoming")}
                  />
                  <MenuItem
                    active={view === "all"}
                    icon={LayoutList}
                    label="All bookings"
                    badge={bookings.length || undefined}
                    onClick={() => go("all")}
                  />
                  <MenuItem
                    active={view === "feedback"}
                    icon={MessageSquare}
                    label="Feedback"
                    badge={feedback.length || undefined}
                    onClick={() => go("feedback")}
                  />
                </nav>
              </SheetContent>
            </Sheet>
            <div className="font-serif text-lg font-semibold">
              {view === "incoming"
                ? "Incoming requests"
                : view === "all"
                  ? "All bookings"
                  : "Client feedback"}
            </div>
          </div>
          {view === "incoming" && pending.length > 0 && (
            <Badge className="rounded-full bg-primary text-primary-foreground">{pending.length} new</Badge>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {view === "feedback" ? (
          feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {feedback.map((f) => (
                <FeedbackRow key={f.id} feedback={f} />
              ))}
            </div>
          )
        ) : view === "incoming" ? (
          pending.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {pending.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onAssign={() => setAssignFor(b)}
                  onDecline={() => setStatus(b, "declined")}
                />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or date…"
                className="h-11 pl-9"
              />
            </div>
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings match “{query}”.</p>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {searchResults.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    onAssign={() => setAssignFor(b)}
                    onDecline={() => setStatus(b, "declined")}
                  />
                ))}
              </div>
            )}
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

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 font-serif text-lg font-semibold">You&apos;re all caught up</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        No new requests right now. New bookings appear here automatically.
      </p>
    </div>
  );
}

function MenuItem({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" /> {label}
      </span>
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            active ? "bg-primary-foreground/20" : "bg-secondary",
          )}
        >
          {badge}
        </span>
      )}
    </button>
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
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{b.customer_name}</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {format(new Date(b.booking_date), "EEE d MMM")} · {b.start_time} · {b.duration_hours} hrs
            {" · "}
            {b.emirate}
          </div>
          <div className="truncate text-xs text-muted-foreground">{b.address}</div>
          {b.status === "confirmed" && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <UserCheck className="h-3.5 w-3.5" /> {b.nanny_name}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right text-sm font-semibold">AED {b.total}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
          <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full px-3 text-xs">
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

function FeedbackRow({ feedback: f }: { feedback: DemoFeedback }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-semibold">{f.customer_name}</span>
        <Stars value={f.rating} />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{f.message}</p>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {format(new Date(f.created_at), "d MMM yyyy")}
        {f.reference ? ` · Ref ${f.reference}` : ""}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= value ? "fill-primary text-primary" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}
