// Client-side demo store for customer feedback & suggestions, kept in
// localStorage so the client can submit and the owner dashboard can read it
// with no backend. Not for production.

export type DemoFeedback = {
  id: string;
  reference?: string; // related booking reference, if any
  customer_name: string;
  rating: number; // 1–5
  message: string;
  created_at: string;
};

const KEY = "yn_demo_feedback_v1";

function isoAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function seed(): DemoFeedback[] {
  return [
    {
      id: "fb-seed-1",
      reference: "YN-2R7CPL",
      customer_name: "Mariam Al Suwaidi",
      rating: 5,
      message: "Maria was wonderful with my daughter — punctual, warm and very professional.",
      created_at: isoAgo(180),
    },
    {
      id: "fb-seed-2",
      reference: "YN-5HD6MN",
      customer_name: "Layla Hassan",
      rating: 4,
      message: "Great experience overall. Would love more availability on weekend mornings.",
      created_at: isoAgo(1440),
    },
  ];
}

export function getDemoFeedback(): DemoFeedback[] {
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
    const parsed = JSON.parse(raw) as DemoFeedback[];
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

export function addDemoFeedback(f: DemoFeedback): DemoFeedback[] {
  const next = [f, ...getDemoFeedback()];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}
