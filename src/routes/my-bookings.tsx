import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Baby,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  UserCheck,
} from "lucide-react";

import { lookupBookings, type ClientBooking } from "@/lib/bookings.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Yalla Nanny" },
      {
        name: "description",
        content:
          "Look up your Yalla Nanny bookings by mobile number. See status and the nanny assigned to your confirmed sessions.",
      },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const [phone, setPhone] = useState("+971 ");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<ClientBooking[]>([]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 7) {
      toast.error("Enter the mobile number you booked with");
      return;
    }
    setBusy(true);
    try {
      const data = await lookupBookings({ data: phone });
      setResults(data);
      setSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load your bookings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
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

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Card>
          <CardContent className="p-5">
            <Label className="mb-2 flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-primary" /> Find your bookings
            </Label>
            <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 5X XXX XXXX"
                inputMode="tel"
                className="h-12 text-base"
              />
              <Button type="submit" disabled={busy} className="h-12 gap-2 rounded-full sm:w-auto">
                <Search className="h-4 w-4" /> {busy ? "Searching…" : "View my bookings"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter the mobile number you used when booking to see your status and assigned nanny.
            </p>
          </CardContent>
        </Card>

        {searched && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No bookings found for that mobile number. Double-check the number, or make a new booking.
          </p>
        )}

        <div className="space-y-4">
          {results.map((b) => (
            <ClientBookingCard key={b.reference} booking={b} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ClientBookingCard({ booking: b }: { booking: ClientBooking }) {
  const end = addHoursToTime(b.start_time, b.duration_hours);
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
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <div className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Booking confirmed
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>
                Your nanny: <span className="font-semibold">{b.nanny_name}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.nanny_name} will arrive on {format(new Date(b.booking_date), "EEE d MMM")} at{" "}
              {b.start_time}. Balance of AED {b.balance_due} is payable at the end of the session.
            </p>
          </div>
        )}
        {b.status === "pending" && (
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            Awaiting confirmation. We&apos;ll assign your nanny shortly and confirm the details.
          </p>
        )}
        {b.status === "declined" && (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            This booking could not be fulfilled. Please make a new booking or contact support.
          </p>
        )}

        <Separator className="my-4" />

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Row icon={CalendarDays} text={format(new Date(b.booking_date), "EEE d MMM yyyy")} />
          <Row
            icon={Clock}
            text={`${b.start_time} – ${end} · ${b.duration_hours} hrs · ${b.kids} ${b.kids === "1" ? "child" : "children"}`}
          />
          <Row icon={MapPin} text={`${b.emirate} — ${b.address}`} />
        </div>
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

function addHoursToTime(start: string, hours: number) {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor((total / 60) % 24);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}
