import { useEffect, useRef, useState } from "react";
import type { AnnounceInfo } from "../types/announcement";
import { fetchAnnouncements } from "../lib/api";
import { jacketGradient } from "../lib/format";

const INTERVAL = 5000;
// How long to wait after the last scroll event before treating the track as settled.
const SETTLE_DELAY = 120;
// Each slide takes this fraction of the viewport width; the rest is split evenly
// between the peeks of the previous/next slide. Must match the slide's `w-4/5` class
// and the leading/trailing spacers' `w-[10%]` (== (1 - ITEM_RATIO) / 2 each).
const ITEM_RATIO = 0.8;

export default function Slider() {
  const [announcements, setAnnouncements] = useState<AnnounceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(1); // position within `extended`; 1..count are the real slides
  const [paused, setPaused] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnnouncements(ctrl.signal)
      .then(setAnnouncements)
      .catch(() => {
        // Nothing pinned, or the request failed — the slider just stays hidden.
      })
      .finally(() => setLoaded(true));
    return () => ctrl.abort();
  }, []);

  const count = announcements.length;
  // Clone the last slide before the start and the first slide after the end so the
  // track can keep scrolling in one direction and never has to snap backwards to loop.
  const extended =
    count > 0 ? [announcements[count - 1], ...announcements, announcements[0]] : [];

  const scrollToIndex = (idx: number, behavior: ScrollBehavior) => {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.clientWidth * ITEM_RATIO;
    el.scrollTo({ left: idx * itemWidth, behavior });
  };

  // Once the real slides are in the DOM, jump the scroll position onto slide 1
  // (skipping the leading clone) with no animation.
  useEffect(() => {
    if (count === 0 || initialized.current) return;
    initialized.current = true;
    scrollToIndex(1, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const step = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.clientWidth * ITEM_RATIO || 1;
    const current = Math.round(el.scrollLeft / itemWidth);
    scrollToIndex(current + dir, "smooth");
  };

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => step(1), INTERVAL);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, count]);

  // Keeps the track aligned with a real slide if the viewport is resized mid-scroll.
  useEffect(() => {
    const onResize = () => scrollToIndex(index, "auto");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Fires (debounced) once the user's drag/swipe/autoplay scroll has settled on a
  // slide. If it settled on a clone, jump straight to the matching real slide.
  const handleScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = scrollerRef.current;
      if (!el || count === 0) return;
      const itemWidth = el.clientWidth * ITEM_RATIO || 1;
      const settled = Math.round(el.scrollLeft / itemWidth);
      if (settled === 0) {
        scrollToIndex(count, "auto");
        setIndex(count);
      } else if (settled === count + 1) {
        scrollToIndex(1, "auto");
        setIndex(1);
      } else {
        setIndex(settled);
      }
    }, SETTLE_DELAY);
  };

  const goTo = (realIndex: number) => scrollToIndex(realIndex + 1, "smooth");

  const activeDot = count > 0 ? ((((index - 1) % count) + count) % count) : 0;

  if (!loaded) {
    return <div className="mx-auto aspect-video w-4/5 max-w-2xl animate-pulse rounded-3xl bg-surface-2" />;
  }
  if (count === 0) return null;

  return (
    <section className="relative mx-auto w-full max-w-2xl" aria-roledescription="carousel">
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {/* Spacers (not padding) reserve the peek gutters, so the slide's own
              `w-4/5` still resolves against the full track width, not a
              padding-shrunk one — otherwise it renders at 80% of 80% (64%). */}
          <div className="w-[10%] shrink-0" aria-hidden="true" />
          {extended.map((a, i) => (
            <div key={`${a.id}-${i}`} className="w-4/5 shrink-0 snap-center px-1.5">
              <div
                className={`overflow-hidden rounded-3xl border border-border transition-opacity duration-300 ${
                  i === index ? "opacity-100" : "opacity-35"
                }`}
              >
                <div className="relative aspect-video w-full">
                  {a.banner?.url ? (
                    <img
                      src={a.banner.url}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-full w-full" style={{ background: jacketGradient(a.id) }} />
                  )}
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 sm:p-6">
                    <h2 className="text-lg font-extrabold text-white drop-shadow sm:text-2xl">
                      {a.title}
                    </h2>
                    <p className="mt-1 text-xs text-white/85 sm:text-sm">{a.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="w-[10%] shrink-0" aria-hidden="true" />
        </div>

        {count > 1 && (
          <>
            <button
              onClick={() => step(-1)}
              aria-label="前へ"
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              ‹
            </button>
            <button
              onClick={() => step(1)}
              aria-label="次へ"
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {announcements.map((a, i) => (
            <button
              key={a.id}
              onClick={() => goTo(i)}
              aria-label={`スライド ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === activeDot ? "w-6 bg-text" : "w-2 bg-border hover:bg-muted"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
