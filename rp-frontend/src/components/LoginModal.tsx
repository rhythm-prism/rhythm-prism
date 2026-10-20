import { useEffect, useState } from "react";
import { useAuth } from "../auth/context";
import {
  discordLoginUrl,
  pollAuthStatus,
  startSonolusLogin,
  type SonolusLoginSession,
} from "../lib/auth";

type Phase = "idle" | "starting" | "waiting" | "error";

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useAuth();
  const [session, setSession] = useState<SonolusLoginSession | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const startSonolus = async () => {
    setPhase("starting");
    setError(null);
    try {
      setSession(await startSonolusLogin());
      setPhase("waiting");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "ログインの開始に失敗しました");
    }
  };

  // Poll the auth record until the Sonolus app confirms the login.
  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const status = await pollAuthStatus(session.auth_id);
        if (status === "completed" && active) {
          clearInterval(timer);
          await refresh();
          onClose();
        }
      } catch (e) {
        if (!active) return;
        clearInterval(timer);
        setPhase("error");
        setError(e instanceof Error ? e.message : "認証の確認に失敗しました");
      }
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [phase, session, refresh, onClose]);

  const copyUrl = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.auth_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link is still shown
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Rhythm<span className="prism-text">Prism</span> にログイン
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted transition-colors hover:text-text"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {phase === "waiting" && session ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-prism-2/40 bg-prism-2/10 p-3">
              <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-prism-2" />
              <p className="text-sm">Sonolus アプリでの認証を待っています…</p>
            </div>
            <p className="text-xs text-muted">
              下のリンクを Sonolus アプリで開き、外部ログインを承認してください。
            </p>
            <div className="flex items-center gap-2">
              <a
                href={session.auth_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-prism-4 hover:underline"
              >
                {session.auth_url}
              </a>
              <button
                onClick={copyUrl}
                className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted transition-colors hover:text-text"
              >
                {copied ? "コピー済" : "コピー"}
              </button>
            </div>
            <button
              onClick={() => {
                setPhase("idle");
                setSession(null);
              }}
              className="w-full rounded-lg px-3 py-2 text-xs text-muted transition-colors hover:text-text"
            >
              ← 別の方法でログイン
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <a
              href={discordLoginUrl()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.25.5a18.3 18.3 0 0 1 4.36 1.4 13.6 13.6 0 0 0-11 0A18.3 18.3 0 0 1 12.85 3.5L12.6 3a19.8 19.8 0 0 0-4.9 1.4C4.6 9 3.76 13.5 4.18 17.9a19.9 19.9 0 0 0 6.06 3.1l.49-.68a13 13 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.1 0l.5.39c-.64.38-1.33.71-2.05.98l.49.68a19.9 19.9 0 0 0 6.06-3.1c.5-5.1-.84-9.56-3.58-13.5ZM9.7 15.3c-1 0-1.8-.9-1.8-2s.78-2 1.8-2 1.82.9 1.8 2c0 1.1-.79 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.78-2 1.8-2 1.82.9 1.8 2c0 1.1-.78 2-1.8 2Z" />
              </svg>
              Discord でログイン
            </a>

            <button
              onClick={startSonolus}
              disabled={phase === "starting"}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold transition-colors hover:border-prism-2/50 disabled:opacity-50"
            >
              {phase === "starting" ? "準備中…" : "Sonolus でログイン"}
            </button>

            <p className="pt-1 text-center text-xs text-muted">
              初めての方は Discord ログインでアカウントが作成されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
