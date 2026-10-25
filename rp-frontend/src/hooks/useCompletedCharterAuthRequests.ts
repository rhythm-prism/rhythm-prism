import { useEffect, useState } from "react";
import { fetchCompletedCharterAuthRequests } from "../lib/api";
import type { CharterAuthRequestInfo } from "../types/charterAuth";

export interface CompletedCharterAuthRequestsState {
  requests: CharterAuthRequestInfo[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Snapshot {
  key: number;
  requests: CharterAuthRequestInfo[];
  error: string | null;
}

/** Drives `GET /api/auth/charter/requests/completed` (every closed application, newest first). */
export function useCompletedCharterAuthRequests(): CompletedCharterAuthRequestsState {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCompletedCharterAuthRequests(ctrl.signal)
      .then((requests) => setSnap({ key: reloadKey, requests, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSnap({
          key: reloadKey,
          requests: [],
          error: e instanceof Error ? e.message : "過去の申請の取得に失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [reloadKey]);

  const fresh = snap !== null && snap.key === reloadKey;
  return {
    requests: fresh ? snap.requests : [],
    loading: !fresh,
    error: fresh ? snap.error : null,
    reload: () => setReloadKey((key) => key + 1),
  };
}
