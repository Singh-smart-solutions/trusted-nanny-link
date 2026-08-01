import { createServerFn } from "@tanstack/react-start";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

// The subset of a booking that is safe to show a customer looking up their own
// bookings by phone number.
export type ClientBooking = {
  reference: string;
  customer_name: string;
  emirate: string;
  address: string;
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

/**
 * Public lookup: returns the bookings that match a given phone number. Runs on
 * the server with the service role because bookings are owner-only under RLS.
 * Demo note: anyone who enters a matching phone can see those bookings — before
 * production, gate this behind a real customer login or a one-time code.
 */
export const lookupBookings = createServerFn({ method: "POST" })
  .validator((phone: unknown) => String(phone ?? ""))
  .handler(async ({ data }): Promise<ClientBooking[]> => {
    const phone = digitsOnly(data);
    if (phone.length < 7) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "reference, customer_name, customer_phone, emirate, address, booking_date, start_time, duration_hours, kids, nanny_name, total, advance_paid, balance_due, status, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (rows ?? [])
      .filter((r) => {
        const stored = digitsOnly(r.customer_phone ?? "");
        return stored.length >= 7 && (stored.endsWith(phone) || phone.endsWith(stored));
      })
      .map((r) => ({
        reference: r.reference,
        customer_name: r.customer_name,
        emirate: r.emirate,
        address: r.address,
        booking_date: r.booking_date,
        start_time: r.start_time,
        duration_hours: r.duration_hours,
        kids: r.kids,
        nanny_name: r.nanny_name,
        total: r.total,
        advance_paid: r.advance_paid,
        balance_due: r.balance_due,
        status: r.status,
        created_at: r.created_at,
      }));
  });
