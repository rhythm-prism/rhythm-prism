const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** Dispatched on `window` when a refreshed session still comes back 401 — treat as logged out. */
export const AUTH_EXPIRED_EVENT = "auth:expired";

/** `POST /api/auth/refresh` — mints a new access token from the refresh cookie. */
async function refreshToken(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

/**
 * fetch() wrapper for cookie-authenticated endpoints. On a 401 (expired access
 * token) it retries once via POST /api/auth/refresh. If the retry also 401s
 * (the refresh token itself expired), it dispatches AUTH_EXPIRED_EVENT so
 * AuthProvider can clear the session, then returns the still-401 response.
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });

  let res = await send();
  if (res.status !== 401) return res;

  if (await refreshToken()) {
    res = await send();
  }
  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return res;
}