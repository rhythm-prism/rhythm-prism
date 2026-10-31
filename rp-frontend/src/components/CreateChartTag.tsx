import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useChartTags } from "../hooks/useChartTags";
import { createChartTag, deleteChartTag } from "../lib/api";
import type { ChartTag } from "../types/chart";

interface Props {
  onBack: () => void;
}

function DeleteTagDialog({
  tag,
  onCancel,
  onDeleted,
}: {
  tag: ChartTag;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteChartTag(tag.id);
      onDeleted();
    } catch (err) {
      setError(`タグの削除に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
      setDeleting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-tag-heading"
      aria-describedby="delete-tag-description"
      onCancel={(e) => {
        e.preventDefault();
        if (!deleting) onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-6 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <h2 id="delete-tag-heading" className="text-lg font-bold">タグの削除</h2>
      <p className="mt-3 break-all text-sm font-medium">#{tag.title}</p>
      <p id="delete-tag-description" className="mt-3 text-sm text-muted">
        全ての譜面からこのタグを削除します。
      </p>
      {error && (
        <p role="alert" className="mt-4 break-words rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          disabled={deleting}
          onClick={onCancel}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          ちょっとまって
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "削除中…" : "理解した"}
        </button>
      </div>
    </dialog>
  );
}

export default function CreateChartTag({ onBack }: Props) {
  const { tags, loading, error, reload } = useChartTags();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const selectedTag = tags.find((tag) => tag.id === selectedTagId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || confirmingDelete) return;

    const name = title.trim();
    if (!name) {
      setResult({ ok: false, message: "タグ名を入力してください" });
      return;
    }
    if (tags.some((tag) => tag.title === name)) {
      setResult({ ok: false, message: "この名前のタグは既に作成されています。" });
      return;
    }

    setResult(null);
    setSubmitting(true);
    try {
      await createChartTag(name);
      setTitle("");
      setResult({ ok: true, message: `タグ「${name}」を作成しました。` });
      reload();
    } catch (err) {
      setResult({
        ok: false,
        message: `タグの作成に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">タグの作成</h1>
      </div>

      <p className="text-sm text-muted">譜面の投稿・編集画面で選択できるタグを登録します。</p>

      {result && (
        <div
          role={result.ok ? "status" : "alert"}
          className={`break-words rounded-xl border p-4 text-sm ${
            result.ok
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
          <h2 className="text-sm font-bold">タグ情報</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              タグ名 <span className="text-prism-3">*</span>
            </span>
            <input
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20 disabled:opacity-50"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setResult(null);
              }}
              placeholder="例: ギミック譜面"
              required
              disabled={submitting}
            />
          </label>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "作成中…" : "作成する"}
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6" aria-labelledby="registered-tags-heading">
        <h2 id="registered-tags-heading" className="text-sm font-bold">登録済みのタグ</h2>
        <p className="text-xs text-muted">削除するタグを選択してください。</p>
        {loading ? (
          <p className="text-sm text-muted" role="status">タグ一覧を読み込み中…</p>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-red-300" role="alert">タグ一覧を取得できませんでした: {error}</p>
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-text"
            >
              再読み込み
            </button>
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted">登録されているタグはありません。</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.id} className="max-w-full">
                <button
                  type="button"
                  aria-pressed={selectedTagId === tag.id}
                  disabled={submitting}
                  onClick={() => setSelectedTagId((current) => current === tag.id ? null : tag.id)}
                  className={`max-w-full break-all rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    selectedTagId === tag.id
                      ? "border-prism-2 bg-prism-2/20 text-prism-2"
                      : "border-border text-muted hover:text-text"
                  }`}
                >
                  #{tag.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && selectedTag && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="min-w-0 break-all text-sm text-muted">#{selectedTag.title} を選択中</span>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirmingDelete(true)}
              className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}
      </section>
      {confirmingDelete && selectedTag && (
        <DeleteTagDialog
          tag={selectedTag}
          onCancel={() => setConfirmingDelete(false)}
          onDeleted={() => {
            setConfirmingDelete(false);
            setSelectedTagId(null);
            setResult({ ok: true, message: `タグ「${selectedTag.title}」を削除しました。` });
            reload();
          }}
        />
      )}
    </div>
  );
}
