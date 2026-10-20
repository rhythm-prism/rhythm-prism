import { useCallback } from "react";
import type { ChartSearchParams } from "../types/chart";
import { searchCharts } from "../lib/api";
import { usePaginatedCharts, type ChartListState } from "./usePaginatedCharts";

export type ChartSearchState = ChartListState;

/**
 * Drives `GET /api/chart/search` with cursor pagination.
 * `params` must be a stable reference (e.g. a debounced state value).
 */
export function useChartSearch(params: ChartSearchParams): ChartSearchState {
  const fetchPage = useCallback(
    (cursor: string | undefined, signal?: AbortSignal) =>
      searchCharts({ ...params, cursor }, signal),
    [params],
  );
  return usePaginatedCharts(fetchPage);
}
