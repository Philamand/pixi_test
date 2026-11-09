import type { Tile } from "../utils/grid";

export const EXPLORE_TILE_SIZE = 48;

export interface ExplorePortal {
  x: number;
  y: number;
  target: string;
  spawn: Tile;
}

export interface ExploreMap {
  id: string;
  cols: number;
  rows: number;
  spawn: Tile;
  portals: ExplorePortal[];
  blocked: ReadonlySet<string>;
  ground: (string | null)[][];
  objects: (string | null)[][];
}

interface ExploreMapFile {
  id: string;
  cols: number;
  rows: number;
  spawn: Tile;
  portals?: ExplorePortal[];
  blocked?: string[];
  ground: (string | null)[][];
  objects: (string | null)[][];
}

function validateLayer(
  mapId: string,
  layerName: string,
  layer: (string | null)[][],
  cols: number,
  rows: number,
): void {
  if (layer.length !== rows)
    throw new Error(
      `Map "${mapId}": ${layerName} has ${layer.length} rows, expected ${rows}`,
    );
  layer.forEach((row, y) => {
    if (row.length !== cols)
      throw new Error(
        `Map "${mapId}": ${layerName} row ${y} has ${row.length} cols, expected ${cols}`,
      );
  });
}

function toExploreMap(file: ExploreMapFile): ExploreMap {
  validateLayer(file.id, "ground", file.ground, file.cols, file.rows);
  validateLayer(file.id, "objects", file.objects, file.cols, file.rows);
  const portals = file.portals ?? [];
  for (const portal of portals) {
    if (
      portal.x < 0 ||
      portal.y < 0 ||
      portal.x >= file.cols ||
      portal.y >= file.rows
    )
      throw new Error(
        `Map "${file.id}": portal at (${portal.x},${portal.y}) is out of bounds`,
      );
  }
  return {
    id: file.id,
    cols: file.cols,
    rows: file.rows,
    spawn: file.spawn,
    portals,
    blocked: new Set(file.blocked ?? []),
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
  return (
    map.blocked.has(map.ground[y][x] ?? "") ||
    map.blocked.has(map.objects[y][x] ?? "")
  );
}

export function explorePortalAt(
  map: ExploreMap,
  x: number,
  y: number,
): ExplorePortal | null {
  return map.portals.find((p) => p.x === x && p.y === y) ?? null;
}
