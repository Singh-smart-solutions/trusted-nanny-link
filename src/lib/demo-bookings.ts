// Client-side demo store for bookings. This powers the demo end-to-end without
// any backend auth: bookings are seeded with sample data and kept in
// localStorage, so the admin dashboard and "My bookings" work with zero Supabase
// configuration. Not for production — real data should come from the database.

export type DemoStatus = "pending" | "confirmed" | "declined";

export type DemoBooking = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  emirate: string;
  address: string;
  notes: string | null;
  booking_date: string; // yyyy-MM-dd
  start_time: string; // HH:mm
  duration_hours: number;
  kids: string;
  nanny_name: string;
  total: number;
  advance_paid: number;
  balance_due: number;
  status: DemoStatus;
  created_at: string;
};

const KEY = "yn_demo_bookings_v1";

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// A few realistic sample bookings so the dashboard and history always look
// populated, even before anyone makes a real booking during the demo.
function seed(): DemoBooking[] {
  return [
    {
      id: "seed-1",
      reference: "YN-8F3KQ2",
      customer_name: "Aisha Rahman",
      customer_phone: "+971 50 418 7723",
      emirate: "Dubai",
      address: "Villa 12, Street 4, Jumeirah 1",
      notes: "Two toddlers, halal-only snacks, cat in the home.",
      booking_date: ymd(1),
      start_time: "09:00",
      duration_hours: 4,
      kids: "2",
      nanny_name: "Verified Yalla Nanny",
      total: 231,
      advance_paid: 116,
      balance_due: 115,
      status: "pending",
      created_at: isoAgo(12),
    },
    {
      id: "seed-2",
      reference: "YN-2R7CPL",
      customer_name: "Mariam Al Suwaidi",
      customer_phone: "+971 55 902 3341",
      emirate: "Abu Dhabi",
      address: "Apt 1104, Al Reem Island, Marina Square",
      notes: null,
      booking_date: ymd(3),
      start_time: "17:00",
      duration_hours: 6,
      kids: "1",
      nanny_name: "Maria Santos",
      total: 346,
      advance_paid: 173,
      balance_due: 173,
      status: "confirmed",
      created_at: isoAgo(90),
    },
    {
      id: "seed-3",
      reference: "YN-9WQ1ZT",
      customer_name: "Sara Khan",
      customer_phone: "+971 52 771 8890",
      emirate: "Sharjah",
      address: "Villa 8, Al Majaz 2",
      notes: "Newborn, prefers experienced night nanny.",
      booking_date: ymd(5),
      start_time: "20:00",
      duration_hours: 8,
      kids: "1",
      nanny_name: "Verified Yalla Nanny",
      total: 462,
      advance_paid: 231,
      balance_due: 231,
      status: "pending",
      created_at: isoAgo(200),
    },
    {
      id: "seed-4",
      reference: "YN-5HD6MN",
      customer_name: "Layla Hassan",
      customer_phone: "+971 56 330 1245",
      emirate: "Dubai",
      address: "Townhouse 22, Arabian Ranches 2",
      notes: "Weekend playdate cover for 3 children.",
      booking_date: ymd(-2),
      start_time: "10:00",
      duration_hours: 3,
      kids: "3",
      nanny_name: "Grace Adeyemi",
      total: 173,
      advance_paid: 87,
      balance_due: 86,
      status: "confirmed",
      created_at: isoAgo(2880),
    },
  ];
}

export function getDemoBookings(): DemoBooking[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return seed();
  }
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  try {
    const parsed = JSON.parse(raw) as DemoBooking[];
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

export function addDemoBooking(b: DemoBooking): DemoBooking[] {
  const next = [b, ...getDemoBookings()];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function updateDemoBooking(id: string, patch: Partial<DemoBooking>): DemoBooking[] {
  const next = getDemoBookings().map((x) => (x.id === id ? { ...x, ...patch } : x));
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}
