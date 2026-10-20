import { useCallback } from "react";
import { fetchMyCharts } from "../lib/api";
import { usePaginatedCharts, type ChartListState } from "./usePaginatedCharts";

/** Drives `GET /api/chart/my` (the authenticated user's own + collab charts). */
export function useMyCharts(): ChartListState {
  const fetchPage = useCallback(
    (cursor: string | undefined, signal?: AbortSignal) => fetchMyCharts(cursor, signal),
    [],
  );
  return usePaginatedCharts(fetchPage);
}
