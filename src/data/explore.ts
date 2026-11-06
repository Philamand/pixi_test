import { TILE_INDEX } from "./tiles";
import type { Tile } from "../utils/grid";

export const EXPLORE_TILE_SIZE = 48;

export const EXPLORE_LAYOUT: string[] = [
  "################",
  "#......,.......#",
  "#..T.......T...#",
  "#..............#",
  "#......##......#",
  "#......##......#",
  "#..............#",
  "#...T......T,..#",
  "#..............#",
  "#......##......#",
  "#......,.......#",
  "################",
];

export const EXPLORE_COLS = EXPLORE_LAYOUT[0].length;
export const EXPLORE_ROWS = EXPLORE_LAYOUT.length;

export const EXPLORE_SPAWN: Tile = { x: 7, y: 6 };

const LEGEND: Record<string, number> = {
  "#": TILE_INDEX.rock,
  T: TILE_INDEX.rockAlt,
  ".": TILE_INDEX.floor,
  ",": TILE_INDEX.floorDebris[0],
};

const BLOCKED = new Set(["#", "T"]);

export function exploreTileIndex(x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return null;
  return LEGEND[EXPLORE_LAYOUT[y][x]] ?? null;
}

export function isExploreBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return true;
  return BLOCKED.has(EXPLORE_LAYOUT[y][x]);
}
