import { Link } from "react-router-dom";

// Baked in at build time (Vite only exposes `VITE_`-prefixed variables). The link is hidden when unset.
const DISCORD_SERVER_URL: string | undefined = import.meta.env.VITE_DISCORD_SERVER_URL || undefined;

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <p>
          RhythmPrism — Sonolus 譜面共有プラットフォーム
        </p>
        <div className="flex items-center gap-5">
          <Link to="/terms" className="transition-colors hover:text-text">利用規約</Link>
          {DISCORD_SERVER_URL && (
            <a
              href={DISCORD_SERVER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-text"
            >
              Discord
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
