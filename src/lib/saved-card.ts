// Remembers a masked card in the browser so the remaining balance can be paid
// in one click. Demo only — never store real card numbers; here we keep just a
// brand + last 4 digits for display.

export type SavedCard = {
  brand: string;
  last4: string;
};

const KEY = "yn_saved_card_v1";

export function getSavedCard(): SavedCard | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedCard;
  } catch {
    return null;
  }
}

export function saveCard(c: SavedCard) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(c));
  }
}

export function clearSavedCard() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(KEY);
  }
}
