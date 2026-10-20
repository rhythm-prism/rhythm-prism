import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AnnounceEditData, AnnounceInfo } from "../types/announcement";
import { deleteAnnouncement, editAnnouncement, fetchAnnouncements } from "../lib/api";
import { ICON_SIZE_LIMIT } from "../lib/constants";
import FileDropField from "./FileDropField";

interface FormState {
  title: string;
  subtitle: string;
  displayName: string;
  description: string;
}

function fromInfo(a: AnnounceInfo): FormState {
  return {
    title: a.title,
    subtitle: a.subtitle,
    displayName: a.displayName,
    description: a.description,
  };
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20";

function Field({
  label,
  required,
  children,
  counter,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  counter?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">
          {label} {required && <span className="text-prism-3">*</span>}
        </span>
        {counter && <span className="text-xs text-muted">{counter}</span>}
      </span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

interface Props {
  postId: string;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function EditAnnouncement({ postId, onBack, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnnouncements(ctrl.signal)
      .then((list) => {
        const found = list.find((a) => a.id === postId);
        if (!found) {
          setLoadError("お知らせが見つかりません");
          return;
        }
        setForm(fromInfo(found));
        setCurrentThumbnailUrl(found.thumbnail?.url ?? null);
        setCurrentBannerUrl(found.banner?.url ?? null);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      });
    return () => ctrl.abort();
  }, [postId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

  function validate(f: FormState): string[] {
    const e: string[] = [];
    if (!f.title.trim()) e.push("タイトルを入力してください");
    if (!f.subtitle.trim()) e.push("サブタイトルを入力してください");
    if (!f.displayName.trim()) e.push("表示名を入力してください");
    if (!f.description.trim()) e.push("本文を入力してください");
    return e;
  }

  async function handleSubmit(f: FormState) {
    setResult(null);
    const errs = validate(f);
    setErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const data: AnnounceEditData = {
      title: f.title.trim(),
      subtitle: f.subtitle.trim(),
      displayName: f.displayName.trim(),
      description: f.description.trim(),
    };

    setSubmitting(true);
    try {
      await editAnnouncement(postId, data, thumbnailFile, bannerFile);
      onSaved();
    } catch (err) {
      setResult(`保存に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAnnouncement(postId);
      onDeleted();
    } catch (err) {
      setDeleteError(`削除に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {loadError}
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(form);
      }}
      className="mx-auto w-full max-w-3xl space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">お知らせを編集</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "削除中…" : "お知らせを削除する"}
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {deleteError}
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {result && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {result}
        </div>
      )}

      <Card title="お知らせ情報">
        <Field label="タイトル" required>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <Field label="サブタイトル" required>
          <input
            className={inputClass}
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </Field>

        <Field label="表示名（投稿者名）" required>
          <input
            className={inputClass}
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </Field>

        <Field label="本文" required>
          <textarea
            className={`${inputClass} min-h-40 resize-y`}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </Card>

      <Card title="サムネイル">
        {currentThumbnailUrl && !thumbnailFile && (
          <div className="flex items-center gap-3">
            <img
              src={currentThumbnailUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
            <p className="text-xs text-muted">
              現在のサムネイルです。変更したい場合のみ下から新しい画像を選択してください。
            </p>
          </div>
        )}
        <FileDropField
          label="サムネイル画像"
          hint=".png / .jpg（正方形推奨）"
          accept="image/*"
          maxSize={ICON_SIZE_LIMIT}
          file={thumbnailFile}
          onSelect={setThumbnailFile}
          preview
          required={false}
        />
      </Card>

      <Card title="バナー">
        <p className="-mt-2 text-xs text-muted">
          トップページのスライダーに表示されます。推奨サイズ 1280×720（16:9）。それ以外の比率は黒帯でパディングされます。
        </p>
        {currentBannerUrl && !bannerFile && (
          <div className="flex items-center gap-3">
            <img
              src={currentBannerUrl}
              alt=""
              className="h-16 w-24 shrink-0 rounded-xl object-cover"
            />
            <p className="text-xs text-muted">
              現在のバナーです。変更したい場合のみ下から新しい画像を選択してください。
            </p>
          </div>
        )}
        <FileDropField
          label="バナー画像"
          hint=".png / .jpg（16:9推奨）"
          accept="image/*"
          maxSize={ICON_SIZE_LIMIT}
          file={bannerFile}
          onSelect={setBannerFile}
          preview
          required={false}
        />
      </Card>

      <div className="flex items-center justify-end gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "保存中…" : "変更を保存"}
        </button>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold">お知らせを削除しますか？</h2>
            <p className="text-sm leading-relaxed text-muted">
              このお知らせを削除します。この操作は取り消せません。
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
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
    </form>
  );
}
