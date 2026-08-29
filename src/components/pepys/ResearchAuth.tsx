import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Research controls mutate the experiment (cutoff, reveal condition, corpus,
 * personality). Those server functions require a signed-in researcher; this
 * panel is the front door for that session. The dashboard itself stays
 * readable without signing in.
 */
export function useResearchSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setEmail(session?.user?.email ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { email, signedIn: Boolean(email), ready };
}

export function ResearchAuthPanel({ email }: { email: string | null }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword(form)
          : await supabase.auth.signUp({
              ...form,
              options: { emailRedirectTo: `${window.location.origin}/research` },
            });
      if (error) throw error;
      if (mode === "signup") setNote("Account requested. Confirm the email, then sign in.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (email) {
    return (
      <div className="leaf flex items-center justify-between gap-3 p-4">
        <div>
          <p className="small-caps-label">Researcher</p>
          <p className="font-mono text-[11px] text-muted-foreground">{email}</p>
        </div>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-seal"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="leaf space-y-3 p-4">
      <div>
        <p className="small-caps-label">Researcher sign-in required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The dashboard below is readable by anyone. Changing the experiment — the historical
          cutoff, the identity-reveal condition, corpus ingestion, personality derivation — is
          restricted to a signed-in researcher.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="min-w-48 flex-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-[12px]"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="min-w-40 flex-1 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 font-mono text-[12px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-seal px-2.5 py-1.5 font-mono text-[11px] text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : mode === "signin" ? "Sign in" : "Request access"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-seal"
        >
          {mode === "signin" ? "New researcher" : "Have an account"}
        </button>
      </div>
      {note ? <p className="font-mono text-[11px] text-muted-foreground">{note}</p> : null}
    </form>
  );
}
