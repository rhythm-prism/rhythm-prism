import { useMemo, useState } from "react";
import { useMyCharts } from "../hooks/useMyCharts";
import { useCharterAuthRequests } from "../hooks/useCharterAuthRequests";
import { postCharterAuthRequest } from "../lib/api";
import ChartResults from "./ChartResults";

interface Props {
  userId: string;
  onBack: () => void;
  /** Called with the new application's id (goes to its status screen). */
  onApplied: (requestId: string) => void;
  onStatusClick: (requestId: string) => void;
  onSubmitClick: () => void;
}

export default function CharterApply({
  userId,
  onBack,
  onApplied,
  onStatusClick,
  onSubmitClick,
}: Props) {
  const myCharts = useMyCharts();
  // The backend only accepts the applicant's own charts. `/api/chart/my` also returns
  // charts they merely collaborate on, so collab charts are left out of the choices.
  const charts = useMemo(
    () => ({ ...myCharts, charts: myCharts.charts.filter((c) => !c.collabo) }),
    [myCharts],
  );
  const requests = useCharterAuthRequests(userId);

  // Single selection for now; kept as a set so multi-chart applications can slot in later.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);
  const selectedChart = charts.charts.find((c) => c.id === selectedId) ?? null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The backend refuses a new application while an earlier one is still open.
  const openRequest = requests.requests.find((r) => !r.isClosed);
  const hasOpenRequest = !!openRequest;

  const toggle = (chartId: string) => {
    setError(null);
    setSelectedId((cur) => (cur === chartId ? null : chartId));
  };

  const submit = async () => {
    if (!selectedChart || submitting || hasOpenRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      const requestId = await postCharterAuthRequest(selectedChart.id);
      onApplied(requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "申請に失敗しました");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">作者申請</h1>
      </div>

      <p className="text-sm text-muted">
        審査に使用する譜面を選んでください。選んだ譜面の内容をもとに、作者として認められるかが審査されます。
      </p>

      {hasOpenRequest && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-prism-4/40 bg-prism-4/10 px-4 py-3 text-sm">
          <p className="text-prism-4">審査中の申請があります。結果が出るまで新しく申請することはできません。</p>
          <button
            onClick={() => openRequest && onStatusClick(openRequest.id)}
            className="rounded-lg border border-prism-4/50 px-3 py-1.5 text-xs font-semibold text-prism-4 transition-colors hover:bg-prism-4/10"
          >
            承認状況を確認
          </button>
        </div>
      )}

      {!charts.loading && !charts.error && charts.charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-semibold">申請に使える譜面がありません</p>
          <p className="mt-1 text-sm text-muted">先に譜面を投稿してから申請してください。</p>
          <button
            onClick={onSubmitClick}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
          >
            譜面を投稿
          </button>
        </div>
      ) : (
        <ChartResults
          state={charts}
          onSelect={toggle}
          showDate={false}
          selectedIds={selectedIds}
          density="compact"
        />
      )}

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 p-3 shadow-2xl backdrop-blur sm:px-4">
        <div className="min-w-0 text-sm">
          {selectedChart ? (
            <>
              <p className="text-xs text-muted">選択中の譜面</p>
              <p className="truncate font-semibold">{selectedChart.title}</p>
            </>
          ) : (
            <p className="text-muted">譜面を選択してください</p>
          )}
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
        <button
          onClick={submit}
          disabled={!selectedChart || submitting || hasOpenRequest}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "申請中…" : "この譜面で申請する"}
        </button>
      </div>
    </div>
  );
}
