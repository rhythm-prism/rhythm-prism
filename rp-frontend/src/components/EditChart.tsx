import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ChartDetailInfo, ChartEditData, ChartEditFiles, UserSimpleInfo } from "../types/chart";
import { deleteChart, editChart, fetchChartDetail } from "../lib/api";
import {
  CHART_CONVERSION_COMPLETE,
  CHART_FILE_PRIVATE,
  CHART_FILE_PUBLIC,
  DIFFICULTIES,
  FILE_SIZE_LIMIT,
  GENRES,
  MAX_COLLABORATORS,
  MAX_TAGS,
  PERMISSION,
  PUBLISH_STATUS,
  R18_ON,
  R18_SAFE,
  RATING_MAX,
} from "../lib/constants";
import FileDropField from "./FileDropField";
import AudioPreviewEditor from "./AudioPreviewEditor";
import RatingInput from "./RatingInput";
import CollaboratorPicker from "./CollaboratorPicker";
import { useAuth } from "../auth/context";
import ChartTagPicker from "./ChartTagPicker";
import { useChartTags } from "../hooks/useChartTags";

function fmtTime(sec: number): string {
  const tenths = Math.max(0, Math.round(sec * 10));
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
}

// Two states for now; scheduled publishing will be added later.
const PUBLISH_CHOICES: { id: number; label: string; hint: string }[] = [
  { id: PUBLISH_STATUS.PRIVATE, label: "非公開", hint: "自分だけが見られる状態です" },
  { id: PUBLISH_STATUS.PUBLIC, label: "公開", hint: "一般公開され、検索に表示されます" },
];

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20";

interface FormState {
  title: string;
  composer: string;
  vocal: string;
  displayName: string;
  description: string;
  genre: number;
  difficulty: number;
  rating: number;
  r18: boolean;
  publishStatus: number;
  chartFilePublic: boolean;
  collaborators: UserSimpleInfo[];
  tags: number[];
  startTime: number;
}

function fromDetail(d: ChartDetailInfo): FormState {
  return {
    title: d.title,
    composer: d.composer ?? "",
    vocal: d.vocal ?? "",
    displayName: d.author,
    description: d.description ?? "",
    genre: d.genre,
    difficulty: d.difficulty,
    rating: d.rating,
    r18: d.r18,
    // Normalize any non-public status (incl. scheduled) to "private" for now.
    publishStatus:
      d.publishStatus === PUBLISH_STATUS.PUBLIC
        ? PUBLISH_STATUS.PUBLIC
        : PUBLISH_STATUS.PRIVATE,
    // originalChart is only returned when the chart file is public (see types/chart.ts).
    chartFilePublic: !!d.originalChart,
    collaborators: d.collaboratorUsers ?? [],
    tags: d.tags.map((tag) => tag.id),
    // Not returned by the detail endpoint; only used when re-uploading the BGM.
    startTime: 40,
  };
}

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
  chartId: string;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function EditChart({ chartId, onBack, onSaved, onDeleted }: Props) {
  const { user } = useAuth();
  const { tags, loading: tagsLoading, error: tagsError, reload: reloadTags } = useChartTags();
  const canEditTags = (user?.permission ?? PERMISSION.NORMAL) > PERMISSION.NORMAL;
  const [form, setForm] = useState<FormState | null>(null);
  const [detail, setDetail] = useState<ChartDetailInfo | null>(null);
  const [conversionStatus, setConversionStatus] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [jacketFile, setJacketFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchChartDetail(chartId, ctrl.signal)
      .then((d) => {
        setForm(fromDetail(d));
        setDetail(d);
        setConversionStatus(d.conversionStatus);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
      });
    return () => ctrl.abort();
  }, [chartId]);

  const isOwner = !!user && !!detail && user.id === detail.authorUser.id;
  const isAdmin = (user?.permission ?? 0) >= PERMISSION.ADMINISTRATOR;
  const canDelete = isOwner || isAdmin;

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteChart(chartId);
      onDeleted();
    } catch (err) {
      setDeleteError(`削除に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

  function validate(f: FormState): string[] {
    const e: string[] = [];
    if (!f.title.trim()) e.push("タイトルを入力してください");
    if (!f.composer.trim()) e.push("作曲者を入力してください");
    if (!f.vocal.trim()) e.push("ボーカルを入力してください");
    if (!f.displayName.trim()) e.push("表示名を入力してください");
    for (const [label, v] of [
      ["タイトル", f.title],
      ["作曲者", f.composer],
      ["ボーカル", f.vocal],
      ["表示名", f.displayName],
    ] as const) {
      if (v.length > 50) e.push(`${label}は50文字以下にしてください`);
    }
    if (f.description.length > 200) e.push("説明は200文字以下にしてください");
    if (f.rating < 0 || f.rating > RATING_MAX) e.push("レベルは0〜50で指定してください");
    if (f.collaborators.length > MAX_COLLABORATORS)
      e.push(`合作ユーザーは${MAX_COLLABORATORS}人以内にしてください`);
    if (canEditTags && f.tags.length > MAX_TAGS) e.push(`タグは${MAX_TAGS}個以内にしてください`);
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

    const data: ChartEditData = {
      title: f.title.trim(),
      composer: f.composer.trim(),
      vocal: f.vocal.trim(),
      genre: f.genre,
      difficulty: f.difficulty,
      rating: f.rating,
      displayName: f.displayName.trim(),
      description: f.description.trim(),
      r18: f.r18 ? R18_ON : R18_SAFE,
      publishStatus: f.publishStatus,
      chartFilePublishStatus: f.chartFilePublic ? CHART_FILE_PUBLIC : CHART_FILE_PRIVATE,
      collaborators: f.collaborators.map((u) => u.id),
    };
    if (canEditTags && !tagsError) data.tags = f.tags;
    // Preview start only matters when the BGM is being replaced.
    if (bgmFile) data.startTime = f.startTime;

    const files: ChartEditFiles = {};
    if (chartFile) files.chart = chartFile;
    if (bgmFile) files.bgm = bgmFile;
    if (jacketFile) files.jacket = jacketFile;

    setSubmitting(true);
    try {
      await editChart(chartId, data, files);
      onSaved();
    } catch (err) {
      setResult(`保存に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-extrabold tracking-tight">譜面を編集</h1>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "削除中…" : "譜面を削除する"}
          </button>
        )}
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {deleteError}
        </div>
      )}

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
          {result}
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

        <Field label="レベル (0〜50)" required>
          <RatingInput value={form.rating} onChange={(value) => set("rating", value)} />
        </Field>
      </Card>

      <Card title="ファイル">
        <p className="-mt-2 text-xs text-muted">
          変更したいファイルだけ選択してください。未選択の項目は現在のファイルが維持されます。
        </p>
        <FileDropField
          label="譜面ファイル"
          hint=".sus / .usc / .json.gz など"
          accept=".sus,.usc,.mmws,.json.gz,application/json"
          maxSize={FILE_SIZE_LIMIT.chart}
          file={chartFile}
          onSelect={setChartFile}
          required={false}
        />
        <FileDropField
          label="BGM"
          hint=".mp3 / .wav / .ogg"
          accept="audio/*"
          maxSize={FILE_SIZE_LIMIT.bgm}
          file={bgmFile}
          onSelect={(f) => {
            setBgmFile(f);
            if (f) setEditorOpen(true); // choose the preview position for the new BGM
          }}
          required={false}
        />

        {bgmFile && form && (
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
          required={false}
        />
      </Card>

      <Card title={canEditTags ? "タグ・合作" : "合作"}>
        {canEditTags && (
          <ChartTagPicker
            tags={tags}
            selectedIds={form.tags}
            loading={tagsLoading}
            error={tagsError}
            onChange={(selectedIds) => set("tags", selectedIds)}
            onRetry={reloadTags}
          />
        )}
        <Field label={`合作ユーザー（最大${MAX_COLLABORATORS}人・${form.collaborators.length}人選択中）`}>
          <CollaboratorPicker
            value={form.collaborators}
            onChange={(users) => set("collaborators", users)}
            excludeIds={detail ? [detail.authorUser.id] : []}
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

        {conversionStatus !== null && conversionStatus !== CHART_CONVERSION_COMPLETE && (
          <p className="-mt-2 text-xs text-prism-2">
            ファイルを変換処理中のため、完了するまで公開できません。
          </p>
        )}
        <div className="space-y-2">
          {PUBLISH_CHOICES.map((opt) => {
            const active = form.publishStatus === opt.id;
            const disabled =
              opt.id === PUBLISH_STATUS.PUBLIC &&
              conversionStatus !== null &&
              conversionStatus !== CHART_CONVERSION_COMPLETE;
            return (
              <button
                type="button"
                key={opt.id}
                disabled={disabled}
                onClick={() => set("publishStatus", opt.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-border/50 opacity-50"
                    : active
                      ? "border-prism-2/60 bg-prism-2/10"
                      : "border-border bg-surface"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? "border-prism-2" : "border-border"
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-prism-2" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted">{opt.hint}</span>
                </span>
              </button>
            );
          })}
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
          {submitting ? "保存中…" : "変更を保存"}
        </button>
      </div>

      {editorOpen && bgmFile && form && (
        <AudioPreviewEditor
          file={bgmFile}
          value={form.startTime}
          onApply={(s) => set("startTime", s)}
          onClose={() => setEditorOpen(false)}
        />
      )}

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
            <h2 className="mb-4 text-lg font-bold">譜面を削除しますか？</h2>
            <p className="text-sm leading-relaxed text-muted">
              譜面を削除します。よろしいですか？
              <br />
              （譜面は完全に削除されませんが、復元には管理者への申請が必要となります）
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
