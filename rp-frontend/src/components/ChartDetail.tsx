import { useEffect, useState } from "react";
import type { ChartDetailInfo } from "../types/chart";
import { fetchChartDetail, getChartDownloadUrl } from "../lib/api";
import {
  CHART_CONVERSION_COMPLETE,
  DIFFICULTY_BY_ID,
  GENRE_BY_ID,
  PERMISSION,
  PUBLISH_STATUS,
} from "../lib/constants";
import { formatCount, formatDate, jacketGradient } from "../lib/format";
import { useAuth } from "../auth/context";

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 1.9 4.9 5.4 4.4 7.6 4.1 9.8 5 12 7.7c2.2-2.7 4.4-3.6 6.6-3.3 3.5.5 5 4.2 3.4 7.4C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  );
}

interface Props {
  chartId: string;
  onBack: () => void;
  onEdit: () => void;
  onSelectUser: (userId: string) => void;
}

interface Loaded {
  id: string;
  detail: ChartDetailInfo | null;
  error: string | null;
}

export default function ChartDetail({ chartId, onBack, onEdit, onSelectUser }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const detail = await fetchChartDetail(chartId, ctrl.signal);
        if (cancelled) return;
        setData({ id: chartId, detail, error: null });
        // The chart/bgm/jacket are converted asynchronously by a Celery worker
        // after submission, so keep polling until conversion finishes.
        if (detail.conversionStatus !== CHART_CONVERSION_COMPLETE) {
          timer = setTimeout(load, 3000);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (cancelled) return;
        setData({
          id: chartId,
          detail: null,
          error: e instanceof Error ? e.message : "読み込みに失敗しました",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
      ctrl.abort();
      if (timer) clearTimeout(timer);
    };
  }, [chartId]);

  const fresh = data !== null && data.id === chartId;
  const loading = !fresh;
  const detail = fresh ? data.detail : null;
  const error = fresh ? data.error : null;

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
        <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
          <div className="aspect-square animate-pulse rounded-2xl bg-surface-2" />
          <div className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
            <div className="h-20 w-full animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {backButton}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-500/40 py-20 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 font-semibold">{error ?? "譜面が見つかりません"}</p>
        </div>
      </div>
    );
  }

  const genre = GENRE_BY_ID[detail.genre];
  const diff = DIFFICULTY_BY_ID[detail.difficulty];
  const isPrivate = detail.publishStatus !== PUBLISH_STATUS.PUBLIC;
  const isOwner = !!user && user.id === detail.authorUser.id;
  const isModerator = (user?.permission ?? 0) >= PERMISSION.MODERATOR;
  const canEdit = isOwner || isModerator;
  const canDownload = !!detail.originalChart || isOwner || isModerator;
  const converting = detail.conversionStatus !== CHART_CONVERSION_COMPLETE;
  const host = window.location.origin.replace(/^https?:\/\//, "");
  const sonolusUrl = `https://open.sonolus.com/${host}/levels/${encodeURIComponent(detail.id)}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {converting && (
        <div className="flex items-center gap-2 rounded-xl border border-prism-2/40 bg-prism-2/10 px-4 py-3 text-sm text-prism-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-prism-2" />
          ファイルを変換処理中です。ジャケット・音源・譜面データの反映まで少し時間がかかります。
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backButton}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sonolusUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          >
            Sonolusで開く
          </a>
          {canDownload && (
            <a
              href={getChartDownloadUrl(detail.id)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border bg-surface-2 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
            >
              譜面ファイルDL
            </a>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
            >
              ✎ 譜面を編集
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div
            className={`relative overflow-hidden rounded-2xl border ${
              isPrivate ? "border-dashed border-border/80" : "border-border"
            }`}
          >
            {detail.jacket?.url ? (
              <img
                src={detail.jacket.url}
                alt={detail.title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div
                className="aspect-square w-full"
                style={{ background: jacketGradient(detail.id) }}
              />
            )}

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
              <span
                className="flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm font-extrabold text-black shadow"
                style={{ backgroundColor: diff?.color ?? "#a855f7" }}
              >
                {detail.rating}
              </span>
              <div className="flex gap-1.5">
                {isPrivate && (
                  <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-amber-300 backdrop-blur">
                    非公開
                  </span>
                )}
                {detail.collabo && (
                  <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-cyan-300 backdrop-blur">
                    合作
                  </span>
                )}
                {detail.r18 && (
                  <span className="rounded-md bg-red-600/85 px-2 py-1 text-[11px] font-bold leading-none text-white backdrop-blur">
                    R18
                  </span>
                )}
              </div>
            </div>
          </div>
          {detail.preview?.url && (
            <audio controls src={detail.preview.url} className="w-full">
              <track kind="captions" />
            </audio>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-2 py-1 text-[11px] font-bold leading-none text-black/80"
              style={{ backgroundColor: genre?.color ?? "#c9b49c" }}
            >
              {genre?.name ?? "その他"}
            </span>
            <span
              className="rounded-md px-2 py-1 text-[11px] font-bold uppercase leading-none text-black/80"
              style={{ backgroundColor: diff?.color ?? "#a855f7" }}
            >
              {diff?.name ?? "Lv."}
            </span>
          </div>
          {detail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="タグ">
              {detail.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-border bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted"
                >
                  #{tag.title}
                </span>
              ))}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{detail.title}</h1>
            <div className="mt-1.5 space-y-1 text-sm text-muted">
              <p className="flex items-center gap-1.5">
                <MusicNoteIcon />
                <span>{detail.composer ?? "Unknown"}</span>
              </p>
              {detail.vocal && (
                <p className="flex items-center gap-1.5">
                  <MicIcon />
                  <span>{detail.vocal}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => onSelectUser(detail.authorUser.id)}
            className="flex items-center gap-2.5 rounded-lg text-left transition-opacity hover:opacity-80"
          >
            {detail.authorUser.iconUrl ? (
              <img
                src={detail.authorUser.iconUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-prism-1 to-prism-3 text-xs font-bold text-white">
                {detail.authorUser.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <div className="text-sm">
              <p className="font-medium">{detail.author}</p>
              <p className="text-xs text-muted">@{detail.authorUser.name}</p>
            </div>
          </button>

          <div className="flex items-center gap-4 border-t border-border/60 pt-3 text-sm text-muted">
            <span className="flex items-center gap-1 text-prism-3">
              <HeartIcon />
              {formatCount(detail.likes)}
            </span>
            {detail.firstPublishedAt != null && (
              <span>公開 {formatDate(detail.firstPublishedAt)}</span>
            )}
            <span>更新 {formatDate(detail.updatedAt)}</span>
          </div>

          {detail.description && (
            <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface/80 p-4 text-sm leading-relaxed">
              {detail.description}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
