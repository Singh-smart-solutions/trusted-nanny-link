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
import { cn } from "@/lib/utils";

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

  async function setStatus(booking: Booking, status: "confirmed" | "declined") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", booking.id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmed" ? `Booking ${booking.reference} confirmed` : `Booking ${booking.reference} declined`);
    bookingsQuery.refetch();
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const ownerNumber = digitsOnly(settingsQuery.data?.whatsapp_number ?? "");
  const bookings = bookingsQuery.data ?? [];
  const pending = bookings.filter((b) => b.status === "pending").length;

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

        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              ownerNumber={ownerNumber}
              onConfirm={() => setStatus(b, "confirmed")}
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
  onConfirm: () => void;
  onDecline: () => void;
}) {
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
        {b.notes && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{b.notes}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {b.status === "pending" && (
            <>
              <Button size="sm" onClick={onConfirm} className="gap-2 rounded-full">
                <CheckCircle2 className="h-4 w-4" /> Confirm booking
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
