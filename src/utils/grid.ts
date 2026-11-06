export interface Tile {
  x: number;
  y: number;
}

export type Facing = "up" | "down" | "left" | "right";

export const FACING_VECTORS: Record<Facing, Tile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const tileKey = (t: Tile): string => `${t.x},${t.y}`;

export function chebyshev(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function facingFromDelta(dx: number, dy: number): Facing {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

export function findPath(
  origin: Tile,
  target: Tile,
  cols: number,
  rows: number,
  isBlocked: (t: Tile) => boolean,
): Tile[] | null {
  if (isBlocked(target)) return null;
  const prev = new Map<string, Tile>();
  const queue: Tile[] = [origin];
  prev.set(tileKey(origin), origin);
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === target.x && cur.y === target.y) {
      const path: Tile[] = [];
      let node: Tile | undefined = cur;
      while (node && !(node.x === origin.x && node.y === origin.y)) {
        path.unshift(node);
        node = prev.get(tileKey(node));
      }
      return path;
    }
    for (const d of dirs) {
      const next = { x: cur.x + d.x, y: cur.y + d.y };
      if (next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows)
        continue;
      const key = tileKey(next);
      if (prev.has(key) || isBlocked(next)) continue;
      prev.set(key, cur);
      queue.push(next);
    }
  }
  return null;
}

export function tilesWithinRange(
  origin: Tile,
  range: number,
  cols: number,
  rows: number,
  isFree: (t: Tile) => boolean,
): Tile[] {
  const out: Tile[] = [];
  for (
    let y = Math.max(0, origin.y - range);
    y <= Math.min(rows - 1, origin.y + range);
    y++
  ) {
    for (
      let x = Math.max(0, origin.x - range);
      x <= Math.min(cols - 1, origin.x + range);
      x++
    ) {
      const t = { x, y };
      if (chebyshev(origin, t) <= range && isFree(t)) out.push(t);
    }
  }
  return out;
}
