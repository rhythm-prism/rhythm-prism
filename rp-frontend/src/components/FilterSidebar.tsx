import type { ReactNode } from "react";
import type { ChartSearchParams } from "../types/chart";
import { DIFFICULTIES, GENRES, RATING_MAX } from "../lib/constants";

interface Props {
  params: ChartSearchParams;
  onChange: (patch: Partial<ChartSearchParams>) => void;
  onReset: () => void;
}

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

const RATING_OPTIONS = Array.from({ length: RATING_MAX + 1 }, (_, i) => i);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border/70 pb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between text-sm"
      role="switch"
      aria-checked={checked}
    >
      <span className={checked ? "text-text" : "text-muted"}>{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-prism-2" : "bg-border"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export default function FilterSidebar({ params, onChange, onReset }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">絞り込み</h2>
        <button onClick={onReset} className="text-xs text-muted transition-colors hover:text-prism-3">
          リセット
        </button>
      </div>

      <Section title="ジャンル">
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = params.genreIds.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => onChange({ genreIds: toggleId(params.genreIds, g.id) })}
                className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
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
      </Section>

      <Section title="難易度">
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => {
            const active = params.difficultyIds.includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => onChange({ difficultyIds: toggleId(params.difficultyIds, d.id) })}
                className="rounded-lg border px-2.5 py-1 text-xs font-bold uppercase transition-all"
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
      </Section>

      <Section title="レベル">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted">最低</span>
            <select
              value={params.minRating}
              onChange={(e) =>
                onChange({ minRating: Math.min(Number(e.target.value), params.maxRating) })
              }
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none transition-colors focus:border-accent/60"
            >
              {RATING_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">最高</span>
            <select
              value={params.maxRating}
              onChange={(e) =>
                onChange({ maxRating: Math.max(Number(e.target.value), params.minRating) })
              }
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none transition-colors focus:border-accent/60"
            >
              {RATING_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section title="オプション">
        <div className="space-y-3">
          <Toggle
            label="合作譜面のみ"
            checked={params.collabo}
            onClick={() => onChange({ collabo: !params.collabo })}
          />
          <Toggle
            label="R18 を表示"
            checked={params.r18}
            onClick={() => onChange({ r18: !params.r18 })}
          />
        </div>
      </Section>
    </div>
  );
}
