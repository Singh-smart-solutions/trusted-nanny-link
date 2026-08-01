// Remembers a customer's contact/address details in the browser so repeat
// bookings can pre-fill them. Opt-in via the "Save my details" checkbox.

export type SavedClient = {
  name: string;
  phone: string;
  emirate: string;
  address: string;
};

const KEY = "yn_saved_client_v1";

export function getSavedClient(): SavedClient | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedClient;
  } catch {
    return null;
  }
}

export function saveClient(c: SavedClient) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(c));
  }
}

export function clearSavedClient() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(KEY);
  }
}
