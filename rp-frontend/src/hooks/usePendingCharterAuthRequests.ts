import { useEffect, useState } from "react";
import { fetchPendingCharterAuthRequests } from "../lib/api";
import type { CharterAuthRequestInfo } from "../types/charterAuth";

export interface PendingCharterAuthRequestsState {
  requests: CharterAuthRequestInfo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// A result is tied to the key it was fetched for, so `loading` is derived
// during render instead of being flipped inside the effect body.
interface Snapshot {
  key: number;
  requests: CharterAuthRequestInfo[];
  error: string | null;
}

/** Drives `GET /api/auth/charter/requests/pending` (every open application, oldest first). */
export function usePendingCharterAuthRequests(): PendingCharterAuthRequestsState {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPendingCharterAuthRequests(ctrl.signal)
      .then((requests) => setSnap({ key: reloadKey, requests, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSnap({
          key: reloadKey,
          requests: [],
          error: e instanceof Error ? e.message : "申請待ち一覧の取得に失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [reloadKey]);

  const fresh = snap !== null && snap.key === reloadKey;
  return {
    requests: fresh ? snap.requests : [],
    loading: !fresh,
    error: fresh ? snap.error : null,
    reload: () => setReloadKey((k) => k + 1),
  };
}
