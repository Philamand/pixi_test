import { SUMMER_TILE } from "./tiles";
import type { Tile } from "../utils/grid";

export const EXPLORE_TILE_SIZE = 48;

export const EXPLORE_LAYOUT: string[] = [
  "TTTTTTTTTT",
  "T........T",
  "T..t.....T",
  "T....WW..T",
  "T.,,,,,..T",
  "T.,WW,,..T",
  "T........T",
  "T..###...T",
  "T..###...T",
  "T........T",
  "T....t...T",
  "T,,,,,,,.T",
  "T........T",
  "T..b...r.T",
  "T.....F..T",
  "TTTTTTTTTT",
];

export const EXPLORE_COLS = EXPLORE_LAYOUT[0].length;
export const EXPLORE_ROWS = EXPLORE_LAYOUT.length;

export const EXPLORE_SPAWN: Tile = { x: 7, y: 9 };

const LEGEND: Record<string, readonly string[]> = {
  T: [SUMMER_TILE.tree],
  t: [SUMMER_TILE.treeSmall],
  W: SUMMER_TILE.pond,
  "#": [SUMMER_TILE.rock, SUMMER_TILE.rockAlt],
  F: [SUMMER_TILE.fence],
  r: [SUMMER_TILE.rockAlt],
  ".": [SUMMER_TILE.grass, SUMMER_TILE.grassAlt, SUMMER_TILE.grassAlt2],
  ",": [SUMMER_TILE.sand],
  b: [SUMMER_TILE.bush],
};

const BLOCKED = new Set(["T", "t", "W", "#", "F", "r"]);

const GRASS_OPTIONS = LEGEND["."];

export function exploreGrassKey(x: number, y: number): string {
  return GRASS_OPTIONS[(x * 3 + y * 5) % GRASS_OPTIONS.length];
}

export function exploreTileKey(x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return null;
  const options = LEGEND[EXPLORE_LAYOUT[y][x]];
  if (!options) return null;
  return options[(x * 3 + y * 5) % options.length];
}

export function isExploreBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return true;
  return BLOCKED.has(EXPLORE_LAYOUT[y][x]);
}
