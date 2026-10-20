import type { ChartListState } from "../hooks/usePaginatedCharts";
import ChartCard from "./ChartCard";

interface Props {
  state: ChartListState;
  onSelect?: (chartId: string) => void;
  showDate?: boolean;
  /** When given, cards whose id is in this set render as selected. */
  selectedIds?: ReadonlySet<string>;
  /** "compact" packs more, smaller cards per row (e.g. the charter application picker). */
  density?: "cozy" | "compact";
}

const gridClass = "grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4";
const compactGridClass = "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-square animate-pulse bg-surface-2" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

export default function ChartResults({
  state,
  onSelect,
  showDate = true,
  selectedIds,
  density = "cozy",
}: Props) {
  const { charts, loading, loadingMore, error, hasNext, loadMore, retry } = state;
  const grid = density === "compact" ? compactGridClass : gridClass;

  // First-page load: skeleton grid.
  if (loading) {
    return (
      <div className={grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Error with nothing to show.
  if (error && charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-20 text-center">
        <p className="text-4xl">⚠️</p>
        <p className="mt-3 font-semibold">譜面の読み込みに失敗しました</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <button
          onClick={retry}
          className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-prism-2/50"
        >
          再試行
        </button>
      </div>
    );
  }

  // Empty result set.
  if (charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
        <p className="text-4xl">🔍</p>
        <p className="mt-3 font-semibold">該当する譜面が見つかりませんでした</p>
        <p className="mt-1 text-sm text-muted">条件を変えてもう一度お試しください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={grid}>
        {charts.map((c) => (
          <ChartCard
            key={c.id}
            chart={c}
            showDate={showDate}
            selected={selectedIds ? selectedIds.has(c.id) : undefined}
            size={density === "compact" ? "sm" : "md"}
            onClick={onSelect ? () => onSelect(c.id) : undefined}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      {hasNext && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-xl border border-border bg-surface px-6 py-2.5 text-sm font-semibold transition-colors hover:border-prism-2/50 disabled:opacity-50"
          >
            {loadingMore ? "読み込み中…" : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
