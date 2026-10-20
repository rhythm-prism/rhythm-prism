import { useEffect, useMemo, useState } from "react";
import type { UserDetailInfo } from "../types/user";
import { searchUsers } from "../lib/api";
import { PERMISSION_OPTIONS } from "../lib/constants";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20";

interface Props {
  onBack: () => void;
  onSelectUser: (userId: string) => void;
}

type SortField = "name" | "permission";
type SortOrder = "asc" | "desc";

function permissionLabel(permission: number | null | undefined): string {
  return PERMISSION_OPTIONS.find((p) => p.id === permission)?.label ?? "不明";
}

export default function ModerationUsers({ onBack, onSelectUser }: Props) {
  const [name, setName] = useState("");
  const [permission, setPermission] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [users, setUsers] = useState<UserDetailInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search-as-you-type so every keystroke doesn't fire a request.
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchUsers(
        {
          name: name.trim() || undefined,
          permission: permission ? Number(permission) : undefined,
        },
        ctrl.signal,
      )
        .then(setUsers)
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setError(e instanceof Error ? e.message : "検索に失敗しました");
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [name, permission]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const result =
          sortField === "name"
            ? a.name.localeCompare(b.name, "ja")
            : (a.permission ?? 0) - (b.permission ?? 0);
        if (result !== 0) return sortOrder === "asc" ? result : -result;
        return a.name.localeCompare(b.name, "ja");
      }),
    [users, sortField, sortOrder],
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">ユーザー管理</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前で検索"
        />
        <select
          className={inputClass}
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
          aria-label="役職で絞り込み"
        >
          <option value="">すべての役職</option>
          {PERMISSION_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface p-1">
            {(
              [
                { id: "name", label: "名前" },
                { id: "permission", label: "役職" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortField(option.id)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  sortField === option.id
                    ? "bg-accent text-white"
                    : "text-muted hover:text-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSortOrder((v) => (v === "asc" ? "desc" : "asc"))}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
            title="並び順を反転"
          >
            {sortOrder === "asc" ? "昇順 ↑" : "降順 ↓"}
          </button>
        </div>

        {!loading && <span className="text-sm text-muted">{sortedUsers.length} 件</span>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : sortedUsers.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">ユーザーが見つかりません</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/80">
          {sortedUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelectUser(u.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              {u.iconUrl ? (
                <img src={u.iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-prism-1 to-prism-3 text-sm font-bold text-white">
                  {u.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted">
                  {u.discordName || u.sonolusName || u.id}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
                {permissionLabel(u.permission)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
