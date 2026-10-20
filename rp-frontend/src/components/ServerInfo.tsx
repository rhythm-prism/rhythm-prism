import { useEffect, useState } from "react";
import type { ServerInfo as ServerInfoData } from "../types/serverInfo";
import { fetchServerInfo } from "../lib/api";

interface Props {
  onBack: () => void;
}

export default function ServerInfo({ onBack }: Props) {
  const [info, setInfo] = useState<ServerInfoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchServerInfo(ctrl.signal)
      .then(setInfo)
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "サーバー情報の取得に失敗しました");
      });
    return () => ctrl.abort();
  }, []);

  const chart = info?.chart;
  const stats = chart
    ? [
        { label: "総譜面数", value: chart.publicCount + chart.privateCount + chart.deleteCount },
        { label: "公開譜面", value: chart.publicCount },
        { label: "非公開譜面", value: chart.privateCount },
        { label: "削除済み譜面", value: chart.deleteCount },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-text"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">サーバー情報</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">譜面</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {!chart && !error
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
              ))
            : stats.map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-border bg-surface/80 p-4">
                  <p className="text-sm text-muted">{label}</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums">
                    {value.toLocaleString()}
                  </p>
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}
