import { useEffect, useRef, useState } from "react";

const PREVIEW_LEN = 15; // seconds of preview playback
const VOLUME_STORAGE_KEY = "rhythm-prism.audioPreviewVolume";

function loadVolume(): number {
  try {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (saved !== null && saved.trim() !== "") {
      const volume = Number(saved);
      if (Number.isInteger(volume) && volume >= 0 && volume <= 100) return volume;
    }
  } catch {
    // Preview remains usable when browser storage is unavailable.
  }
  return 100;
}

function fmt(sec: number): string {
  const tenths = Math.max(0, Math.round(sec * 10));
  return `${Math.floor(tenths / 600)}:${(Math.floor(tenths / 10) % 60).toString().padStart(2, "0")}.${tenths % 10}`;
}

function roundStart(sec: number): number {
  return Number.isFinite(sec) ? Math.max(0, Math.round(sec * 10) / 10) : 0;
}

interface Props {
  file: File;
  value: number;
  onApply: (start: number) => void;
  onClose: () => void;
}

/**
 * Popup editor for the preview start position (seconds -> `startTime`).
 * The number input works immediately; the slider appears once the duration is
 * known. Nothing blocks on loading.
 */
export default function AudioPreviewEditor({ file, value, onApply, onClose }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopAtRef = useRef<number | null>(null);
  const fixedRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(roundStart(value));
  const [volume, setVolume] = useState(loadVolume);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Set the source imperatively and revoke it in the same effect's cleanup.
  // (StrictMode's dev remount would otherwise revoke a URL still in use, which
  // triggered "no supported sources".) All setState here is inside event
  // callbacks — never synchronously in the effect body.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const objectUrl = URL.createObjectURL(file);
    fixedRef.current = false;
    a.src = objectUrl;

    const commit = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
        return true;
      }
      return false;
    };
    const onMeta = () => {
      if (commit()) return;
      // Blob duration can report Infinity until seeked to the end — do it once.
      if (!fixedRef.current) {
        fixedRef.current = true;
        const onSeek = () => {
          if (commit()) {
            a.removeEventListener("timeupdate", onSeek);
            a.currentTime = 0;
          }
        };
        a.addEventListener("timeupdate", onSeek);
        try {
          a.currentTime = 1e101;
        } catch {
          // ignore — the number input still works
        }
      }
    };
    const onTime = () => {
      setCurrent(a.currentTime);
      if (stopAtRef.current != null && a.currentTime >= stopAtRef.current) {
        a.pause();
        stopAtRef.current = null;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.pause();
      a.removeAttribute("src");
      a.load();
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const knownMax = Math.floor(duration * 10) / 10;
  const clampedStart = duration > 0 ? Math.min(start, knownMax) : start;

  const playPreview = () => {
    const a = audioRef.current;
    if (!a || !a.src) return;
    a.currentTime = clampedStart;
    stopAtRef.current = clampedStart + PREVIEW_LEN;
    a.play().catch(() => {
      // e.g. unsupported codec — ignore instead of throwing an uncaught rejection
    });
  };
  const stop = () => {
    stopAtRef.current = null;
    audioRef.current?.pause();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">プレビュー開始位置</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted transition-colors hover:text-text"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <p className="truncate text-xs text-muted">{file.name}</p>

        <audio ref={audioRef} preload="metadata" className="hidden">
          <track kind="captions" />
        </audio>

        {/* Number input — always usable */}
        <div className="flex items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">開始位置（秒）</span>
            <input
              type="number"
              min={0}
              max={duration > 0 ? knownMax : undefined}
              step={0.1}
              value={clampedStart}
              onChange={(e) => setStart(roundStart(Number(e.target.value)))}
              className="w-28 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20"
            />
          </label>
          <span className="pb-3 font-mono text-sm text-prism-4">
            {fmt(clampedStart)}
            <span className="text-muted"> / {knownMax > 0 ? fmt(knownMax) : "--:--"}</span>
          </span>
        </div>

        {/* Slider — only when the duration is known */}
        {knownMax > 0 && (
          <input
            type="range"
            min={0}
            max={knownMax}
            step={0.1}
            aria-label="プレビュー開始位置"
            value={clampedStart}
            onChange={(e) => setStart(roundStart(Number(e.target.value)))}
            className="w-full accent-prism-2"
          />
        )}

        <p className="text-xs text-muted">ここから約{PREVIEW_LEN}秒がプレビューになります。</p>

        <label className="block space-y-2">
          <span className="flex justify-between text-sm font-medium">
            <span>試聴音量</span>
            <span>{volume}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(e) => {
              const nextVolume = Number(e.target.value);
              setVolume(nextVolume);
              if (audioRef.current) audioRef.current.volume = nextVolume / 100;
              try {
                localStorage.setItem(VOLUME_STORAGE_KEY, String(nextVolume));
              } catch {
                // Keep the current playback volume even if saving fails.
              }
            }}
            className="w-full accent-prism-2"
          />
          <span className="block text-xs text-muted">この画面の試聴音量のみ変更します。投稿される音源には影響しません。</span>
        </label>

        {/* Transport */}
        <div className="flex items-center gap-2">
          {playing ? (
            <button
              type="button"
              onClick={stop}
              className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-prism-2/50"
            >
              ⏸ 停止
            </button>
          ) : (
            <button
              type="button"
              onClick={playPreview}
              className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-prism-2/50"
            >
              ▶ この位置から試聴
            </button>
          )}
          <span className="w-14 text-center font-mono text-xs text-muted">{fmt(current)}</span>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(clampedStart);
              onClose();
            }}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90"
          >
            この位置に決定
          </button>
        </div>
      </div>
    </div>
  );
}
