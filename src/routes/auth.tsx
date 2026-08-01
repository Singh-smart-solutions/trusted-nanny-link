import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Baby, Lock, LogIn, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { claimOwnerRole } from "@/lib/owner.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Owner Login — Yalla Nanny" },
      { name: "description", content: "Owner sign-in for Yalla Nanny. Review incoming nanny bookings, confirm them and message families on WhatsApp." },
      { property: "og:title", content: "Owner Login — Yalla Nanny" },
      { property: "og:description", content: "Owner sign-in for Yalla Nanny. Review incoming nanny bookings and confirm them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Demo: open the dashboard directly, no login screen. The manual form is only
  // revealed if auto sign-in fails (e.g. Supabase settings not enabled yet).
  const [autoFailed, setAutoFailed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate({ to: "/owner", replace: true });
      } else {
        // Just opening the admin link signs the visitor in and opens the dashboard.
        demoLogin();
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo access: signs anyone in as an admin, no account to create. Every
  // signed-in visitor is granted the owner role (see claimOwnerRole).
  async function demoLogin() {
    setBusy(true);
    setAutoFailed(false);
    try {
      let signedIn = false;

      // Instant anonymous session — nothing to create, works for every visitor.
      const anon = await supabase.auth.signInAnonymously();
      if (!anon.error && anon.data.session) signedIn = true;

      // Fallback if anonymous sign-ins are disabled: a shared demo account.
      if (!signedIn) {
        const demoEmail = "demo-owner@yallananny.ae";
        const demoPassword = "demo-owner-1234";
        const signIn = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });
        if (!signIn.error && signIn.data.session) {
          signedIn = true;
        } else {
          const signUp = await supabase.auth.signUp({ email: demoEmail, password: demoPassword });
          if (!signUp.error && signUp.data.session) signedIn = true;
        }
      }

      if (!signedIn) {
        throw new Error(
          "Enable Anonymous sign-ins (or turn off email confirmation) in Supabase Auth settings to allow one-click demo access.",
        );
      }

      await claimOwnerRole();
      navigate({ to: "/owner", replace: true });
    } catch (err) {
      setAutoFailed(true);
      toast.error(err instanceof Error ? err.message : "Could not start the demo session");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter an email and a password of at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      await claimOwnerRole();
      navigate({ to: "/owner", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  // While auto sign-in is in progress, just show a loading screen — no form.
  if (!autoFailed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
            <Baby className="h-6 w-6" />
          </div>
          <h1 className="mt-3 font-serif text-2xl font-semibold">Opening admin dashboard…</h1>
          <p className="mt-1 text-sm text-muted-foreground">One moment while we sign you in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
            <Baby className="h-6 w-6" />
          </div>
          <h1 className="mt-3 font-serif text-2xl font-semibold">Owner access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to review and confirm incoming bookings.
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <Button
              type="button"
              onClick={demoLogin}
              disabled={busy}
              className="w-full gap-2 rounded-full"
            >
              <Sparkles className="h-4 w-4" />
              {busy ? "Please wait…" : "Log in to owner dashboard"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              One click — no account needed.
            </p>

            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or sign in with email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yallananny.ae"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
              <Button type="submit" className="w-full gap-2 rounded-full" disabled={busy}>
                {mode === "signup" ? <Lock className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {busy ? "Please wait…" : mode === "signup" ? "Create owner account" : "Sign in"}
              </Button>
            </form>

            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "First time? Create the owner account"
                : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo mode — anyone can open the admin dashboard for testing.
        </p>
      </div>
    </div>
  );
}
