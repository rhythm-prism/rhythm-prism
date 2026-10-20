import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { AnnouncePostData } from "../types/announcement";
import { postAnnouncement } from "../lib/api";
import { ICON_SIZE_LIMIT } from "../lib/constants";
import FileDropField from "./FileDropField";

interface FormState {
  title: string;
  subtitle: string;
  displayName: string;
  description: string;
}

const makeInitial = (displayName: string): FormState => ({
  title: "",
  subtitle: "",
  displayName,
  description: "",
});

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
  onBack: () => void;
  onPosted: () => void;
  defaultDisplayName?: string;
}

export default function SubmitAnnouncement({ onBack, onPosted, defaultDisplayName = "" }: Props) {
  const [form, setForm] = useState<FormState>(() => makeInitial(defaultDisplayName));
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  // Client-side validation mirroring AnnouncePostRequest (schemas/requests.py),
  // which has no length limits beyond requiring non-empty strings.
  function validate(): string[] {
    const e: string[] = [];
    if (!form.title.trim()) e.push("タイトルを入力してください");
    if (!form.subtitle.trim()) e.push("サブタイトルを入力してください");
    if (!form.displayName.trim()) e.push("表示名を入力してください");
    if (!form.description.trim()) e.push("本文を入力してください");
    if (!thumbnailFile) e.push("サムネイル画像を選択してください");
    if (!bannerFile) e.push("バナー画像を選択してください");
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const data: AnnouncePostData = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim(),
    };

    setSubmitting(true);
    try {
      await postAnnouncement(data, thumbnailFile!, bannerFile!);
      onPosted();
    } catch (err) {
      setResult({
        ok: false,
        message: `投稿に失敗しました: ${err instanceof Error ? err.message : "unknown"}`,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">お知らせを投稿</h1>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          <p className="mb-1 font-semibold">入力内容を確認してください</p>
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {result.message}
        </div>
      )}

      <Card title="お知らせ情報">
        <Field label="タイトル" required>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例: メンテナンスのお知らせ"
          />
        </Field>

        <Field label="サブタイトル" required>
          <input
            className={inputClass}
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="例: 2026/10/01 2:00〜5:00 に実施します"
          />
        </Field>

        <Field label="表示名（投稿者名）" required>
          <input
            className={inputClass}
            value={form.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="お知らせに表示される投稿者名"
          />
        </Field>

        <Field label="本文" required>
          <textarea
            className={`${inputClass} min-h-40 resize-y`}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="お知らせの内容"
          />
        </Field>
      </Card>

      <Card title="サムネイル">
        <FileDropField
          label="サムネイル画像"
          hint=".png / .jpg（正方形推奨）"
          accept="image/*"
          maxSize={ICON_SIZE_LIMIT}
          file={thumbnailFile}
          onSelect={setThumbnailFile}
          preview
        />
      </Card>

      <Card title="バナー">
        <p className="-mt-2 text-xs text-muted">
          トップページのスライダーに表示されます。推奨サイズ 1280×720（16:9）。それ以外の比率は黒帯でパディングされます。
        </p>
        <FileDropField
          label="バナー画像"
          hint=".png / .jpg（16:9推奨）"
          accept="image/*"
          maxSize={ICON_SIZE_LIMIT}
          file={bannerFile}
          onSelect={setBannerFile}
          preview
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
          {submitting ? "送信中…" : "投稿する"}
        </button>
      </div>
    </form>
  );
}
