import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * DEMO MODE: every signed-in visitor is granted the owner role, so anyone can
 * open the admin dashboard for testing. This is intentionally open for the demo
 * — before going to production, restrict this to a real allow-list (e.g. only
 * the first account, or a fixed set of owner emails).
 */
export const claimOwnerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "owner" }, { onConflict: "user_id,role" });
    if (error) throw error;

    return { isOwner: true };
  });
