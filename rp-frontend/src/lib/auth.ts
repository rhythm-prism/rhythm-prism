import type { UserDetailInfo } from "../types/user";
import { authFetch } from "./http";

// Auth is cookie-based (HttpOnly access/refresh tokens set by the backend),
// so every request must send credentials. JS never reads the tokens directly.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/**
 * Restores the session on load via `GET /api/login`. Returns the current user,
 * or null when unauthenticated (authFetch already retried once through
 * /api/auth/refresh on a 401 before giving up).
 */
export async function fetchCurrentUser(): Promise<UserDetailInfo | null> {
  const res = await authFetch("/api/login");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return (await res.json()) as UserDetailInfo;
}

/** `POST /api/logout` — clears the auth cookies server-side. */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
}

export interface SonolusLoginSession {
  auth_id: string;
  auth_url: string;
}

/** `POST /api/sonolus/login` — opens a Sonolus auth session to poll. */
export async function startSonolusLogin(): Promise<SonolusLoginSession> {
  const res = await fetch(`${API_BASE}/api/sonolus/login`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Sonolusログインの開始に失敗しました");
  return (await res.json()) as SonolusLoginSession;
}

/**
 * `GET /api/auth/status` — 202 while the Sonolus app hasn't confirmed yet,
 * 200 (and sets the access cookie) once authentication completes.
 */
export async function pollAuthStatus(authId: string): Promise<"pending" | "completed"> {
  const res = await fetch(
    `${API_BASE}/api/auth/status?auth_id=${encodeURIComponent(authId)}`,
    { credentials: "include" },
  );
  if (res.status === 202) return "pending";
  if (res.ok) return "completed";
  throw new Error(`認証状態の確認に失敗しました (${res.status})`);
}

/** Full-page redirect target for Discord OAuth login. */
export function discordLoginUrl(): string {
  return `${API_BASE}/api/discord/login`;
}

/** `GET /api/sonolus/link` — redirects to Sonolus external-login. Open in a new tab. */
export function sonolusLinkUrl(): string {
  return `${API_BASE}/api/sonolus/link`;
}
