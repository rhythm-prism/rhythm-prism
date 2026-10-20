import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { UserDetailInfo, UserEditData } from "../types/user";
import { editUser, fetchUserProfile } from "../lib/api";
import { ICON_SIZE_LIMIT, MAX_NAME, MAX_PROFILE, PERMISSION, PERMISSION_OPTIONS } from "../lib/constants";
import { useAuth } from "../auth/context";
import FileDropField from "./FileDropField";

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-prism-2/60 focus:ring-2 focus:ring-prism-2/20";

interface Props {
  /** Target user to edit; defaults to the logged-in user (self-edit). */
  userId?: string;
  onBack: () => void;
  onSaved: () => void;
}

export default function EditProfile({ userId, onBack, onSaved }: Props) {
  const { user: currentUser, refresh } = useAuth();
  const targetUserId = userId ?? currentUser?.id;
  const isSelf = !!currentUser && targetUserId === currentUser.id;

  const [target, setTarget] = useState<UserDetailInfo | null>(isSelf ? currentUser : null);
  const [loading, setLoading] = useState(!isSelf);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [profile, setProfile] = useState("");
  const [permission, setPermission] = useState(0);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-edit: the logged-in user's data is already in context. Editing
  // someone else requires fetching their profile (moderator+ only).
  useEffect(() => {
    if (isSelf) {
      setTarget(currentUser);
      setLoading(false);
      return;
    }
    if (!targetUserId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchUserProfile(targetUserId)
      .then((u) => {
        if (!active) return;
        setTarget(u);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setLoadError(e instanceof Error ? e.message : "読み込みに失敗しました");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isSelf, targetUserId, currentUser]);

  // Seed the form once the target user is known.
  useEffect(() => {
    if (!target) return;
    setName(target.name);
    setProfile(target.profile);
    setPermission(target.permission ?? PERMISSION.NORMAL);
  }, [target]);

  // Preview the picked file immediately instead of waiting on the
  // upload+refresh round trip, so it's obvious the selection took effect.
  useEffect(() => {
    if (!iconFile) {
      setIconPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  if (!currentUser || !targetUserId) return null;

  // Moderators+ may change another (lower-permission) user's permission;
  // never their own — mirrors the backend's edit_user checks.
  const canEditPermission =
    !isSelf &&
    (currentUser.permission ?? 0) >= PERMISSION.MODERATOR &&
    !!target &&
    (target.permission ?? 0) < (currentUser.permission ?? 0);
  const selectablePermissions = PERMISSION_OPTIONS.filter((p) => p.id < (currentUser.permission ?? 0));

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (loadError || !target) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {loadError ?? "ユーザーが見つかりません"}
        </div>
      </div>
    );
  }

  function validate(): string[] {
    const e: string[] = [];
    if (!name.trim()) e.push("名前を入力してください");
    if (name.length > MAX_NAME) e.push(`名前は${MAX_NAME}文字以下にしてください`);
    if (profile.length > MAX_PROFILE) e.push(`プロフィールは${MAX_PROFILE}文字以下にしてください`);
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const data: UserEditData = { name: name.trim(), profile: profile.trim() };
    if (canEditPermission) data.permission = permission;

    setSubmitting(true);
    try {
      await editUser(targetUserId!, data, iconFile);
      if (isSelf) await refresh();
      setIconFile(null);
      onSaved();
    } catch (err) {
      setError(`更新に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
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
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isSelf ? "プロフィール編集" : `${target.name} さんの編集`}
        </h1>
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {iconPreviewUrl || target.iconUrl ? (
            <img
              src={iconPreviewUrl ?? target.iconUrl}
              alt=""
              className={`h-16 w-16 rounded-full object-cover ${
                iconPreviewUrl ? "ring-2 ring-prism-4 ring-offset-2 ring-offset-surface" : ""
              }`}
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-prism-1 to-prism-3 text-xl font-bold text-white">
              {target.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className="text-sm">
            <p className="font-medium">{iconPreviewUrl ? "新しいアイコン" : "現在のアイコン"}</p>
            {iconPreviewUrl && (
              <p className="text-xs text-prism-4">「変更を保存」を押すと反映されます</p>
            )}
          </div>
        </div>

        <FileDropField
          label="アイコン画像"
          hint=".png / .jpg（正方形推奨・300pxに調整されます）"
          accept="image/*"
          maxSize={ICON_SIZE_LIMIT}
          file={iconFile}
          onSelect={setIconFile}
          preview
          required={false}
        />

        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">
              名前 <span className="text-prism-3">*</span>
            </span>
            <span className="text-xs text-muted">
              {name.length}/{MAX_NAME}
            </span>
          </span>
          <input
            className={inputClass}
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder="表示される名前"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">プロフィール</span>
            <span className="text-xs text-muted">
              {profile.length}/{MAX_PROFILE}
            </span>
          </span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={profile}
            maxLength={MAX_PROFILE}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="自己紹介や好きな曲など"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
        <h2 className="text-sm font-bold">連携アカウント</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Discord</span>
          <span>{target.discordName || "未連携"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Sonolus</span>
          <span>{target.sonolusName || "未連携"}</span>
        </div>
        <p className="text-xs text-muted">連携アカウントはここでは変更できません。</p>
      </section>

      {canEditPermission && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
          <h2 className="text-sm font-bold">権限（モデレーション）</h2>
          <label className="block">
            <select
              className={inputClass}
              value={permission}
              onChange={(e) => setPermission(Number(e.target.value))}
            >
              {selectablePermissions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted">
            自分と同じかそれ以上の権限には変更できません。BANにすると、この人はログインできなくなります。
          </p>
        </section>
      )}

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
    </form>
  );
}
