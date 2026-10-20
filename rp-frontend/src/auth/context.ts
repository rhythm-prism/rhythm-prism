import { createContext, useContext } from "react";
import type { UserDetailInfo } from "../types/user";

export interface AuthValue {
  user: UserDetailInfo | null;
  /** True until the initial session-restore request settles. */
  loading: boolean;
  /** Re-fetch the current user (call after a successful login). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
