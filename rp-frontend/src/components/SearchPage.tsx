import { useMemo, useState } from "react";
import type { ChartSearchParams } from "../types/chart";
import { RATING_MAX, RATING_MIN } from "../lib/constants";
import { useChartSearch } from "../hooks/useChartSearch";
import FilterSidebar from "./FilterSidebar";
import Toolbar, { SortRow } from "./Toolbar";
import ChartResults from "./ChartResults";

const DEFAULT_PARAMS: ChartSearchParams = {
  sortType: "new",
  order: "desc",
  keywords: "",
  minRating: RATING_MIN,
  maxRating: RATING_MAX,
  r18: false,
  collabo: false,
  difficultyIds: [],
  genreIds: [],
  limit: 20,
};

interface Props {
  onSelectChart: (chartId: string) => void;
  onBack: () => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function hasActiveFilters(params: ChartSearchParams): boolean {
  return (
    params.genreIds.length > 0 ||
    params.difficultyIds.length > 0 ||
    params.collabo ||
    params.r18 ||
    params.minRating > RATING_MIN ||
    params.maxRating < RATING_MAX
  );
}

export default function SearchPage({ onSelectChart, onBack }: Props) {
  // `draft` is edited freely; `committed` is only updated when 検索 is pressed,
  // so the API is called on demand rather than on every control change.
  const [draft, setDraft] = useState<ChartSearchParams>(DEFAULT_PARAMS);
  const [committed, setCommitted] = useState<ChartSearchParams | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = useChartSearch(committed ?? DEFAULT_PARAMS);
  const hasSearched = committed !== null;

  const update = (patch: Partial<ChartSearchParams>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const resultCount = hasSearched ? search.charts.length : 0;
  const loading = hasSearched && search.loading;

  // New object reference each press so an identical query still refetches.
  // Ignored while a search is already in flight, so Enter-key/click spamming
  // can't fire a burst of overlapping requests.
  const runSearch = () => {
    if (loading) return;
    setCommitted({ ...draft });
  };

  const emptyState = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
        <p className="font-semibold">条件を指定して検索してください</p>
        <p className="mt-1 text-sm text-muted">
          ジャンル・難易度・キーワードなどを選び、「検索」を押してください。
        </p>
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">譜面を検索</h1>
      </div>

      <div className="space-y-4">
        <Toolbar params={draft} onChange={update} onSubmit={runSearch} loading={loading} />

        <div className="overflow-hidden rounded-2xl border border-border bg-surface/80 transition-colors">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              詳細検索
              <ChevronIcon open={filtersOpen} />
            </span>
            {hasActiveFilters(draft) && (
              <span className="rounded-full bg-prism-2/20 px-2 py-0.5 text-xs font-bold text-prism-2">
                絞り込み中
              </span>
            )}
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: filtersOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/70 p-4">
                <FilterSidebar
                  params={draft}
                  onChange={update}
                  onReset={() => setDraft(DEFAULT_PARAMS)}
                />
              </div>
            </div>
          </div>
        </div>

        <SortRow
          params={draft}
          resultCount={resultCount}
          hasMore={hasSearched && search.hasNext}
          loading={loading}
          onChange={update}
        />

        {hasSearched ? <ChartResults state={search} onSelect={onSelectChart} /> : emptyState}
      </div>
    </div>
  );
}
