import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Baby, CheckCircle2, MessageSquarePlus, Star } from "lucide-react";
import { toast } from "sonner";

import { getDemoBookings, type DemoBooking } from "@/lib/demo-bookings";
import { addDemoFeedback } from "@/lib/demo-feedback";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my-bookings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Bookings — Yalla Nanny" },
      {
        name: "description",
        content:
          "See your Yalla Nanny bookings, their status, the assigned nanny, and leave feedback.",
      },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [reviewFor, setReviewFor] = useState<DemoBooking | null>(null);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
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
              <ClientBookingRow
                key={b.id}
                booking={b}
                submitted={submitted.has(b.id)}
                onReview={() => setReviewFor(b)}
              />
            ))}
          </div>
        )}
      </main>

      <FeedbackDialog
        booking={reviewFor}
        onClose={() => setReviewFor(null)}
        onSubmit={(rating, message) => {
          if (!reviewFor) return;
          addDemoFeedback({
            id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            reference: reviewFor.reference,
            customer_name: reviewFor.customer_name,
            rating,
            message,
            created_at: new Date().toISOString(),
          });
          setSubmitted((s) => new Set(s).add(reviewFor.id));
          setReviewFor(null);
          toast.success("Thanks for your feedback!");
        }}
      />
    </div>
  );
}

function ClientBookingRow({
  booking: b,
  submitted,
  onReview,
}: {
  booking: DemoBooking;
  submitted: boolean;
  onReview: () => void;
}) {
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

      <div className="mt-3">
        {submitted ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Feedback sent — thank you!
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onReview}
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Leave feedback
          </Button>
        )}
      </div>
    </div>
  );
}

function FeedbackDialog({
  booking,
  onClose,
  onSubmit,
}: {
  booking: DemoBooking | null;
  onClose: () => void;
  onSubmit: (rating: number, message: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRating(5);
    setMessage("");
  }, [booking]);

  return (
    <Dialog open={booking !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How was your experience?</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve the service{booking ? ` (Ref ${booking.reference})` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-2 block text-sm">Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-sm">Suggestions (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What went well, and how can we improve?"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(rating, message.trim() || "(No comment)")}
            className="rounded-full"
          >
            Submit feedback
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
