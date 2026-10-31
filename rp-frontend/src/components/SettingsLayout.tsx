import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/context";

function AnnouncementIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10v4h3l6 4V6l-6 4H3Z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6" strokeLinecap="round" />
    </svg>
  );
}

function ModerationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 3-5 6-5s6 1.5 6 5" strokeLinecap="round" />
      <path d="M16 8a3 3 0 1 1 2.5 4.7" strokeLinecap="round" />
      <path d="M14.5 20c0-2.1 1-3.6 3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V3h10l7 7a2 2 0 0 1 0 3Z" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
      <path d="M7 7h.01M7 17h.01" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: () => ReactNode;
}

const ITEMS: NavItem[] = [
  { to: "/announcements", label: "お知らせ管理", icon: AnnouncementIcon },
  { to: "/moderation/users", label: "ユーザー管理", icon: ModerationIcon },
  { to: "/moderation/tags", label: "タグの作成", icon: TagIcon },
  { to: "/moderation/server", label: "サーバー情報", icon: ServerIcon },
];

export default function SettingsLayout() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <aside className="w-full shrink-0 md:w-56">
        <nav className="space-y-1 rounded-2xl border border-border bg-surface/60 p-2">
          {ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2/60 hover:text-text"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="mx-auto w-full min-w-0 max-w-3xl flex-1">
        <Outlet />
      </div>
    </div>
  );
}
