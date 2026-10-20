import { useEffect, useMemo, useState } from "react";
import type { ChartSearchParams } from "../types/chart";
import type { UserDetailInfo } from "../types/user";
import { fetchUserProfile } from "../lib/api";
import { useChartSearch } from "../hooks/useChartSearch";
import { useMyCharts } from "../hooks/useMyCharts";
import { PUBLISH_STATUS, RATING_MAX, RATING_MIN } from "../lib/constants";
import { useAuth } from "../auth/context";
import ChartResults from "./ChartResults";

interface Props {
  userId: string;
  onBack: () => void;
  onSelectChart: (chartId: string) => void;
  onEdit: () => void;
}

/** Own drafts/private charts, shown only on the logged-in user's own profile. */
function PrivateCharts({ onSelectChart }: { onSelectChart: (chartId: string) => void }) {
  const state = useMyCharts();
  const drafts = state.charts.filter((c) => c.publishStatus !== PUBLISH_STATUS.PUBLIC);

  if (!state.loading && drafts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-text">非公開</h3>
      <ChartResults state={{ ...state, charts: drafts }} onSelect={onSelectChart} showDate={false} />
    </div>
  );
}

interface Loaded {
  id: string;
  user: UserDetailInfo | null;
  error: string | null;
}

export default function UserProfile({ userId, onBack, onSelectChart, onEdit }: Props) {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchUserProfile(userId, ctrl.signal)
      .then((user) => setData({ id: userId, user, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setData({
          id: userId,
          user: null,
          error: e instanceof Error ? e.message : "読み込みに失敗しました",
        });
      });
    return () => ctrl.abort();
  }, [userId]);

  const fresh = data !== null && data.id === userId;
  const loading = !fresh;
  const user = fresh ? data.user : null;
  const error = fresh ? data.error : null;

  const isOwner = !!currentUser && currentUser.id === userId;

  // 自分のプロフィールでは、r18譜面もフィルタせずに表示する。
  const chartParams: ChartSearchParams = useMemo(
    () => ({
      sortType: "new",
      order: "desc",
      minRating: RATING_MIN,
      maxRating: RATING_MAX,
      r18: isOwner,
      collabo: false,
      difficultyIds: [],
      genreIds: [],
      userIds: [userId],
      limit: 20,
    }),
    [userId, isOwner],
  );
  const charts = useChartSearch(chartParams);

  const backButton = (
    <button
      onClick={onBack}
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
    >
      ← 戻る
    </button>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {backButton}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
          <div className="h-16 w-16 animate-pulse rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/3 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {backButton}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-20 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 font-semibold">{error ?? "ユーザーが見つかりません"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        {backButton}
        {isOwner && (
          <button
            onClick={onEdit}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
          >
            ✎ プロフィールを編集
          </button>
        )}
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {user.iconUrl ? (
            <img src={user.iconUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-prism-1 to-prism-3 text-xl font-bold text-white">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{user.name}</h1>
          </div>
        </div>

        {user.profile && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">自己紹介</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{user.profile}</p>
          </div>
        )}

        {(user.discordName || user.sonolusName) && (
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            {user.discordName && (
              <span className="rounded-md bg-surface-2 px-2 py-1">Discord: {user.discordName}</span>
            )}
            {user.sonolusName && (
              <span className="rounded-md bg-surface-2 px-2 py-1">Sonolus: {user.sonolusName}</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text">投稿した譜面</h2>
        {isOwner ? (
          <div className="space-y-6">
            <PrivateCharts onSelectChart={onSelectChart} />
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text">公開</h3>
              <ChartResults state={charts} onSelect={onSelectChart} />
            </div>
          </div>
        ) : (
          <ChartResults state={charts} onSelect={onSelectChart} />
        )}
      </div>
    </div>
  );
}
