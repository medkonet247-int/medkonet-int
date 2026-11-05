import { describe, expect, it, vi, beforeEach } from "vitest";

const authState = {
  getUserResults: [] as Array<{ data: { user: unknown }; error: unknown }>,
  session: null as unknown,
  rpcError: false,
  rpcErrorCount: 0,
  appError: false,
};

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "admin@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () => {
        const result = authState.getUserResults.shift() ?? { data: { user: null }, error: { message: "network" } };
        return Promise.resolve(result);
      },
      getSession: () => Promise.resolve({ data: { session: authState.session ? { user: authState.session } : null } }),
    },
    rpc: () => {
      if (authState.rpcError && authState.rpcErrorCount > 0) {
        authState.rpcErrorCount -= 1;
        return Promise.resolve({ data: null, error: { message: "network" } });
      }
      return Promise.resolve({ data: true, error: null });
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(authState.appError ? { data: null, error: { message: "network" } } : { data: null, error: null }),
        }),
      }),
    }),
  },
}));

import { loadMemberState } from "@/lib/session";

describe("loadMemberState resilience", () => {
  beforeEach(() => {
    authState.getUserResults = [];
    authState.session = null;
    authState.rpcError = false;
    authState.rpcErrorCount = 0;
    authState.appError = false;
  });

  it("returns visitor when there is no session at all", async () => {
    authState.getUserResults = [
      { data: { user: null }, error: null },
    ];
    const s = await loadMemberState();
    expect(s.state).toBe("visitor");
    expect(s.user).toBeNull();
  });

  it("recovers when the first getUser call fails transiently", async () => {
    authState.getUserResults = [
      { data: { user: null }, error: { message: "network" } },
      { data: { user }, error: null },
    ];
    const s = await loadMemberState();
    expect(s.state).toBe("admin");
    expect(s.user?.id).toBe(user.id);
  });

  it("falls back to the cached session when getUser keeps failing", async () => {
    authState.session = user;
    const s = await loadMemberState();
    expect(s.state).toBe("admin");
  });

  it("retries the role lookup once before giving up", async () => {
    authState.getUserResults = [{ data: { user }, error: null }];
    authState.rpcError = true;
    authState.rpcErrorCount = 1;
    const s = await loadMemberState();
    expect(s.state).toBe("admin");
  });

  it("throws when the role lookup fails on every attempt", async () => {
    authState.getUserResults = [{ data: { user }, error: null }];
    authState.rpcError = true;
    authState.rpcErrorCount = 99;
    await expect(loadMemberState()).rejects.toThrow("membership state unavailable");
  });
});
