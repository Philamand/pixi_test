import type { Tile } from "../utils/grid";

export const EXPLORE_TILE_SIZE = 48;
export const EXPLORE_COLS = 10;
export const EXPLORE_ROWS = 16;

export interface ExplorePortal {
  x: number;
  y: number;
  target: string;
}

export interface ExploreMap {
  id: string;
  cols: number;
  rows: number;
  portals: ExplorePortal[];
  ground: (string | null)[][];
  objects: (string | null)[][];
}

interface ExploreMapFile {
  id: string;
  portals?: ExplorePortal[];
  ground: (string | null)[][];
  objects: (string | null)[][];
}

function validateLayer(
  mapId: string,
  layerName: string,
  layer: (string | null)[][],
): void {
  if (layer.length !== EXPLORE_ROWS)
    throw new Error(
      `Map "${mapId}": ${layerName} has ${layer.length} rows, expected ${EXPLORE_ROWS}`,
    );
  layer.forEach((row, y) => {
    if (row.length !== EXPLORE_COLS)
      throw new Error(
        `Map "${mapId}": ${layerName} row ${y} has ${row.length} cols, expected ${EXPLORE_COLS}`,
      );
  });
}

function toExploreMap(file: ExploreMapFile): ExploreMap {
  validateLayer(file.id, "ground", file.ground);
  validateLayer(file.id, "objects", file.objects);
  const portals = file.portals ?? [];
  for (const portal of portals) {
    if (
      portal.x < 0 ||
      portal.y < 0 ||
      portal.x >= EXPLORE_COLS ||
      portal.y >= EXPLORE_ROWS
    )
      throw new Error(
        `Map "${file.id}": portal at (${portal.x},${portal.y}) is out of bounds`,
      );
  }
  return {
    id: file.id,
    cols: EXPLORE_COLS,
    rows: EXPLORE_ROWS,
    portals,
    ground: file.ground,
    objects: file.objects,
  };
}

const mapFiles = import.meta.glob<ExploreMapFile>("./maps/*.json", {
  eager: true,
});

export const EXPLORE_MAPS: Record<string, ExploreMap> = Object.fromEntries(
  Object.values(mapFiles).map((file) => [file.id, toExploreMap(file)]),
);

for (const map of Object.values(EXPLORE_MAPS)) {
  for (const portal of map.portals) {
    if (!EXPLORE_MAPS[portal.target])
      throw new Error(
        `Map "${map.id}": portal at (${portal.x},${portal.y}) targets unknown map "${portal.target}"`,
      );
  }
}

export const EXPLORE_MAP_START: ExploreMap =
  EXPLORE_MAPS.meadow ?? Object.values(EXPLORE_MAPS)[0];

export function exploreGroundKey(
  map: ExploreMap,
  x: number,
  y: number,
): string | null {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return null;
  return map.ground[y][x];
}

export function exploreObjectKey(
  map: ExploreMap,
  x: number,
  y: number,
): string | null {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return null;
  return map.objects[y][x];
}

export function isExploreBlocked(
  map: ExploreMap,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return true;
  return map.objects[y][x] !== null;
}

export function explorePortalAt(
  map: ExploreMap,
  x: number,
  y: number,
): ExplorePortal | null {
  return map.portals.find((p) => p.x === x && p.y === y) ?? null;
}

function findFreeTile(map: ExploreMap, x: number, y: number): Tile {
  if (!isExploreBlocked(map, x, y)) return { x, y };
  const maxR = Math.max(map.cols, map.rows);
  for (let r = 1; r < maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!isExploreBlocked(map, x + dx, y + dy))
          return { x: x + dx, y: y + dy };
      }
    }
  }
  return { x, y };
}

export function exploreMiddleSpawn(map: ExploreMap): Tile {
  return findFreeTile(map, Math.floor(map.cols / 2), Math.floor(map.rows / 2));
}

export function exploreArrivalSpawn(
  map: ExploreMap,
  fromMapId: string | null,
): Tile {
  if (fromMapId) {
    const returnPortal = map.portals.find((p) => p.target === fromMapId);
    if (returnPortal) {
      const neighbors: Tile[] = [
        { x: returnPortal.x + 1, y: returnPortal.y },
        { x: returnPortal.x - 1, y: returnPortal.y },
        { x: returnPortal.x, y: returnPortal.y + 1 },
        { x: returnPortal.x, y: returnPortal.y - 1 },
      ];
      for (const n of neighbors) {
        if (!isExploreBlocked(map, n.x, n.y)) return n;
      }
    }
  }
  return exploreMiddleSpawn(map);
}
