import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The first account that signs in becomes the owner. Every later account is a
 * normal (non-owner) user until an existing owner grants access.
 */
export const claimOwnerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");
    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      return { isOwner: existing.some((r) => r.user_id === context.userId) };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "owner" });
    if (error) throw error;

    return { isOwner: true };
  });
