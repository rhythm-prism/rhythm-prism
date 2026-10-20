export default function Hero({ onSubmitClick }: { onSubmitClick: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface/70 px-6 py-10 sm:px-10 sm:py-14">
      <div className="prism-aurora pointer-events-none absolute inset-0" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/40 px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-prism-4" />
          Sonolus 対応・無料で遊べる
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          光るリズムを、<br className="hidden sm:block" />
          <span className="prism-text">みんなで奏でよう。</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted sm:text-base">
          コミュニティが作った譜面を探して、お気に入りを見つけよう。
          ジャンル・難易度・イベントから、あなたにぴったりの一曲が見つかります。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-opacity hover:opacity-90">
            譜面をさがす
          </button>
          <button
            onClick={onSubmitClick}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-prism-2/50"
          >
            譜面を投稿
          </button>
        </div>
      </div>
    </section>
  );
}
