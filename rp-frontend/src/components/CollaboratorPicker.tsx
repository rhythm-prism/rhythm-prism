import { useEffect, useRef, useState } from "react";
import type { UserDetailInfo } from "../types/user";
import type { UserSimpleInfo } from "../types/chart";
import { searchUsers } from "../lib/api";
import { MAX_COLLABORATORS } from "../lib/constants";
import { useAuth } from "../auth/context";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20";

function Avatar({ user, size }: { user: { name: string; iconUrl?: string | null }; size: string }) {
  return user.iconUrl ? (
    <img src={user.iconUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-prism-1 to-prism-3 font-bold text-white`}
    >
      {user.name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

interface Props {
  value: UserSimpleInfo[];
  onChange: (users: UserSimpleInfo[]) => void;
  /** Extra user ids to hide from search results (e.g. the chart's author). */
  excludeIds?: string[];
  max?: number;
}

/** GitHub-style collaborator picker: search `/api/users` by name, pick from a dropdown. */
export default function CollaboratorPicker({
  value,
  onChange,
  excludeIds = [],
  max = MAX_COLLABORATORS,
}: Props) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserDetailInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      if (!q) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      searchUsers({ name: q }, ctrl.signal)
        .then(setResults)
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const atMax = value.length >= max;
  const hiddenIds = new Set([...value.map((u) => u.id), ...excludeIds, currentUser?.id ?? ""]);
  const candidates = results.filter((u) => !hiddenIds.has(u.id));

  function addUser(u: UserDetailInfo) {
    if (atMax || hiddenIds.has(u.id)) return;
    onChange([...value, { id: u.id, name: u.name, iconUrl: u.iconUrl }]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeUser(id: string) {
    onChange(value.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-2 text-xs"
            >
              <Avatar user={u} size="h-5 w-5 text-[10px]" />
              <span className="max-w-[10rem] truncate">{u.name}</span>
              <button
                type="button"
                onClick={() => removeUser(u.id)}
                className="text-muted transition-colors hover:text-prism-3"
                aria-label={`${u.name}を削除`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={containerRef}>
        <input
          className={inputClass}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={atMax ? `最大${max}人まで追加できます` : "名前でユーザーを検索して追加"}
          disabled={atMax}
        />

        {open && query.trim() && !atMax && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-xl">
            {loading ? (
              <p className="px-3.5 py-2.5 text-sm text-muted">検索中…</p>
            ) : candidates.length === 0 ? (
              <p className="px-3.5 py-2.5 text-sm text-muted">ユーザーが見つかりません</p>
            ) : (
              candidates.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addUser(u)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <Avatar user={u} size="h-8 w-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    {(u.discordName || u.sonolusName) && (
                      <p className="truncate text-xs text-muted">{u.discordName || u.sonolusName}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
