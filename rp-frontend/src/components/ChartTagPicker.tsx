import type { ChartTag } from "../types/chart";
import { MAX_TAGS } from "../lib/constants";

interface Props {
  tags: ChartTag[];
  selectedIds: number[];
  loading: boolean;
  error: string | null;
  onChange: (selectedIds: number[]) => void;
  onRetry: () => void;
}

export default function ChartTagPicker({
  tags,
  selectedIds,
  loading,
  error,
  onChange,
  onRetry,
}: Props) {
  function toggleTag(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else if (selectedIds.length < MAX_TAGS) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">タグ</span>
        <span className="text-xs text-muted">
          最大{MAX_TAGS}個・{selectedIds.length}個選択中
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-muted">タグ一覧を読み込み中…</p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-300">
          <span>タグ一覧を取得できませんでした: {error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-text"
          >
            再読み込み
          </button>
        </div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted">登録されているタグはありません。</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedIds.includes(tag.id);
            const disabled = !active && selectedIds.length >= MAX_TAGS;
            return (
              <button
                type="button"
                key={tag.id}
                aria-pressed={active}
                onClick={() => toggleTag(tag.id)}
                disabled={disabled}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-prism-2 bg-prism-2/20 text-prism-2"
                    : disabled
                      ? "cursor-not-allowed border-border/50 text-muted/40"
                      : "border-border text-muted hover:text-text"
                }`}
              >
                #{tag.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
