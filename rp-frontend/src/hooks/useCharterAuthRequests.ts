import { useEffect, useState } from "react";
import { fetchCharterAuthRequests } from "../lib/api";
import type { CharterAuthRequestInfo } from "../types/charterAuth";

export interface CharterAuthRequestsState {
  requests: CharterAuthRequestInfo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// A result is tied to the key it was fetched for, so `loading` is derived
// during render instead of being flipped inside the effect body.
interface Snapshot {
  key: string;
  requests: CharterAuthRequestInfo[];
  error: string | null;
}

/** Drives `GET /api/auth/charter` for one user (newest application first). */
export function useCharterAuthRequests(userId: string): CharterAuthRequestsState {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${userId}:${reloadKey}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCharterAuthRequests(userId, ctrl.signal)
      .then((requests) => setSnap({ key, requests, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSnap({
          key,
          requests: [],
          error: e instanceof Error ? e.message : "申請状況の取得に失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [userId, key]);

  const fresh = snap !== null && snap.key === key;
  return {
    requests: fresh ? snap.requests : [],
    loading: !fresh,
    error: fresh ? snap.error : null,
    reload: () => setReloadKey((k) => k + 1),
  };
}
