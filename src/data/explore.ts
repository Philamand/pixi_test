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
  layout: string[];
  cols: number;
  rows: number;
  spawn: Tile;
  portals: ExplorePortal[];
}

const MEADOW_LAYOUT: string[] = [
  "TTTTTTTTTT",
  "T........T",
  "T..t.....T",
  "T....WW..T",
  "T.,,,,,..T",
  "T.,WW,,..T",
  "T........T",
  "T..###...T",
  "T..###...T",
  "T.......PT",
  "T....t...T",
  "T,,,,,,,.T",
  "T........T",
  "T..b...r.T",
  "T.....F..T",
  "TTTTTTTTTT",
];

const GROVE_LAYOUT: string[] = [
  "TTTTTTTTTT",
  "T........T",
  "T.....t..T",
  "T..WW....T",
  "T..,,,,,.T",
  "T..,,WW..T",
  "T........T",
  "T...###..T",
  "T...###..T",
  "PT.......T",
  "T...t....T",
  "T.,,,,,,.T",
  "T........T",
  "T..r...b.T",
  "T..F.....T",
  "TTTTTTTTTT",
];

export const EXPLORE_MAP_MEADOW: ExploreMap = {
  id: "meadow",
  layout: MEADOW_LAYOUT,
  cols: MEADOW_LAYOUT[0].length,
  rows: MEADOW_LAYOUT.length,
  spawn: { x: 7, y: 9 },
  portals: [{ x: 9, y: 9, target: "grove", spawn: { x: 1, y: 9 } }],
};

export const EXPLORE_MAP_GROVE: ExploreMap = {
  id: "grove",
  layout: GROVE_LAYOUT,
  cols: GROVE_LAYOUT[0].length,
  rows: GROVE_LAYOUT.length,
  spawn: { x: 1, y: 9 },
  portals: [{ x: 0, y: 9, target: "meadow", spawn: { x: 8, y: 9 } }],
};

export const EXPLORE_MAPS: Record<string, ExploreMap> = {
  meadow: EXPLORE_MAP_MEADOW,
  grove: EXPLORE_MAP_GROVE,
};

export const EXPLORE_MAP_START = EXPLORE_MAP_MEADOW;

const LEGEND: Record<string, readonly string[]> = {
  T: [SUMMER_TILE.tree],
  t: [SUMMER_TILE.treeSmall],
  W: SUMMER_TILE.pond,
  "#": [SUMMER_TILE.rock, SUMMER_TILE.rockAlt],
  F: [SUMMER_TILE.fence],
  r: [SUMMER_TILE.rockAlt],
  P: [],
  ".": [SUMMER_TILE.grass, SUMMER_TILE.grassAlt, SUMMER_TILE.grassAlt2],
  ",": [SUMMER_TILE.sand],
  b: [SUMMER_TILE.bush],
};

const BLOCKED = new Set(["T", "t", "W", "#", "F", "r"]);

const GRASS_OPTIONS = LEGEND["."];

export function exploreGrassKey(x: number, y: number): string {
  return GRASS_OPTIONS[(x * 3 + y * 5) % GRASS_OPTIONS.length];
}

export function exploreTileKey(
  map: ExploreMap,
  x: number,
  y: number,
): string | null {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return null;
  const options = LEGEND[map.layout[y][x]];
  if (!options || options.length === 0) return null;
  return options[(x * 3 + y * 5) % options.length];
}

export function isExploreBlocked(
  map: ExploreMap,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return true;
  return BLOCKED.has(map.layout[y][x]);
}

export function explorePortalAt(
  map: ExploreMap,
  x: number,
  y: number,
): ExplorePortal | null {
  return map.portals.find((p) => p.x === x && p.y === y) ?? null;
}
