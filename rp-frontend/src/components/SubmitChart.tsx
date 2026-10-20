import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { ChartPostData, UserSimpleInfo } from "../types/chart";
import { postChart } from "../lib/api";
import {
  CHART_FILE_PRIVATE,
  CHART_FILE_PUBLIC,
  DIFFICULTIES,
  FILE_SIZE_LIMIT,
  GENRES,
  MAX_COLLABORATORS,
  MAX_TAGS,
  PUBLISH_STATUS,
  R18_ON,
  R18_SAFE,
  RATING_MAX,
} from "../lib/constants";
import FileDropField from "./FileDropField";
import AudioPreviewEditor from "./AudioPreviewEditor";
import RatingInput from "./RatingInput";
import CollaboratorPicker from "./CollaboratorPicker";

// 開発都合で「タグ」セクションを一時非表示にする場合はfalseにする（合作は常時表示）。
const SHOW_TAGS = false;

// A small built-in tag set; replace with `GET /api/chart/tag` once available.
const SAMPLE_TAGS = [
  { id: 1, title: "おすすめ" },
  { id: 2, title: "高難易度" },
  { id: 3, title: "合作" },
  { id: 5, title: "定番" },
  { id: 8, title: "初心者向け" },
  { id: 9, title: "ゲーム音楽" },
  { id: 10, title: "話題" },
];

interface FormState {
  title: string;
  composer: string;
  vocal: string;
  displayName: string;
  description: string;
  genre: number;
  difficulty: number;
  rating: number;
  tags: number[];
  collaborators: UserSimpleInfo[];
  r18: boolean;
  chartFilePublic: boolean;
  startTime: number;
}

const makeInitial = (displayName: string): FormState => ({
  title: "",
  composer: "",
  vocal: "",
  displayName,
  description: "",
  genre: GENRES[0].id,
  difficulty: 5, // MASTER
  rating: 25,
  tags: [],
  collaborators: [],
  r18: false,
  chartFilePublic: false,
  startTime: 40,
});

function fmtTime(sec: number): string {
  const tenths = Math.max(0, Math.round(sec * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
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
  onBack: () => void;
  onPosted: () => void;
  defaultDisplayName?: string;
}

export default function SubmitChart({ onBack, onPosted, defaultDisplayName = "" }: Props) {
  const [form, setForm] = useState<FormState>(() => makeInitial(defaultDisplayName));
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [jacketFile, setJacketFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleTag = (id: number) =>
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(id)
        ? p.tags.filter((t) => t !== id)
        : p.tags.length < MAX_TAGS
          ? [...p.tags, id]
          : p.tags,
    }));

  // Client-side validation mirroring ChartPostRequest (schemas/requests.py).
  function validate(): string[] {
    const e: string[] = [];
    if (!form.title.trim()) e.push("タイトルを入力してください");
    if (!form.composer.trim()) e.push("作曲者を入力してください");
    if (!form.vocal.trim()) e.push("ボーカルを入力してください");
    if (!form.displayName.trim()) e.push("表示名を入力してください");
    for (const [label, v] of [
      ["タイトル", form.title],
      ["作曲者", form.composer],
      ["ボーカル", form.vocal],
      ["表示名", form.displayName],
    ] as const) {
      if (v.length > 50) e.push(`${label}は50文字以下にしてください`);
    }
    if (form.description.length > 200) e.push("説明は200文字以下にしてください");
    if (form.rating < 0 || form.rating > RATING_MAX) e.push("レベルは0〜50で指定してください");
    if (form.tags.length > MAX_TAGS) e.push("タグは4個以内にしてください");
    if (form.collaborators.length > MAX_COLLABORATORS)
      e.push("合作者は20人以内にしてください");
    if (!chartFile) e.push("譜面ファイルを選択してください");
    if (!bgmFile) e.push("BGMファイルを選択してください");
    if (!jacketFile) e.push("ジャケット画像を選択してください");
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

    const data: ChartPostData = {
      title: form.title.trim(),
      composer: form.composer.trim(),
      vocal: form.vocal.trim(),
      genre: form.genre,
      difficulty: form.difficulty,
      rating: form.rating,
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      // New charts are always saved as drafts; publishing happens later from the
      // edit screen after test-playing. (Scheduled publishing is not yet built.)
      publishStatus: PUBLISH_STATUS.PRIVATE,
      scheduledAt: null,
      r18: form.r18 ? R18_ON : R18_SAFE,
      collaborators: form.collaborators.map((u) => u.id),
      tags: form.tags,
      chartFilePublishStatus: form.chartFilePublic ? CHART_FILE_PUBLIC : CHART_FILE_PRIVATE,
      startTime: form.startTime,
    };

    setSubmitting(true);
    try {
      await postChart(data, {
        chart: chartFile!,
        bgm: bgmFile!,
        jacket: jacketFile!,
      });
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
        <h1 className="text-2xl font-extrabold tracking-tight">譜面を投稿</h1>
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
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.ok
              ? "border-prism-4/40 bg-prism-4/10 text-prism-4"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {result.message}
        </div>
      )}

      <Card title="楽曲情報">
        <Field label="タイトル" required counter={`${form.title.length}/50`}>
          <input
            className={inputClass}
            value={form.title}
            maxLength={50}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例: テオ"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="作曲者" required counter={`${form.composer.length}/50`}>
            <input
              className={inputClass}
              value={form.composer}
              maxLength={50}
              onChange={(e) => set("composer", e.target.value)}
              placeholder="例: Omoi"
            />
          </Field>
          <Field label="ボーカル" required counter={`${form.vocal.length}/50`}>
            <input
              className={inputClass}
              value={form.vocal}
              maxLength={50}
              onChange={(e) => set("vocal", e.target.value)}
              placeholder="例: 初音ミク"
            />
          </Field>
        </div>

        <Field label="ジャンル" required>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const active = form.genre === g.id;
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => set("genre", g.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                  style={
                    active
                      ? { backgroundColor: g.color, borderColor: g.color, color: "#111" }
                      : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
                  }
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="説明" counter={`${form.description.length}/200`}>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={form.description}
            maxLength={200}
            onChange={(e) => set("description", e.target.value)}
            placeholder="譜面のこだわりポイントや遊び方など"
          />
        </Field>
      </Card>

      <Card title="難易度">
        <Field label="難易度名" required>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => {
              const active = form.difficulty === d.id;
              return (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => set("difficulty", d.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-bold uppercase transition-all"
                  style={
                    active
                      ? { backgroundColor: d.color, borderColor: d.color, color: "#111" }
                      : { borderColor: "var(--color-border)", color: d.color }
                  }
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={`レベル (0〜50)`} required>
          <RatingInput value={form.rating} onChange={(value) => set("rating", value)} />
        </Field>
      </Card>

      <Card title="ファイル">
        <FileDropField
          label="譜面ファイル"
          hint=".sus / .usc / .json.gz など"
          accept=".sus,.usc,.mmws,.json.gz,application/json"
          maxSize={FILE_SIZE_LIMIT.chart}
          file={chartFile}
          onSelect={setChartFile}
        />
        <FileDropField
          label="BGM"
          hint=".mp3 / .wav / .ogg"
          accept="audio/*"
          maxSize={FILE_SIZE_LIMIT.bgm}
          file={bgmFile}
          onSelect={(f) => {
            setBgmFile(f);
            if (f) setEditorOpen(true); // let the user set the preview position right away
          }}
        />

        {bgmFile && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm">
            <span>
              プレビュー開始位置：
              <span className="font-bold text-text">{form.startTime}秒</span>
              <span className="text-muted">（{fmtTime(form.startTime)}）</span>
            </span>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-text"
            >
              変更
            </button>
          </div>
        )}

        <FileDropField
          label="ジャケット画像"
          hint=".png / .jpg（正方形推奨）"
          accept="image/*"
          maxSize={FILE_SIZE_LIMIT.jacket}
          file={jacketFile}
          onSelect={setJacketFile}
          preview
        />
      </Card>

      <Card title={SHOW_TAGS ? "タグ・合作" : "合作"}>
        {SHOW_TAGS && (
          <Field label={`タグ（最大${MAX_TAGS}個・${form.tags.length}個選択中）`}>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TAGS.map((t) => {
                const active = form.tags.includes(t.id);
                const disabled = !active && form.tags.length >= MAX_TAGS;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "border-prism-2 bg-prism-2/20 text-prism-2"
                        : disabled
                          ? "cursor-not-allowed border-border/50 text-muted/40"
                          : "border-border text-muted hover:text-text"
                    }`}
                  >
                    #{t.title}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label={`合作ユーザー（最大${MAX_COLLABORATORS}人・${form.collaborators.length}人選択中）`}>
          <CollaboratorPicker
            value={form.collaborators}
            onChange={(users) => set("collaborators", users)}
          />
        </Field>
      </Card>

      <Card title="公開設定">
        <Field label="表示名（作者名）" required counter={`${form.displayName.length}/50`}>
          <input
            className={inputClass}
            value={form.displayName}
            maxLength={50}
            onChange={(e) => set("displayName", e.target.value)}
            placeholder="譜面に表示される作者名"
          />
        </Field>

        <div className="space-y-2">
          <div className="flex w-full items-center gap-3 rounded-xl border border-prism-2/60 bg-prism-2/10 p-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-prism-2">
              <span className="h-2.5 w-2.5 rounded-full bg-prism-2" />
            </span>
            <span>
              <span className="block text-sm font-medium">非公開</span>
              <span className="text-xs text-muted">
                投稿時は非公開で保存されます。テストプレイ後、編集画面から公開できます。
              </span>
            </span>
          </div>
        </div>

        <div className="space-y-3 border-t border-border/70 pt-4">
          <label className="flex items-center justify-between text-sm">
            <span>譜面ファイルを公開する</span>
            <input
              type="checkbox"
              checked={form.chartFilePublic}
              onChange={(e) => set("chartFilePublic", e.target.checked)}
              className="h-4 w-4 accent-prism-2"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>R18 コンテンツを含む</span>
            <input
              type="checkbox"
              checked={form.r18}
              onChange={(e) => set("r18", e.target.checked)}
              className="h-4 w-4 accent-prism-3"
            />
          </label>
        </div>
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

      {editorOpen && bgmFile && (
        <AudioPreviewEditor
          file={bgmFile}
          value={form.startTime}
          onApply={(s) => set("startTime", s)}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </form>
  );
}
