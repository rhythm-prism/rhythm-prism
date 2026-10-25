import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../auth/context";
import { PERMISSION } from "../lib/constants";

interface HeaderProps {
  onSubmitClick: () => void;
  onSearchClick: () => void;
  onLogoClick: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onMineClick: () => void;
  onCharterClick: () => void;
  onCharterPendingClick: () => void;
  onManagementClick: () => void;
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 19V5" strokeLinecap="round" />
      <path d="m5 12 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

function ChartsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function CharterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" strokeLinejoin="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ManagementIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 3-5 6-5s6 1.5 6 5" strokeLinecap="round" />
      <path d="M16 8a3 3 0 1 1 2.5 4.7" strokeLinecap="round" />
      <path d="M14.5 20c0-2.1 1-3.6 3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" />
    </svg>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
        danger ? "text-prism-3" : "text-muted hover:text-text"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function UserMenu({
  onProfileClick,
  onSubmitClick,
  onMineClick,
  onCharterClick,
  onCharterPendingClick,
  onManagementClick,
}: {
  onProfileClick: () => void;
  onSubmitClick: () => void;
  onMineClick: () => void;
  onCharterClick: () => void;
  onCharterPendingClick: () => void;
  onManagementClick: () => void;
}) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking/tapping anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  if (!user) return null;

  const initial = user.name?.trim()?.[0]?.toUpperCase() ?? "?";

  const select = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2.5 transition-colors hover:border-prism-2/50"
      >
        {user.iconUrl ? (
          <img src={user.iconUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
            {initial}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <MenuItem icon={<ProfileIcon />} label="プロフィール" onClick={select(onProfileClick)} />
          <MenuItem icon={<UploadIcon />} label="譜面投稿" onClick={select(onSubmitClick)} />
          <MenuItem icon={<ChartsIcon />} label="投稿した譜面" onClick={select(onMineClick)} />
          <MenuItem
            icon={<CharterIcon />}
            label={(user.permission ?? 0) >= PERMISSION.MODERATOR ? "過去の申請" : "作者申請"}
            onClick={select(onCharterClick)}
          />
          {(user.permission ?? 0) >= PERMISSION.AUTHORIZED_CHARTER && (
            <MenuItem icon={<PendingIcon />} label="申請待ち一覧" onClick={select(onCharterPendingClick)} />
          )}
          {(user.permission ?? 0) >= PERMISSION.MODERATOR && (
            <MenuItem icon={<ManagementIcon />} label="運営管理" onClick={select(onManagementClick)} />
          )}
          <div className="my-1 border-t border-border" />
          <MenuItem
            icon={<LogoutIcon />}
            label="ログアウト"
            danger
            onClick={select(() => {
              if (window.confirm("ログアウトしますか？")) void signOut();
            })}
          />
        </div>
      )}
    </div>
  );
}

function PrismLogo() {
  // The icon has a light background, so it sits on a white rounded tile to stay legible in dark mode.
  return (
    <img
      src="/Rhythm_Prism_icon.png"
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 rounded-lg bg-white object-contain"
    />
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({
  onSubmitClick,
  onSearchClick,
  onLogoClick,
  onLoginClick,
  onProfileClick,
  onMineClick,
  onCharterClick,
  onCharterPendingClick,
  onManagementClick,
}: HeaderProps) {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center gap-2.5"
          aria-label="トップページへ戻る"
        >
          <PrismLogo />
          <span className="text-lg font-bold tracking-tight">RhythmPrism</span>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={onSearchClick}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            <SearchIcon />
            <span className="hidden sm:inline">検索</span>
          </button>
          {loading ? (
            <span className="h-9 w-9 animate-pulse rounded-full bg-surface" />
          ) : user ? (
            <UserMenu
              onProfileClick={onProfileClick}
              onSubmitClick={onSubmitClick}
              onMineClick={onMineClick}
              onCharterClick={onCharterClick}
              onCharterPendingClick={onCharterPendingClick}
              onManagementClick={onManagementClick}
            />
          ) : (
            <button
              onClick={onLoginClick}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90"
            >
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
