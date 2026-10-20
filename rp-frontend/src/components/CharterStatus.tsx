import type { ReactNode } from "react";
import { useState } from "react";
import { useAuth } from "../auth/context";
import { useCharterAuthRequest } from "../hooks/useCharterAuthRequest";
import { postCharterAuthApproval } from "../lib/api";
import { CHARTER_AUTH_APPROVAL, CHARTER_AUTH_REQUIRED, DIFFICULTY_BY_ID, PERMISSION } from "../lib/constants";
import { formatDateTime, summarizeCharterAuth } from "../lib/charterAuth";
import type { CharterAuthStatus } from "../lib/charterAuth";
import { jacketGradient } from "../lib/format";
import type { CharterAuthRequestInfo, CharterAuthUser } from "../types/charterAuth";

interface Props {
  requestId: string;
  onBack: () => void;
  onApplyClick: () => void;
  onSelectChart: (chartId: string) => void;
  onSelectUser: (userId: string) => void;
}

const STATUS_META: Record<CharterAuthStatus, { label: string; hint: string; pill: string }> = {
  waiting: {
    label: "審査待ち",
    hint: "申請を受け付けました。審査が完了するまでしばらくお待ちください。",
    pill: "bg-surface-2 text-muted",
  },
  in_review: {
    label: "審査中",
    hint: `審査中です。${CHARTER_AUTH_REQUIRED.APPROVE}人が承認すると承認、${CHARTER_AUTH_REQUIRED.REJECT}人が却下すると却下になります。`,
    pill: "bg-prism-4/15 text-prism-4",
  },
  approved: {
    label: "承認",
    hint: "作者として承認されました。",
    pill: "bg-emerald-400/15 text-emerald-300",
  },
  rejected: {
    label: "却下",
    hint: "申請が却下されました。理由を確認して、再度申請してください。",
    pill: "bg-red-500/15 text-red-300",
  },
};

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Avatar({ user }: { user: CharterAuthUser }) {
  if (user.iconUrl) {
    return <img src={user.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
      {user.name?.trim()?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

type StepState = "done" | "current" | "todo" | "success" | "failed";

function StepDot({ state }: { state: StepState }) {
  const base = "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2";
  switch (state) {
    case "done":
      return (
        <span className={`${base} border-transparent bg-gradient-to-br from-prism-1 to-prism-2 text-white`}>
          <CheckIcon />
        </span>
      );
    case "success":
      return (
        <span className={`${base} border-transparent bg-emerald-500 text-white`}>
          <CheckIcon />
        </span>
      );
    case "failed":
      return (
        <span className={`${base} border-transparent bg-red-500 text-white`}>
          <CrossIcon />
        </span>
      );
    case "current":
      return (
        <span className={`${base} border-prism-4 bg-bg`}>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-prism-4" />
        </span>
      );
    default:
      return <span className={`${base} border-border bg-bg`} />;
  }
}

/** Three-step progress bar in the style of a parcel-tracking screen. */
function Stepper({ request }: { request: CharterAuthRequestInfo }) {
  const s = summarizeCharterAuth(request);
  const final = s.status === "approved" || s.status === "rejected";

  const steps: { label: string; sub: string; state: StepState; lineDone: boolean }[] = [
    { label: "申請受付", sub: formatDateTime(request.createdAt), state: "done", lineDone: true },
    {
      label: "審査",
      sub: final ? "審査完了" : s.status === "waiting" ? "審査待ち" : "審査中",
      state: final ? "done" : "current",
      lineDone: final,
    },
    {
      label: "結果",
      sub: s.status === "approved" ? "承認" : s.status === "rejected" ? "却下" : "未確定",
      state: s.status === "approved" ? "success" : s.status === "rejected" ? "failed" : "todo",
      lineDone: false,
    },
  ];

  return (
    <ol className="grid grid-cols-3">
      {steps.map((st, i) => (
        <li
          key={st.label}
          aria-current={st.state === "current" ? "step" : undefined}
          className="relative flex flex-col items-center px-1 text-center"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                st.lineDone ? "bg-gradient-to-r from-prism-1 to-prism-2" : "bg-border"
              }`}
            />
          )}
          <StepDot state={st.state} />
          <p className={`mt-2 text-sm font-bold ${st.state === "todo" ? "text-muted" : ""}`}>{st.label}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted">{st.sub}</p>
        </li>
      ))}
    </ol>
  );
}

function ApprovalMeter({ request }: { request: CharterAuthRequestInfo }) {
  const { approved, rejected } = summarizeCharterAuth(request);
  const needApprove = CHARTER_AUTH_REQUIRED.APPROVE;
  const needReject = CHARTER_AUTH_REQUIRED.REJECT;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-muted">承認</p>
          <p className="text-sm">
            <span className="text-xl font-extrabold">{approved}</span>
            <span className="text-muted"> / {needApprove} 人</span>
          </p>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: needApprove }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < approved ? "bg-gradient-to-r from-prism-1 to-prism-2" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-muted">却下</p>
          <p className="text-sm">
            <span className="text-xl font-extrabold">{rejected}</span>
            <span className="text-muted"> / {needReject} 人</span>
          </p>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: needReject }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${i < rejected ? "bg-red-400" : "bg-surface-2"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ dot, children }: { dot: ReactNode; children: ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute -left-[31px] top-1 flex h-3 w-3 items-center justify-center">{dot}</span>
      {children}
    </li>
  );
}

/** Tracking-style history: the application itself, followed by the reviewers' decisions. */
function Timeline({ request }: { request: CharterAuthRequestInfo }) {
  // Oldest first (application at the top), newest at the bottom.
  const approvals = [...request.approvals].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
      <TimelineItem dot={<span className="h-3 w-3 rounded-full bg-prism-2" />}>
        <p className="text-sm font-semibold">申請を受け付けました</p>
        <p className="text-xs text-muted">{formatDateTime(request.createdAt)}</p>
      </TimelineItem>

      {approvals.length === 0 && (
        <TimelineItem dot={<span className="h-3 w-3 animate-pulse rounded-full bg-prism-4" />}>
          <p className="text-sm font-semibold">審査待ち</p>
          <p className="text-xs text-muted">まだ審査は行われていません。</p>
        </TimelineItem>
      )}

      {approvals.map((a, i) => {
        const approve = a.status === CHARTER_AUTH_APPROVAL.APPROVE;
        return (
          <TimelineItem
            key={`${a.reviewer.id}-${i}`}
            dot={<span className={`h-3 w-3 rounded-full ${approve ? "bg-emerald-400" : "bg-red-400"}`} />}
          >
            <div className="flex items-center gap-2.5">
              <Avatar user={a.reviewer} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.reviewer.name}</p>
                <p className={`text-xs font-semibold ${approve ? "text-emerald-300" : "text-red-300"}`}>
                  {approve ? "承認しました" : "却下しました"}
                  <span className="ml-2 font-normal text-muted">{formatDateTime(a.createdAt)}</span>
                </p>
              </div>
            </div>
            {a.reason && (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
                {a.reason}
              </p>
            )}
          </TimelineItem>
        );
      })}
    </ol>
  );
}

function ChartSummary({
  request,
  onSelectChart,
}: {
  request: CharterAuthRequestInfo;
  onSelectChart: (chartId: string) => void;
}) {
  const { chart } = request;
  const diff = DIFFICULTY_BY_ID[chart.difficulty];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold">申請した譜面</h3>
      <button
        type="button"
        onClick={() => onSelectChart(chart.id)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-bg/40 p-2.5 text-left transition-colors hover:border-prism-2/50"
      >
        {chart.jacket?.url ? (
          <img src={chart.jacket.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-lg" style={{ background: jacketGradient(chart.id) }} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-black/80"
              style={{ backgroundColor: diff?.color ?? "#a855f7" }}
            >
              {diff?.name ?? "Lv."} {chart.rating}
            </span>
          </span>
          <span className="mt-1 block truncate text-sm font-bold">{chart.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {chart.composer || "Unknown"}
            {chart.vocal && ` / ${chart.vocal}`}
          </span>
        </span>
      </button>
    </div>
  );
}

/** Approve/reject panel for a reviewer who hasn't decided on this application yet. */
function ReviewPanel({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (status: number) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await postCharterAuthApproval(requestId, status, reason.trim() || undefined);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-prism-2/40 bg-prism-2/5 p-4">
      <h3 className="text-sm font-bold">審査する</h3>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="理由（任意）"
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none transition-colors focus:border-prism-2/60"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => decide(CHARTER_AUTH_APPROVAL.REJECT)}
          disabled={submitting}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          却下する
        </button>
        <button
          onClick={() => decide(CHARTER_AUTH_APPROVAL.APPROVE)}
          disabled={submitting}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "送信中…" : "承認する"}
        </button>
      </div>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="h-6 w-24 animate-pulse rounded bg-surface-2" />
      <div className="h-16 animate-pulse rounded bg-surface-2" />
      <div className="h-20 animate-pulse rounded bg-surface-2" />
    </div>
  );
}

/**
 * One application's tracking-style status page, opened either by its own applicant
 * (from the request list) or by an AUTHORIZED_CHARTER+ reviewer via a shared link —
 * both operate from this same screen. `GET /api/auth/charter/request` enforces that
 * access rule server-side, so a third party gets a 403 here instead of any data.
 */
export default function CharterStatus({
  requestId,
  onBack,
  onApplyClick,
  onSelectChart,
  onSelectUser,
}: Props) {
  const { user } = useAuth();
  const { request, loading, error, reload } = useCharterAuthRequest(requestId);

  const isOwner = request?.requestUser.id === user?.id;
  const isReviewer = (user?.permission ?? PERMISSION.NORMAL) >= PERMISSION.AUTHORIZED_CHARTER;
  const alreadyReviewed = request?.approvals.some((a) => a.reviewer.id === user?.id) ?? false;
  const canReview = !!request && !request.isClosed && isReviewer && !alreadyReviewed;

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

      {loading ? (
        <StatusSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-16 text-center">
          <p className="font-semibold">申請情報の読み込みに失敗しました</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <button
            onClick={reload}
            className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-prism-2/50"
          >
            再試行
          </button>
        </div>
      ) : !request ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-semibold">申請が見つかりませんでした</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <span
                  className={`inline-block rounded-lg px-3 py-1 text-sm font-extrabold ${
                    STATUS_META[summarizeCharterAuth(request).status].pill
                  }`}
                >
                  {STATUS_META[summarizeCharterAuth(request).status].label}
                </span>
                <p className="text-sm text-muted">{STATUS_META[summarizeCharterAuth(request).status].hint}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelectUser(request.requestUser.id)}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-bg/40 py-1.5 pl-1.5 pr-3 transition-colors hover:border-prism-2/50"
              >
                <Avatar user={request.requestUser} />
                <div className="text-right leading-tight">
                  <p className="text-[10px] text-muted">申請者</p>
                  <p className="text-sm font-semibold text-text">{request.requestUser.name}</p>
                </div>
              </button>
            </div>

            <Stepper request={request} />

            <ChartSummary request={request} onSelectChart={onSelectChart} />

            <ApprovalMeter request={request} />

            <div className="space-y-3">
              <h3 className="text-sm font-bold">審査履歴</h3>
              <Timeline request={request} />
            </div>

            {canReview && <ReviewPanel requestId={request.id} onDone={reload} />}
            {!request.isClosed && isReviewer && !isOwner && alreadyReviewed && (
              <p className="text-center text-sm text-muted">この申請はすでに審査済みです。</p>
            )}

            {isOwner && summarizeCharterAuth(request).status === "rejected" && (
              <div className="flex justify-end">
                <button
                  onClick={onApplyClick}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
                >
                  もう一度申請する
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
