import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { format, addDays, parse, startOfDay } from "date-fns";
import {
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Baby,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { addDemoBooking } from "@/lib/demo-bookings";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book a Nanny in the UAE — Yalla Nanny" },
      { name: "description", content: "Trusted, insured nannies across Dubai, Abu Dhabi & Sharjah. Book by the hour. Confirm with a 50% advance in AED." },
      { property: "og:title", content: "Book a Nanny in the UAE — Yalla Nanny" },
      { property: "og:description", content: "Trusted, insured nannies across Dubai, Abu Dhabi & Sharjah. Book by the hour. Confirm with a 50% advance in AED." },
    ],
  }),
  component: BookingPage,
});

type Nanny = {
  name: string;
  rate: number; // AED/hour
};

// Guests don't pick a profile — we assign the best available verified nanny.
const HOUSE_NANNY: Nanny = {
  name: "Verified Yalla Nanny",
  rate: 55,
};


const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

const TIME_SLOTS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00",
];

const DURATIONS = [2, 3, 4, 6, 8, 10];

type Step = 0 | 1 | 2 | 3 | 4;

function BookingPage() {
  const [step, setStep] = useState<Step>(0);
  const nanny = HOUSE_NANNY;
  const [date, setDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState<string>("09:00");
  const [duration, setDuration] = useState<number>(4);
  const [kids, setKids] = useState<string>("1");
  const [emirate, setEmirate] = useState<string>("Dubai");
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("+971 ");
  const [payMethod, setPayMethod] = useState<"card" | "applepay" | "tabby">("card");
  const [processing, setProcessing] = useState(false);
  const [bookingRef, setBookingRef] = useState<string>("");

  
  const subtotal = nanny.rate * duration;
  const vat = Math.round(subtotal * 0.05);
  const total = subtotal + vat;
  const advance = Math.round(total * 0.5);
  const balance = total - advance;

  function next() {
    
    if (step === 1 && (!date || !startTime || !duration)) return toast.error("Please pick date, time and duration");
    if (step === 2) {
      if (!name.trim()) return toast.error("Please enter your name");
      if (phone.replace(/\D/g, "").length < 9) return toast.error("Please enter a valid UAE phone");
      if (!address.trim()) return toast.error("Please enter your address");
    }
    setStep((s) => Math.min(4, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(0, s - 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay() {
    setProcessing(true);
    const ref = "YN-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      // Save to the local demo store so the booking shows up in the owner
      // dashboard and "My bookings" without any backend login.
      addDemoBooking({
        id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        reference: ref,
        customer_name: name.trim().slice(0, 100) || "Guest",
        customer_phone: phone.trim().slice(0, 30),
        emirate,
        address: address.trim().slice(0, 300),
        notes: notes.trim().slice(0, 500) || null,
        booking_date: date,
        start_time: startTime,
        duration_hours: duration,
        kids,
        nanny_name: nanny.name,
        total,
        advance_paid: advance,
        balance_due: balance,
        status: "pending",
        created_at: new Date().toISOString(),
        mine: true,
      });

      // Best-effort persistence to Supabase; the demo works even if it fails.
      try {
        await supabase.from("bookings").insert({
          reference: ref,
          customer_name: name.trim().slice(0, 100),
          customer_phone: phone.trim().slice(0, 30),
          emirate,
          address: address.trim().slice(0, 300),
          notes: notes.trim().slice(0, 500) || null,
          booking_date: date,
          start_time: startTime,
          duration_hours: duration,
          kids,
          nanny_name: nanny.name,
          hourly_rate: nanny.rate,
          subtotal,
          vat,
          total,
          advance_paid: advance,
          balance_due: balance,
        });
      } catch {
        // ignore — demo store already has the booking
      }

      setBookingRef(ref);
      setStep(4);
      toast.success(`Advance of AED ${advance} received`, {
        description: `Booking ${ref} sent to the team for confirmation`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setProcessing(false);
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:pt-10">
        {step > 0 && step < 4 && <Stepper step={step} />}

        <div className={cn("mt-6 grid gap-6", step > 0 && step < 4 && "md:grid-cols-[1fr_360px]")}>
          <div>
            {step === 0 && <Landing onStart={() => setStep(1)} />}

            {step === 1 && (
              <StepWhen
                date={date}
                setDate={setDate}
                startTime={startTime}
                setStartTime={setStartTime}
                duration={duration}
                setDuration={setDuration}
                kids={kids}
                setKids={setKids}
              />
            )}
            {step === 2 && (
              <StepDetails
                emirate={emirate}
                setEmirate={setEmirate}
                address={address}
                setAddress={setAddress}
                notes={notes}
                setNotes={setNotes}
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
              />
            )}
            {step === 3 && (
              <StepPayment
                payMethod={payMethod}
                setPayMethod={setPayMethod}
                advance={advance}
                balance={balance}
                processing={processing}
                onPay={pay}
              />
            )}
            {step === 4 && (
              <Confirmation
                bookingRef={bookingRef}
                nanny={nanny}
                date={date}
                startTime={startTime}
                duration={duration}
                emirate={emirate}
                address={address}
                advance={advance}
                balance={balance}
                onNew={() => {
                  setStep(0);
                  setBookingRef("");
                }}
              />
            )}

            {step > 0 && step < 3 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={next} size="lg" className="gap-2 rounded-full px-6">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {step === 3 && (
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              </div>
            )}
          </div>

          {step > 0 && step < 4 && (
            <Summary
              nanny={nanny}
              date={date}
              startTime={startTime}
              duration={duration}
              emirate={emirate}
              subtotal={subtotal}
              vat={vat}
              total={total}
              advance={advance}
              balance={balance}
            />
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Baby className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold">Yalla Nanny</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">UAE · By the hour</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1 md:inline-flex"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> KHDA verified</span>
          <span className="hidden items-center gap-1 md:inline-flex"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Insured sessions</span>
          <span className="hidden items-center gap-1 md:inline-flex"><Phone className="h-3.5 w-3.5 text-primary" /> 800-NANNY</span>
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <CalendarDays className="h-3.5 w-3.5 text-primary" /> My bookings
          </Link>
        </div>
      </div>
    </header>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["When", "Details", "Payment"];
  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-xs">
      {labels.map((label, i) => {
        const active = i === step - 1;
        const done = i < step - 1;

        return (
          <li key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 whitespace-nowrap",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary/40 bg-primary/10 text-primary",
                !active && !done && "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold",
                  active && "bg-primary-foreground text-primary",
                  done && "bg-primary text-primary-foreground",
                  !active && !done && "bg-muted",
                )}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {label}
            </div>
            {i < labels.length - 1 && <div className="h-px w-4 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto max-w-2xl py-6 text-center md:py-14">
      <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
        <Sparkles className="mr-1 h-3.5 w-3.5 text-[color:var(--gold)]" /> Trusted childcare across the UAE
      </Badge>
      <h1 className="mt-5 font-serif text-4xl font-semibold md:text-5xl">
        Book a nanny, by the hour
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
        Tell us when you need care and we'll assign a background-checked, first-aid trained
        and insured nanny. Confirm with a 50% advance in AED.
      </p>

      <Button
        size="lg"
        onClick={onStart}
        className="mt-7 gap-2 rounded-full px-8 shadow-lg shadow-primary/20"
      >
        <Baby className="h-5 w-5" /> Book a Nanny
      </Button>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Vetted & insured", text: "Background checks and DHA first-aid training." },
          { icon: Clock, title: "From 2 hours", text: "Daytime, evenings and weekends across all emirates." },
          { icon: Star, title: "AED 55 / hour", text: "Flat, transparent pricing. 5% VAT included at checkout." },
        ].map((f) => (
          <Card key={f.title} className="border-border bg-card">
            <CardContent className="p-4 text-left">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-2 text-sm font-semibold">{f.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}


function StepWhen(props: {
  date: string; setDate: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  duration: number; setDuration: (v: number) => void;
  kids: string; setKids: (v: string) => void;
}) {
  const { date, setDate, startTime, setStartTime, duration, setDuration, kids, setKids } = props;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedDate = date ? parse(date, "yyyy-MM-dd", new Date()) : undefined;
  const isPresetTime = TIME_SLOTS.includes(startTime);
  return (
    <section>
      <SectionHeader
        eyebrow="Step 1"
        title="When do you need us?"
        subtitle="Sessions start from 2 hours. Minimum 4-hour advance booking recommended."
      />

      <div className="mt-5 space-y-6">
        <div>
          <Label className="mb-2 flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-primary" /> Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-12 w-full justify-start gap-2 text-left text-base font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                {selectedDate ? format(selectedDate, "EEE, d MMM yyyy") : "Select a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={(d) => {
                  if (d) setDate(format(d, "yyyy-MM-dd"));
                  setCalendarOpen(false);
                }}
                disabled={{ before: startOfDay(new Date()) }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="mb-2 flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" /> Start time</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={isPresetTime ? startTime : ""} onValueChange={setStartTime}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Enter a custom start time"
              className="h-12 text-base"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pick a slot from the list, or tap the clock to enter your own time.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm">Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((h) => {
                const active = h === duration;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDuration(h)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {h} hrs
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-sm">Number of children</Label>
            <Select value={kids} onValueChange={setKids}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4+"].map((k) => (
                  <SelectItem key={k} value={k}>{k} {k === "1" ? "child" : "children"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepDetails(props: {
  emirate: string; setEmirate: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}) {
  const { emirate, setEmirate, address, setAddress, notes, setNotes, name, setName, phone, setPhone } = props;
  return (
    <section>
      <SectionHeader
        eyebrow="Step 2"
        title="Where & who"
        subtitle="We share your address with the nanny only after payment is confirmed."
      />
      <div className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm">Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara Al Marzooqi" />
          </div>
          <div>
            <Label className="mb-2 block text-sm">Mobile (UAE)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 5X XXX XXXX" inputMode="tel" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            <Label className="mb-2 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" /> Emirate</Label>
            <Select value={emirate} onValueChange={setEmirate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMIRATES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-sm">Building / Villa & Area</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Marina Gate 2, Apt 1204, Dubai Marina" />
          </div>
        </div>
        <div>
          <Label className="mb-2 block text-sm">Notes for the nanny (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, nap schedule, preferred activities, halal-only meals, pets in home…"
            rows={4}
          />
        </div>
      </div>
    </section>
  );
}

function StepPayment(props: {
  payMethod: "card" | "applepay" | "tabby";
  setPayMethod: (v: "card" | "applepay" | "tabby") => void;
  advance: number;
  balance: number;
  processing: boolean;
  onPay: () => void;
}) {
  const { payMethod, setPayMethod, advance, balance, processing, onPay } = props;
  return (
    <section>
      <SectionHeader
        eyebrow="Step 3"
        title="Secure 50% advance"
        subtitle="Pay half now to confirm your booking. The remaining balance is paid to the nanny at the end of the session."
      />

      <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary/80">Pay now to confirm</div>
            <div className="mt-1 font-serif text-3xl font-semibold text-primary">AED {advance}</div>
            <div className="mt-1 text-xs text-muted-foreground">Balance of AED {balance} due after session</div>
          </div>
          <div className="hidden shrink-0 rounded-full bg-primary/10 p-3 text-primary sm:block">
            <Lock className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Label className="mb-2 block text-sm">Payment method</Label>
        <RadioGroup value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)} className="grid gap-2">
          {[
            { v: "card", label: "Credit / Debit card", hint: "Visa, Mastercard — 3D Secure" },
            { v: "applepay", label: "Apple Pay", hint: "Fastest checkout" },
            { v: "tabby", label: "Tabby — Split in 4", hint: "0% interest, popular in UAE" },
          ].map((opt) => (
            <label
              key={opt.v}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-xl border bg-card p-3 transition-colors",
                payMethod === opt.v ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-secondary",
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={opt.v} id={opt.v} />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.hint}</div>
                </div>
              </div>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </label>
          ))}
        </RadioGroup>
      </div>

      {payMethod === "card" && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <Label className="mb-1.5 block text-xs">Card number</Label>
            <Input placeholder="4242 4242 4242 4242" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Expiry</Label>
              <Input placeholder="MM / YY" inputMode="numeric" />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">CVC</Label>
              <Input placeholder="123" inputMode="numeric" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Name on card</Label>
            <Input placeholder="As shown on card" />
          </div>
        </div>
      )}

      <Button
        onClick={onPay}
        disabled={processing}
        size="lg"
        className="mt-5 w-full gap-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
      >
        {processing ? (
          <>
            <Sparkles className="h-4 w-4 animate-pulse" /> Confirming your booking…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Pay AED {advance} & Confirm
          </>
        )}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Payments are secured & PCI-DSS compliant. Prices include 5% VAT.
      </p>
    </section>
  );
}

function Confirmation(props: {
  bookingRef: string;
  nanny: Nanny;
  date: string;
  startTime: string;
  duration: number;
  emirate: string;
  address: string;
  advance: number;
  balance: number;
  onNew: () => void;
}) {
  const { bookingRef, nanny, date, startTime, duration, emirate, address, advance, balance, onNew } = props;
  const end = addHoursToTime(startTime, duration);
  return (
    <section className="mx-auto max-w-xl text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-5 font-serif text-3xl font-semibold">Booking confirmed!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your advance of <span className="font-semibold text-foreground">AED {advance}</span> has been received.
        {" "}A WhatsApp confirmation is on its way.
      </p>

      <Card className="mt-6 overflow-hidden border-border bg-card text-left">
        <div className="flex items-center justify-between border-b border-dashed border-border bg-secondary/50 px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Booking reference</div>
            <div className="font-mono text-sm font-semibold">{bookingRef}</div>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Confirmed</Badge>
        </div>
        <CardContent className="space-y-3 p-5 text-sm">
          <Row label="Nanny" value={nanny.name} />
          <Row label="Date" value={format(new Date(date), "EEE, d MMM yyyy")} />
          <Row label="Time" value={`${startTime} – ${end} (${duration} hrs)`} />
          <Row label="Location" value={`${address || "Address on file"}, ${emirate}`} />
          <Separator />
          <Row label="Paid today (50%)" value={`AED ${advance}`} strong />
          <Row label="Balance due after session" value={`AED ${balance}`} muted />
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button className="w-full rounded-full sm:w-auto" size="lg" onClick={onNew}>
          Book another session
        </Button>
        <p className="text-xs text-muted-foreground">Need to change plans? Free cancellation up to 6 hours before start.</p>
      </div>
    </section>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", strong && "font-semibold", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function Summary(props: {
  nanny: Nanny;
  date: string;
  startTime: string;
  duration: number;
  emirate: string;
  subtotal: number;
  vat: number;
  total: number;
  advance: number;
  balance: number;
}) {
  const { nanny, date, startTime, duration, emirate, subtotal, vat, total, advance, balance } = props;
  const end = addHoursToTime(startTime, duration);
  return (
    <aside className="md:sticky md:top-4 md:self-start">
      <Card className="overflow-hidden border-border bg-card">
        <div className="bg-gradient-to-br from-primary to-[oklch(0.32_0.06_165)] px-5 py-4 text-primary-foreground">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Your booking</div>
          <div className="mt-1 font-serif text-lg font-semibold">{nanny.name}</div>
          <div className="text-xs opacity-80">AED {nanny.rate}/hr · {duration} hours</div>
        </div>
        <CardContent className="space-y-3 p-5 text-sm">
          <Row label="Date" value={format(new Date(date), "EEE, d MMM")} />
          <Row label="Time" value={`${startTime} – ${end}`} />
          <Row label="Emirate" value={emirate} />
          <Separator />
          <Row label="Subtotal" value={`AED ${subtotal}`} />
          <Row label="VAT (5%)" value={`AED ${vat}`} muted />
          <Row label="Total" value={`AED ${total}`} strong />
          <div className="rounded-xl bg-primary/5 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary">Pay now (50%)</span>
              <span className="font-serif text-lg font-semibold text-primary">AED {advance}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Balance after session</span>
              <span>AED {balance}</span>
            </div>
          </div>
          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Free cancellation up to 6 hours before start.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-primary/70">{eyebrow}</div>
      <h2 className="mt-1 font-serif text-2xl font-semibold md:text-3xl">{title}</h2>
      <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} Yalla Nanny FZ-LLC · Dubai, UAE</div>
        <div className="flex items-center gap-4">
          <span>Trade Licence #123456</span>
          <span>support@yallananny.ae</span>
        </div>

      </div>
    </footer>
  );
}

function addHoursToTime(start: string, hours: number) {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const eh = Math.floor((total / 60) % 24);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function formatTimeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}
