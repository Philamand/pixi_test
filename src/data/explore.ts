import { TOWN_TILE } from "./tiles";
import type { Tile } from "../utils/grid";

export const EXPLORE_TILE_SIZE = 48;

export const EXPLORE_LAYOUT: string[] = [
  "TTTTTTTTTTTTTTTT",
  "T......WW......T",
  "T..t...WW......T",
  "T......WW...t..T",
  "T,,,,,,,,,,,,,.T",
  "T.........###..T",
  "T..t......###..T",
  "T,,,,,,,,,,,,,.T",
  "T..b...r.......T",
  "T....t....r..b.T",
  "T......FF......T",
  "TTTTTTTTTTTTTTTT",
];

export const EXPLORE_COLS = EXPLORE_LAYOUT[0].length;
export const EXPLORE_ROWS = EXPLORE_LAYOUT.length;

export const EXPLORE_SPAWN: Tile = { x: 7, y: 6 };

const LEGEND: Record<string, number> = {
  T: TOWN_TILE.tree,
  t: TOWN_TILE.treeAlt,
  W: TOWN_TILE.water,
  "#": TOWN_TILE.wall,
  F: TOWN_TILE.fence,
  r: TOWN_TILE.rock,
  ".": TOWN_TILE.grass,
  ",": TOWN_TILE.path,
  b: TOWN_TILE.bush,
};

const BLOCKED = new Set(["T", "t", "W", "#", "F", "r"]);

export function exploreTileIndex(x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return null;
  return LEGEND[EXPLORE_LAYOUT[y][x]] ?? null;
}

export function isExploreBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return true;
  return BLOCKED.has(EXPLORE_LAYOUT[y][x]);
}
