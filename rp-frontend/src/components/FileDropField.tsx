import { useId, useRef, useState } from "react";

interface Props {
  label: string;
  hint: string;
  accept: string;
  /** Upper bound in bytes; files larger than this are rejected. */
  maxSize: number;
  file: File | null;
  onSelect: (file: File | null) => void;
  /** When true, renders a square image preview (for the jacket). */
  preview?: boolean;
  /** Shows the required `*` marker. Defaults to true. */
  required?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export default function FileDropField({
  label,
  hint,
  accept,
  maxSize,
  file,
  onSelect,
  preview = false,
  required = true,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept2 = (f: File | null) => {
    if (!f) {
      onSelect(null);
      setError(null);
      return;
    }
    if (f.size > maxSize) {
      setError(`ファイルサイズが上限（${formatSize(maxSize)}）を超えています`);
      return;
    }
    setError(null);
    onSelect(f);
  };

  const previewUrl = preview && file ? URL.createObjectURL(file) : null;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">
          {label} {required && <span className="text-prism-3">*</span>}
        </span>
        <span className="text-xs text-muted">上限 {formatSize(maxSize)}</span>
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept2(e.dataTransfer.files[0] ?? null);
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition-colors ${
          dragging
            ? "border-prism-2 bg-prism-2/10"
            : file
              ? "border-prism-4/50 bg-surface-2"
              : "border-border bg-surface hover:border-prism-2/50"
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        ) : (
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl ${
              file ? "bg-prism-4/15 text-prism-4" : "bg-surface-2 text-muted"
            }`}
          >
            {file ? "✓" : "＋"}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {file ? (
            <>
              <span className="block truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted">{formatSize(file.size)}</span>
            </>
          ) : (
            <>
              <span className="block text-sm">クリック、またはドラッグ＆ドロップ</span>
              <span className="text-xs text-muted">{hint}</span>
            </>
          )}
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              accept2(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-prism-3"
          >
            削除
          </button>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => accept2(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
