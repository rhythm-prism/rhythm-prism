import type { ChartSearchParams, SortType } from "../types/chart";

interface Props {
  params: ChartSearchParams;
  onChange: (patch: Partial<ChartSearchParams>) => void;
  /** Pressing Enter in the keyword field / clicking the button triggers this. */
  onSubmit?: () => void;
  /** Disables the button/Enter-to-submit while a search is already in flight. */
  loading?: boolean;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}

export default function Toolbar({ params, onChange, onSubmit, loading }: Props) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon />
        </span>
        <input
          value={params.keywords ?? ""}
          onChange={(e) => onChange({ keywords: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSubmit && !loading) onSubmit();
          }}
          placeholder="タイトル・作曲者・ボーカル・作者で検索…"
          className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={loading}
        className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        検索
      </button>
    </div>
  );
}

const SORTS: { id: SortType; label: string }[] = [
  { id: "new", label: "新着" },
  { id: "likes", label: "人気" },
];

interface SortRowProps {
  params: ChartSearchParams;
  resultCount: number;
  hasMore: boolean;
  loading: boolean;
  onChange: (patch: Partial<ChartSearchParams>) => void;
}

export function SortRow({ params, resultCount, hasMore, loading, onChange }: SortRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange({ sortType: s.id })}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                params.sortType === s.id
                  ? "bg-accent text-white"
                  : "text-muted hover:text-text"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onChange({ order: params.order === "desc" ? "asc" : "desc" })}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
          title="並び順を反転"
        >
          {params.order === "desc" ? "降順 ↓" : "昇順 ↑"}
        </button>
      </div>

      <span className="text-sm text-muted">
        {loading ? (
          "読み込み中…"
        ) : (
          <>
            <span className="font-bold text-text">
              {resultCount}
              {hasMore ? "+" : ""}
            </span>{" "}
            件表示中
          </>
        )}
      </span>
    </div>
  );
}
