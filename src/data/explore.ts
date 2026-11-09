import { SUMMER_TILE } from "./tiles";
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
  ground: string[];
  objects: string[];
}

interface ExploreMapFile {
  id: string;
  cols: number;
  rows: number;
  spawn: Tile;
  portals?: ExplorePortal[];
  ground: string[];
  objects: string[];
}

const GROUND_LEGEND: Record<string, readonly string[]> = {
  g: [SUMMER_TILE.grass, SUMMER_TILE.grassAlt, SUMMER_TILE.grassAlt2],
  s: [SUMMER_TILE.sand],
  w: SUMMER_TILE.pond,
};

const OBJECT_LEGEND: Record<string, readonly string[]> = {
  T: [SUMMER_TILE.tree],
  t: [SUMMER_TILE.treeSmall],
  "#": [SUMMER_TILE.rock, SUMMER_TILE.rockAlt],
  F: [SUMMER_TILE.fence],
  r: [SUMMER_TILE.rockAlt],
  b: [SUMMER_TILE.bush],
  P: [],
};

const EMPTY_CELL = ".";
const BLOCKED_GROUND = new Set(["w"]);
const BLOCKED_OBJECTS = new Set(["T", "t", "#", "F", "r", "b"]);

function validateLayer(
  mapId: string,
  layerName: string,
  layer: string[],
  cols: number,
  rows: number,
  legend: Record<string, readonly string[]>,
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
    for (const char of row) {
      if (char !== EMPTY_CELL && !(char in legend))
        throw new Error(
          `Map "${mapId}": unknown ${layerName} char "${char}" at row ${y}`,
        );
    }
  });
}

function toExploreMap(file: ExploreMapFile): ExploreMap {
  validateLayer(
    file.id,
    "ground",
    file.ground,
    file.cols,
    file.rows,
    GROUND_LEGEND,
  );
  validateLayer(
    file.id,
    "objects",
    file.objects,
    file.cols,
    file.rows,
    OBJECT_LEGEND,
  );
  const portals = file.portals ?? [];
  for (const portal of portals) {
    if (file.objects[portal.y]?.[portal.x] !== "P")
      throw new Error(
        `Map "${file.id}": portal at (${portal.x},${portal.y}) needs a "P" object cell`,
      );
  }
  return { ...file, portals };
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
): string {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows)
    return GROUND_LEGEND.g[0];
  const options = GROUND_LEGEND[map.ground[y][x]] ?? GROUND_LEGEND.g;
  return options[(x * 3 + y * 5) % options.length];
}

export function exploreObjectKey(
  map: ExploreMap,
  x: number,
  y: number,
): string | null {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return null;
  const char = map.objects[y][x];
  const options = OBJECT_LEGEND[char];
  if (!options || options.length === 0) return null;
  return options[(x * 3 + y * 5) % options.length];
}

export function isExploreBlocked(
  map: ExploreMap,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return true;
  return (
    BLOCKED_GROUND.has(map.ground[y][x]) ||
    BLOCKED_OBJECTS.has(map.objects[y][x])
  );
}

export function explorePortalAt(
  map: ExploreMap,
  x: number,
  y: number,
): ExplorePortal | null {
  return map.portals.find((p) => p.x === x && p.y === y) ?? null;
}
