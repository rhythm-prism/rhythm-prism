import { useEffect, useState } from "react";
import { fetchChartTags } from "../lib/api";
import type { ChartTag } from "../types/chart";

export function useChartTags() {
  const [state, setState] = useState<{
    tags: ChartTag[];
    loading: boolean;
    error: string | null;
  }>({ tags: [], loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchChartTags(controller.signal)
      .then((tags) => {
        if (!controller.signal.aborted) setState({ tags, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setState({
          tags: [],
          loading: false,
          error: err instanceof Error ? err.message : "タグ一覧の取得に失敗しました",
        });
      });
    return () => controller.abort();
  }, [reloadKey]);

  return {
    ...state,
    reload: () => {
      setState((current) => ({ ...current, loading: true, error: null }));
      setReloadKey((key) => key + 1);
    },
  };
}
