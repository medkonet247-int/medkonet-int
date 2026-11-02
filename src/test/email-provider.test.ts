import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BREVO_GATEWAY_URL,
  isEmailConfigured,
  resolveBrevoSendMode,
  sendEmail,
  type EmailMessage,
} from "@/lib/email/provider.server";

const MSG: EmailMessage = { to: "student@example.com", subject: "Test", html: "<p>Test</p>", text: "Test" };

const ENV_KEYS = ["LOVABLE_API_KEY", "BREVO_API_KEY", "EMAIL_PROVIDER_API_KEY", "API_KEY", "EMAIL_FROM"] as const;
const saved = new Map<string, string | undefined>();
beforeEachSnapshot();

function beforeEachSnapshot() {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
    saved.clear();
  });
}

function stage(key: string, value: string | undefined) {
  saved.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("Brevo email provider send mode", () => {
  it("prefers the connector gateway when both connector credentials exist", () => {
    stage("LOVABLE_API_KEY", "lovable-key");
    stage("BREVO_API_KEY", "lovc-connection-key");
    stage("EMAIL_PROVIDER_API_KEY", "direct-key");
    expect(resolveBrevoSendMode()).toEqual({ kind: "gateway", gatewayKey: "lovable-key", connectionKey: "lovc-connection-key" });
  });

  it("falls back to the direct Brevo key when no connector is linked", () => {
    stage("LOVABLE_API_KEY", "lovable-key");
    stage("BREVO_API_KEY", undefined);
    stage("EMAIL_PROVIDER_API_KEY", "direct-key");
    expect(resolveBrevoSendMode()).toEqual({ kind: "direct", apiKey: "direct-key" });
  });

  it("accepts API_KEY as the direct-key fallback", () => {
    stage("LOVABLE_API_KEY", undefined);
    stage("BREVO_API_KEY", undefined);
    stage("EMAIL_PROVIDER_API_KEY", undefined);
    stage("API_KEY", "fallback-key");
    expect(resolveBrevoSendMode()).toEqual({ kind: "direct", apiKey: "fallback-key" });
  });

  it("is unconfigured without credentials or sender", () => {
    stage("LOVABLE_API_KEY", undefined);
    stage("BREVO_API_KEY", undefined);
    stage("EMAIL_PROVIDER_API_KEY", undefined);
    stage("API_KEY", undefined);
    stage("EMAIL_FROM", undefined);
    expect(resolveBrevoSendMode()).toBeNull();
    expect(isEmailConfigured()).toBe(false);
  });

  it("still requires EMAIL_FROM when a send mode exists", () => {
    stage("EMAIL_PROVIDER_API_KEY", "direct-key");
    stage("EMAIL_FROM", undefined);
    expect(isEmailConfigured()).toBe(false);
    stage("EMAIL_FROM", "MedKonet Nigeria <noreply@example.com>");
    expect(isEmailConfigured()).toBe(true);
  });

  it("sends through the connector gateway with gateway headers", async () => {
    stage("LOVABLE_API_KEY", "lovable-key");
    stage("BREVO_API_KEY", "lovc-connection-key");
    stage("EMAIL_FROM", "MedKonet Nigeria <noreply@example.com>");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(MSG);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BREVO_GATEWAY_URL}/smtp/email`);
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer lovable-key");
    expect(headers.get("X-Connection-Api-Key")).toBe("lovc-connection-key");
    expect(headers.get("api-key")).toBeNull();
    const body = JSON.parse(String(init.body)) as { sender: { email: string; name?: string } };
    expect(body.sender.email).toBe("noreply@example.com");
  });

  it("sends direct with the api-key header and surfaces provider errors", async () => {
    stage("EMAIL_PROVIDER_API_KEY", "direct-key");
    stage("EMAIL_FROM", "MedKonet Nigeria <noreply@example.com>");
    const fetchMock = vi.fn(async () => new Response('{"code":"unauthorized","message":"Key not found"}', { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendEmail(MSG);
    expect(result).toEqual({ configured: true, sent: false, error: 'Brevo 401: {"code":"unauthorized","message":"Key not found"}' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    const headers = new Headers(init.headers);
    expect(headers.get("api-key")).toBe("direct-key");
    expect(headers.get("Authorization")).toBeNull();
  });
});
