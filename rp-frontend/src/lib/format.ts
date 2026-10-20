/** Compact like counts: 1284 → "1.3k". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** Unix seconds → "2024/06/19". */
export function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}/${m}/${day}`;
}

/**
 * Deterministic gradient used as a jacket placeholder when a chart has no
 * artwork — keeps the grid colourful and stable across renders.
 */
export function jacketGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  const a = h;
  const b = (h + 50) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 55%), hsl(${b} 75% 42%))`;
}
