import { useAuth } from "../auth/context";
import { useCharterAuthRequests } from "../hooks/useCharterAuthRequests";
import { formatDateTime, summarizeCharterAuth } from "../lib/charterAuth";
import type { CharterAuthStatus } from "../lib/charterAuth";
import { PERMISSION } from "../lib/constants";
import { jacketGradient } from "../lib/format";

interface Props {
  userId: string;
  onBack: () => void;
  onApplyClick: () => void;
  onSelectRequest: (requestId: string) => void;
}

const STATUS_PILL: Record<CharterAuthStatus, { label: string; className: string }> = {
  waiting: { label: "審査待ち", className: "bg-surface-2 text-muted" },
  in_review: { label: "審査中", className: "bg-prism-4/15 text-prism-4" },
  approved: { label: "承認", className: "bg-emerald-400/15 text-emerald-300" },
  rejected: { label: "却下", className: "bg-red-500/15 text-red-300" },
};

function RequestsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}

export default function CharterRequests({ userId, onBack, onApplyClick, onSelectRequest }: Props) {
  const { user } = useAuth();
  const { requests, loading, error, reload } = useCharterAuthRequests(userId);
  const hasOpenRequest = requests.some((r) => !r.isClosed);
  // Applying is NORMAL-only — this page itself stays open to everyone so past
  // records (e.g. after becoming a charter) remain visible.
  const isNormal = (user?.permission ?? PERMISSION.NORMAL) === PERMISSION.NORMAL;
  const canApply = isNormal && !hasOpenRequest;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">作者申請</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="ml-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          更新
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">
          {!isNormal
            ? "作者申請は通常権限のユーザーのみ行えます。"
            : hasOpenRequest
              ? "審査中の申請があります。結果が出るまで新しく申請することはできません。"
              : "投稿した譜面を選んで、作者として申請できます。"}
        </p>
        <button
          onClick={onApplyClick}
          disabled={!canApply}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          申請する
        </button>
      </div>

      {loading ? (
        <RequestsSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-16 text-center">
          <p className="font-semibold">申請一覧の読み込みに失敗しました</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            onClick={reload}
            className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-prism-2/50"
          >
            再試行
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-semibold">まだ申請がありません</p>
          <p className="mt-1 text-sm text-muted">上のボタンから申請できます。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const { status } = summarizeCharterAuth(r);
            const pill = STATUS_PILL[status];
            return (
              <li key={r.id}>
                <button
                  onClick={() => onSelectRequest(r.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:border-prism-2/50"
                >
                  {r.chart.jacket?.url ? (
                    <img src={r.chart.jacket.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span
                      className="h-14 w-14 shrink-0 rounded-lg"
                      style={{ background: jacketGradient(r.chart.id) }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.chart.title}</span>
                    <span className="block text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                  </span>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${pill.className}`}>
                    {pill.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
