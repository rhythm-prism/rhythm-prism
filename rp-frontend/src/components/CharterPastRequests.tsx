import { useCompletedCharterAuthRequests } from "../hooks/useCompletedCharterAuthRequests";
import { formatDateTime, summarizeCharterAuth } from "../lib/charterAuth";
import type { CharterAuthStatus } from "../lib/charterAuth";
import { jacketGradient } from "../lib/format";
import type { CharterAuthUser } from "../types/charterAuth";

interface Props {
  onBack: () => void;
  onSelectRequest: (requestId: string) => void;
}

const STATUS_PILL: Record<CharterAuthStatus, { label: string; className: string }> = {
  waiting: { label: "審査待ち", className: "bg-surface-2 text-muted" },
  in_review: { label: "審査中", className: "bg-prism-4/15 text-prism-4" },
  approved: { label: "承認", className: "bg-emerald-400/15 text-emerald-300" },
  rejected: { label: "却下", className: "bg-red-500/15 text-red-300" },
};

function Avatar({ user }: { user: CharterAuthUser }) {
  if (user.iconUrl) {
    return <img src={user.iconUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold">
      {user.name?.trim()?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function RequestsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}

/** All completed charter applications, for MODERATOR+ users. */
export default function CharterPastRequests({ onBack, onSelectRequest }: Props) {
  const { requests, loading, error, reload } = useCompletedCharterAuthRequests();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">過去の申請</h1>
        <button
          onClick={reload}
          disabled={loading}
          className="ml-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          更新
        </button>
      </div>

      {loading ? (
        <RequestsSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-16 text-center">
          <p className="font-semibold">過去の申請の読み込みに失敗しました</p>
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
          <p className="font-semibold">完了済みの作者申請はありません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const { status } = summarizeCharterAuth(request);
            const pill = STATUS_PILL[status];
            return (
              <li key={request.id}>
                <button
                  onClick={() => onSelectRequest(request.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:border-prism-2/50"
                >
                  {request.chart.jacket?.url ? (
                    <img src={request.chart.jacket.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span
                      className="h-14 w-14 shrink-0 rounded-lg"
                      style={{ background: jacketGradient(request.chart.id) }}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{request.chart.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Avatar user={request.requestUser} />
                      <span className="truncate">{request.requestUser.name}</span>
                      <span>・</span>
                      <span className="shrink-0">{formatDateTime(request.createdAt)}</span>
                    </span>
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
