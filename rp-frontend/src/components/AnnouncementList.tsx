import { useEffect, useState } from "react";
import type { AnnounceInfo } from "../types/announcement";
import { deleteAnnouncement, fetchAnnouncements } from "../lib/api";
import { formatDate } from "../lib/format";

interface Props {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (postId: string) => void;
}

export default function AnnouncementList({ onBack, onCreate, onEdit }: Props) {
  const [announcements, setAnnouncements] = useState<AnnounceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnounceInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnnouncements(ctrl.signal)
      .then(setAnnouncements)
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "お知らせの取得に失敗しました");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(`削除に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">お知らせ管理</h1>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
        >
          + 新規投稿
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">お知らせはまだありません</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface/80 p-4"
            >
              {a.thumbnail?.url ? (
                <img
                  src={a.thumbnail.url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="h-16 w-16 shrink-0 rounded-xl bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.title}</p>
                <p className="truncate text-xs text-muted">{a.subtitle}</p>
                <p className="truncate text-xs text-muted">
                  {a.displayName} ・ {formatDate(a.createdAt)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{a.description}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onEdit(a.id)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(a);
                  }}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold">お知らせを削除しますか？</h2>
            <p className="text-sm leading-relaxed text-muted">
              「{deleteTarget.title}」を削除します。この操作は取り消せません。
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-300">{deleteError}</p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
