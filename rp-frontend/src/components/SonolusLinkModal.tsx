import { useEffect, useState } from "react";
import { useAuth } from "../auth/context";
import { fetchCurrentUser, sonolusLinkUrl } from "../lib/auth";

type Phase = "idle" | "waiting" | "error";

/**
 * Blocking screen shown whenever the logged-in user has no sonolusId yet
 * (e.g. right after Discord signup). Opens /api/sonolus/link in a new tab
 * and polls /api/login until sonolusId is set, then refreshes the session.
 */
export default function SonolusLinkModal() {
  const { refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const openLink = () => {
    window.open(sonolusLinkUrl(), "_blank", "noopener");
    setError(null);
    setPhase("waiting");
  };

  // Poll the current user until the Sonolus link completes.
  useEffect(() => {
    if (phase !== "waiting") return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const user = await fetchCurrentUser();
        if (!active) return;
        if (user?.sonolusId) {
          clearInterval(timer);
          await refresh();
        }
      } catch (e) {
        if (!active) return;
        clearInterval(timer);
        setPhase("error");
        setError(e instanceof Error ? e.message : "連携状況の確認に失敗しました");
      }
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [phase, refresh]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold">
          Sonolus<span className="prism-text">連携</span>が必要です
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {phase === "waiting" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-prism-2/40 bg-prism-2/10 p-3">
              <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-prism-2" />
              <p className="text-sm">Sonolus アプリでの連携を待っています…</p>
            </div>
            <button
              onClick={openLink}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted transition-colors hover:text-text"
            >
              連携ページをもう一度開く
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              RhythmPrismの利用にはSonolusアカウントとの連携が必要です。下のボタンから連携ページを開いてください。
            </p>
            <button
              onClick={openLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-prism-2 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sonolusと連携する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
