import { useMyCharts } from "../hooks/useMyCharts";
import ChartResults from "./ChartResults";

interface Props {
  onBack: () => void;
  onSubmitClick: () => void;
  onSelectChart: (chartId: string) => void;
}

export default function MyCharts({ onBack, onSubmitClick, onSelectChart }: Props) {
  const state = useMyCharts();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">投稿した譜面</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">自分の投稿・合作した譜面（下書き・非公開を含む）</p>
        <span className="text-sm text-muted">
          {state.loading ? (
            "読み込み中…"
          ) : (
            <>
              <span className="font-bold text-text">
                {state.charts.length}
                {state.hasNext ? "+" : ""}
              </span>{" "}
              件表示中
            </>
          )}
        </span>
      </div>

      {!state.loading && !state.error && state.charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-4xl">🎼</p>
          <p className="mt-3 font-semibold">まだ譜面がありません</p>
          <p className="mt-1 text-sm text-muted">最初の譜面を投稿してみましょう。</p>
          <button
            onClick={onSubmitClick}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
          >
            譜面を投稿
          </button>
        </div>
      ) : (
        <ChartResults state={state} onSelect={onSelectChart} showDate={false} />
      )}
    </div>
  );
}
