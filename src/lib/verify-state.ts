// Client-side handoff between Join/Login and Verify Email (same tab only).
export type VerifyHandoff = {
  email: string;
  status?: "sent" | "not_configured" | "send_failed" | "rate_limited";
  cooldownSeconds?: number;
  devCode?: string;
  message?: string;
};
const KEY = "mk_verify";

export function saveVerify(v: VerifyHandoff) {
  sessionStorage.setItem(KEY, JSON.stringify(v));
}
export function readVerify(): VerifyHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VerifyHandoff) : null;
  } catch {
    return null;
  }
}
export function clearVerify() {
  sessionStorage.removeItem(KEY);
}
