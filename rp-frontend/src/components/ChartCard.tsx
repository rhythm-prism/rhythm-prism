import type { ChartSimpleInfo } from "../types/chart";
import { DIFFICULTY_BY_ID, GENRE_BY_ID, PUBLISH_STATUS } from "../lib/constants";
import { formatCount, formatDate, jacketGradient } from "../lib/format";

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 1.9 4.9 5.4 4.4 7.6 4.1 9.8 5 12 7.7c2.2-2.7 4.4-3.6 6.6-3.3 3.5.5 5 4.2 3.4 7.4C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

function MusicNoteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

interface Props {
  chart: ChartSimpleInfo;
  onClick?: () => void;
  /** Hide the published date (e.g. in "my charts", where drafts have none). */
  showDate?: boolean;
  /** Highlights the card as chosen (e.g. the chart picked for a charter application). */
  selected?: boolean;
  /** "sm" shrinks padding/text for dense pickers (e.g. charter application chart choice). */
  size?: "md" | "sm";
}

export default function ChartCard({
  chart,
  onClick,
  showDate = true,
  selected,
  size = "md",
}: Props) {
  const genre = GENRE_BY_ID[chart.genre];
  const diff = DIFFICULTY_BY_ID[chart.difficulty];
  const accent = diff?.color ?? "#a855f7";
  const event = chart.events[0];
  const showDateValue = showDate && chart.firstPublishedAt != null;
  const isPrivate = chart.publishStatus !== PUBLISH_STATUS.PUBLIC;

  return (
    <article
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-prism-2/50 hover:shadow-xl hover:shadow-prism-2/10 ${
        selected
          ? "border-prism-2 bg-prism-2/15 ring-2 ring-prism-2 shadow-xl shadow-prism-2/20"
          : `bg-surface ${isPrivate ? "border-dashed border-border/80" : "border-border"}`
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* Jacket */}
      <div className="relative aspect-square overflow-hidden">
        {chart.jacket?.url ? (
          <img
            src={chart.jacket.url}
            alt={chart.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
            style={{ background: jacketGradient(chart.id) }}
          />
        )}

        {/* Top badges */}
        <div className={`absolute inset-x-0 top-0 flex items-start justify-between ${size === "sm" ? "p-1.5" : "p-2.5"}`}>
          <span
            className={`flex items-center justify-center rounded-lg font-extrabold text-black shadow ${
              size === "sm" ? "h-5 min-w-5 px-1 text-xs" : "h-7 min-w-7 px-1.5 text-sm"
            }`}
            style={{ backgroundColor: accent }}
          >
            {chart.rating}
          </span>
          <div className="flex gap-1.5">
            {isPrivate && (
              <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-amber-300 backdrop-blur">
                非公開
              </span>
            )}
            {chart.collabo && (
              <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold leading-none text-cyan-300 backdrop-blur">
                合作
              </span>
            )}
            {chart.r18 && (
              <span className="rounded-md bg-red-600/85 px-2 py-1 text-[11px] font-bold leading-none text-white backdrop-blur">
                R18
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={size === "sm" ? "space-y-1.5 p-2" : "space-y-2.5 p-3.5"}>
        {size === "md" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-2 py-1 text-[11px] font-bold leading-none text-black/80"
              style={{ backgroundColor: genre?.color ?? "#c9b49c" }}
            >
              {genre?.name ?? "その他"}
            </span>
            <span
              className="rounded-md px-2 py-1 text-[11px] font-bold uppercase leading-none text-black/80"
              style={{ backgroundColor: accent }}
            >
              {diff?.name ?? "Lv."}
            </span>
            {event && (
              <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-prism-1/15 px-2 py-0.5 text-[11px] font-medium text-prism-4">
                🎪 {event.title}
              </span>
            )}
          </div>
        )}

        <h3 className={`truncate font-bold leading-tight ${size === "sm" ? "text-xs" : "text-sm"}`} title={chart.title}>
          {chart.title}
        </h3>

        {size === "sm" ? (
          <p className="truncate text-[11px] text-muted">{chart.composer || "Unknown"}</p>
        ) : (
          <div className="space-y-1 text-xs text-muted">
            <p className="flex items-center gap-1.5 truncate">
              <MusicNoteIcon />
              <span className="truncate">{chart.composer || "Unknown"}</span>
            </p>
            {chart.vocal && (
              <p className="flex items-center gap-1.5 truncate">
                <MicIcon />
                <span className="truncate">{chart.vocal}</span>
              </p>
            )}
            <p className="flex items-center gap-1.5 truncate">
              <PersonIcon />
              <span className="truncate">@{chart.author}</span>
            </p>
          </div>
        )}

        {chart.tags.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label="タグ">
            {chart.tags.map((tag) => (
              <span
                key={tag.id}
                className={`max-w-full truncate rounded-full border border-border bg-surface-2/70 font-medium text-muted ${
                  size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
                }`}
              >
                #{tag.title}
              </span>
            ))}
          </div>
        )}

        {size === "md" && (
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted">
            <span className="flex items-center gap-1 text-prism-3">
              <HeartIcon />
              {formatCount(chart.likes)}
            </span>
            {showDateValue && <span>{formatDate(chart.firstPublishedAt!)}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
