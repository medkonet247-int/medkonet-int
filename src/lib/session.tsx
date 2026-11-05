import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type MemberState = "visitor" | "unverified" | "pending" | "rejected" | "approved" | "admin";

type SessionValue = {
  loading: boolean;
  user: User | null;
  state: MemberState;
  application: Application | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

// Resolves the signed-in user without treating a transient network failure as a
// sign-out: retry once, then fall back to the locally cached session (which also
// refreshes an expired token). A genuinely missing/invalid session still returns null.
async function resolveUser(): Promise<User | null> {
  const first = await supabase.auth.getUser();
  if (!first.error && first.data.user) return first.data.user;
  const retry = await supabase.auth.getUser();
  if (!retry.error && retry.data.user) return retry.data.user;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

async function loadMemberStateOnce(user: User): Promise<{ user: User; state: MemberState; application: Application | null }> {
  const [{ error: roleError, data: isAdmin }, { error: appError, data: app }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.from("applications").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (roleError || appError) throw new Error("membership state unavailable");
  if (isAdmin) return { user, state: "admin", application: app ?? null };
  if (!app) return { user, state: "unverified", application: null };
  const state = app.application_status === "Approved" ? "approved" : app.application_status === "Rejected" ? "rejected" : "pending";
  return { user, state, application: app };
}

export async function loadMemberState(): Promise<{ user: User | null; state: MemberState; application: Application | null }> {
  const user = await resolveUser();
  if (!user) return { user: null, state: "visitor", application: null };
  if (!user.email_confirmed_at) return { user, state: "unverified", application: null };
  // Retry the role/application lookup once so a transient failure does not bounce a
  // signed-in user to the wrong screen; data access itself stays protected by RLS.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await loadMemberStateOnce(user);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("membership state unavailable");
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Omit<SessionValue, "refresh">>({
    loading: true,
    user: null,
    state: "visitor",
    application: null,
  });

  const refresh = useCallback(async () => {
    try {
      const s = await loadMemberState();
      setValue({ loading: false, ...s });
    } catch {
      setValue({ loading: false, user: null, state: "visitor", application: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  return <SessionContext.Provider value={{ ...value, refresh }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export function homeFor(state: MemberState): "/admin" | "/dashboard" | "/verify-email" | "/login" {
  if (state === "admin") return "/admin";
  if (state === "visitor") return "/login";
  if (state === "unverified") return "/verify-email";
  return "/dashboard";
}
