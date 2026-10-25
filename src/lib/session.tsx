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

export async function loadMemberState(): Promise<{ user: User | null; state: MemberState; application: Application | null }> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { user: null, state: "visitor", application: null };
  if (!user.email_confirmed_at) return { user, state: "unverified", application: null };
  const [{ data: isAdmin }, { data: app }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.from("applications").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (isAdmin) return { user, state: "admin", application: app ?? null };
  if (!app) return { user, state: "unverified", application: null };
  const state = app.application_status === "Approved" ? "approved" : app.application_status === "Rejected" ? "rejected" : "pending";
  return { user, state, application: app };
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
