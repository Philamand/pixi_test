import type { Ticker } from "pixi.js";

export interface TweenHandle {
  cancel: () => void;
}

export function tween(
  ticker: Ticker,
  durationMS: number,
  onUpdate?: (progress: number) => void,
  onComplete?: () => void,
): TweenHandle {
  let elapsed = 0;
  let cancelled = false;

  const tick = (t: Ticker) => {
    if (cancelled) return;
    elapsed += t.deltaMS;
    const progress = Math.min(elapsed / durationMS, 1);
    onUpdate?.(progress);
    if (progress >= 1) {
      ticker.remove(tick);
      onComplete?.();
    }
  };

  ticker.add(tick);

  return {
    cancel: () => {
      cancelled = true;
      ticker.remove(tick);
    },
  };
}
