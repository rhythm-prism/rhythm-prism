import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./context";
import type { UserDetailInfo } from "../types/user";
import { fetchCurrentUser, logout } from "../lib/auth";
import { AUTH_EXPIRED_EVENT } from "../lib/http";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser());
    } catch {
      // Backend unreachable (e.g. offline demo) — treat as logged out.
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    // Fired by authFetch when a refreshed session still 401s (refresh token expired too).
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // ignore network errors on logout
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
