import { useCallback, useEffect, useState } from "react";
import type { ChartSearchResponse, ChartSimpleInfo } from "../types/chart";

export interface ChartListState {
  charts: ChartSimpleInfo[];
  loading: boolean; // first page in flight
  loadingMore: boolean; // subsequent page in flight
  error: string | null;
  hasNext: boolean;
  loadMore: () => void;
  retry: () => void;
}

/** Fetches one page; `cursor` is undefined for the first page. */
export type FetchPage = (
  cursor: string | undefined,
  signal?: AbortSignal,
) => Promise<ChartSearchResponse>;

// A page set is tied to the exact `fetchPage` reference it came from, so
// staleness (and thus `loading`) is derived during render rather than flipped
// with a setState inside the effect body.
interface Snapshot {
  fetchPage: FetchPage;
  charts: ChartSimpleInfo[];
  hasNext: boolean;
  cursor?: string;
  error: string | null;
}

/**
 * Cursor pagination over any `ChartSimpleInfoListResponse` endpoint. Refetches
 * the first page whenever `fetchPage` changes (memoize it in the caller so it
 * only changes when the query does), and appends pages via `loadMore()`.
 */
export function usePaginatedCharts(fetchPage: FetchPage): ChartListState {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPage(undefined, ctrl.signal)
      .then((res) =>
        setSnap({
          fetchPage,
          charts: res.charts,
          hasNext: res.next,
          cursor: res.cursor ?? undefined,
          error: null,
        }),
      )
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSnap({
          fetchPage,
          charts: [],
          hasNext: false,
          cursor: undefined,
          error: e instanceof Error ? e.message : "読み込みに失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [fetchPage, reloadKey]);

  const fresh = snap !== null && snap.fetchPage === fetchPage;
  const charts = fresh ? snap.charts : [];
  const hasNext = fresh ? snap.hasNext : false;
  const error = fresh ? snap.error : null;
  const loading = !fresh;

  const loadMore = useCallback(() => {
    if (!fresh || !snap.hasNext || !snap.cursor || loadingMore) return;
    const cursor = snap.cursor;
    setLoadingMore(true);
    fetchPage(cursor)
      .then((res) =>
        setSnap((prev) =>
          prev && prev.fetchPage === fetchPage
            ? {
                ...prev,
                charts: [...prev.charts, ...res.charts],
                hasNext: res.next,
                cursor: res.cursor ?? undefined,
              }
            : prev,
        ),
      )
      .catch((e: unknown) =>
        setSnap((prev) =>
          prev
            ? { ...prev, error: e instanceof Error ? e.message : "追加の読み込みに失敗しました" }
            : prev,
        ),
      )
      .finally(() => setLoadingMore(false));
  }, [fetchPage, fresh, snap, loadingMore]);

  const retry = useCallback(() => {
    setSnap(null);
    setReloadKey((k) => k + 1);
  }, []);

  return { charts, loading, loadingMore, error, hasNext, loadMore, retry };
}
