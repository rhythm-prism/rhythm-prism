import { useEffect, useState } from "react";
import { fetchCharterAuthRequest } from "../lib/api";
import type { CharterAuthRequestInfo } from "../types/charterAuth";

export interface CharterAuthRequestState {
  request: CharterAuthRequestInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// A result is tied to the key it was fetched for, so `loading` is derived
// during render instead of being flipped inside the effect body.
interface Snapshot {
  key: string;
  request: CharterAuthRequestInfo | null;
  error: string | null;
}

/** Drives `GET /api/auth/charter/{requestId}` — one application, by id alone. */
export function useCharterAuthRequest(requestId: string): CharterAuthRequestState {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${requestId}:${reloadKey}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCharterAuthRequest(requestId, ctrl.signal)
      .then((request) => setSnap({ key, request, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSnap({
          key,
          request: null,
          error: e instanceof Error ? e.message : "申請情報の取得に失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [requestId, key]);

  const fresh = snap !== null && snap.key === key;
  return {
    request: fresh ? snap.request : null,
    loading: !fresh,
    error: fresh ? snap.error : null,
    reload: () => setReloadKey((k) => k + 1),
  };
}
