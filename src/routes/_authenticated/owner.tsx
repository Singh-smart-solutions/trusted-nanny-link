import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Baby,
  CalendarDays,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { claimOwnerRole } from "@/lib/owner.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Team members a booking can be assigned to on acceptance.
const TEAM = [
  "Maria Santos",
  "Grace Adeyemi",
  "Anna Cruz",
  "Divya Nair",
  "Fatima Noor",
  "Jenny Rose",
];

type Filter = "all" | "pending" | "confirmed" | "declined";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Yalla Nanny" },
      { name: "description", content: "Review incoming nanny bookings, confirm or decline them and continue the conversation on WhatsApp." },
      { property: "og:title", content: "Owner Dashboard — Yalla Nanny" },
      { property: "og:description", content: "Review incoming nanny bookings, confirm them and message families on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwnerDashboard,
});

type Booking = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  emirate: string;
  address: string;
  notes: string | null;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  kids: string;
  nanny_name: string;
  total: number;
  advance_paid: number;
  balance_due: number;
  status: string;
  created_at: string;
};

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [whatsapp, setWhatsapp] = useState("");
  const [savingNumber, setSavingNumber] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    claimOwnerRole()
      .then(() => queryClient.invalidateQueries())
      .catch(() => {});
  }, [queryClient]);

  const bookingsQuery = useQuery({
    queryKey: ["owner-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
    refetchInterval: 8000,
  });

  // Announce brand-new booking requests as they arrive, with the client's details.
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const data = bookingsQuery.data;
    if (!data) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(data.map((b) => b.id));
      return;
    }
    for (const b of data) {
      if (seenIds.current.has(b.id)) continue;
      seenIds.current.add(b.id);
      toast(`New booking request — ${b.customer_name}`, {
        description: `${b.emirate} · ${format(new Date(b.booking_date), "EEE d MMM")} at ${b.start_time} · ${b.address}`,
      });
    }
  }, [bookingsQuery.data]);

  const settingsQuery = useQuery({
    queryKey: ["owner-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("id, whatsapp_number")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settingsQuery.data?.whatsapp_number) setWhatsapp(settingsQuery.data.whatsapp_number);
  }, [settingsQuery.data]);

  async function saveWhatsapp() {
    const clean = digitsOnly(whatsapp);
    if (clean.length < 9 || clean.length > 15) {
      toast.error("Enter a valid WhatsApp number with country code, e.g. +9715XXXXXXXX");
      return;
    }
    if (!settingsQuery.data?.id) return;
    setSavingNumber(true);
    const { error } = await supabase
      .from("owner_settings")
      .update({ whatsapp_number: clean })
      .eq("id", settingsQuery.data.id);
    setSavingNumber(false);
    if (error) return toast.error(error.message);
    toast.success("WhatsApp number saved");
    settingsQuery.refetch();
  }

  async function setStatus(booking: Booking, status: "confirmed" | "declined", assignee?: string) {
    const update = assignee ? { status, nanny_name: assignee } : { status };
    const { error } = await supabase.from("bookings").update(update).eq("id", booking.id);
    if (error) return toast.error(error.message);
    toast.success(
      status === "confirmed"
        ? `Booking ${booking.reference} confirmed${assignee ? ` · assigned to ${assignee}` : ""}`
        : `Booking ${booking.reference} declined`,
    );
    bookingsQuery.refetch();
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin", replace: true });
  }

  const ownerNumber = digitsOnly(settingsQuery.data?.whatsapp_number ?? "");
  const bookings = bookingsQuery.data ?? [];
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    declined: bookings.filter((b) => b.status === "declined").length,
  };
  const pending = counts.pending;
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
                {pending} pending {pending === 1 ? "booking" : "bookings"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Card>
          <CardContent className="p-5">
            <Label className="mb-2 flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-primary" /> Your WhatsApp number
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+971 5X XXX XXXX"
                inputMode="tel"
              />
              <Button onClick={saveWhatsapp} disabled={savingNumber} className="gap-2 rounded-full">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Used to open WhatsApp chats about bookings. Include the country code.
            </p>
          </CardContent>
        </Card>

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

        {bookingsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        )}
        {bookingsQuery.isError && (
          <p className="text-sm text-destructive">
            Could not load bookings. Make sure this account is the owner account.
          </p>
        )}
        {!bookingsQuery.isLoading && bookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        )}
        {!bookingsQuery.isLoading && bookings.length > 0 && visibleBookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No {filter} bookings.</p>
        )}

        <div className="space-y-4">
          {visibleBookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              ownerNumber={ownerNumber}
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
  ownerNumber,
  onConfirm,
  onDecline,
}: {
  booking: Booking;
  ownerNumber: string;
  onConfirm: (assignee: string) => void;
  onDecline: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState<string>(TEAM[0]);
  const customerNumber = digitsOnly(b.customer_phone);
  const message =
    `Hello ${b.customer_name}, this is Yalla Nanny regarding booking ${b.reference} ` +
    `on ${b.booking_date} at ${b.start_time} for ${b.duration_hours} hours in ${b.emirate}. ` +
    `Advance received: AED ${b.advance_paid}. Balance due: AED ${b.balance_due}.`;

  const customerLink = customerNumber
    ? `https://wa.me/${customerNumber}?text=${encodeURIComponent(message)}`
    : null;
  const ownLink = ownerNumber
    ? `https://wa.me/${ownerNumber}?text=${encodeURIComponent(`New booking ${b.reference}\n${message}\nAddress: ${b.address}`)}`
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

        <Separator className="my-4" />

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Row icon={CalendarDays} text={format(new Date(b.booking_date), "EEE d MMM yyyy")} />
          <Row icon={Clock} text={`${b.start_time} · ${b.duration_hours} hrs · ${b.kids} ${b.kids === "1" ? "child" : "children"}`} />
          <Row icon={MapPin} text={`${b.emirate} — ${b.address}`} />
          <Row icon={Phone} text={b.customer_phone} />
        </div>
        {b.status === "confirmed" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">
            <UserCheck className="h-4 w-4" /> Assigned to {b.nanny_name}
          </div>
        )}
        {b.notes && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{b.notes}</p>}

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
          {ownLink && (
            <Button asChild size="sm" variant="ghost" className="gap-2 rounded-full">
              <a href={ownLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Send to my WhatsApp
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
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm(assignee);
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
