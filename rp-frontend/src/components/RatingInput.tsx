import { RATING_MAX } from "../lib/constants";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function RatingInput({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={0}
        max={RATING_MAX}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-prism-2"
      />
      <div className="flex h-9 w-20 items-center rounded-lg border border-transparent bg-surface-2 text-sm font-extrabold text-text transition-colors focus-within:border-prism-2/60 focus-within:ring-2 focus-within:ring-prism-2/20">
        <input
          type="number"
          min={0}
          max={RATING_MAX}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={(e) => e.currentTarget.select()}
          className="h-full min-w-0 flex-1 bg-transparent px-1 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="レベル"
        />
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, Math.min(RATING_MAX, value + 1)))}
            disabled={value >= RATING_MAX}
            className="flex flex-1 items-center bg-transparent px-1 leading-none disabled:opacity-40"
            aria-label="レベルを上げる"
          >
            ︿
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(0, Math.min(RATING_MAX, value - 1)))}
            disabled={value <= 0}
            className="flex flex-1 items-center bg-transparent px-1 leading-none disabled:opacity-40"
            aria-label="レベルを下げる"
          >
            ﹀
          </button>
        </div>
      </div>
    </div>
  );
}
