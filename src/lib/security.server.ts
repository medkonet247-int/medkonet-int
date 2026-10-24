import { getRequest } from "@tanstack/react-start/server";

/** Development mode: server-side env only. Off unless exactly "true". */
export function isDevMode(): boolean {
  return process.env["VERIFICATION_DEV_MODE"] === "true";
}

export function clientIp(): string {
  const h = getRequest()?.headers;
  return (
    h?.get("cf-connecting-ip") ||
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h?.get("x-real-ip") ||
    "unknown"
  );
}

export function requestOrigin(): string {
  const req = getRequest();
  const h = req?.headers;
  const origin = h?.get("origin");
  if (origin) return origin;
  const host = h?.get("x-forwarded-host") || h?.get("host");
  const proto = h?.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(req!.url).origin;
}

export function randomCode(): string {
  const buf = new Uint32Array(1);
  let n: number;
  // rejection sampling for uniform 0..9999
  do {
    crypto.getRandomValues(buf);
    n = buf[0] ?? 0;
  } while (n >= 4294960000);
  return String(n % 10000).padStart(4, "0");
}

export function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hmac(value: string): Promise<string> {
  const pepper = process.env["VERIFICATION_PEPPER"];
  if (!pepper) throw new Error("Server is missing VERIFICATION_PEPPER");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig), (x) => x.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
