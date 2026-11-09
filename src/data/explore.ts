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

interface ExploreMapFile {
  id: string;
  layout: string[];
  spawn: Tile;
  portals?: ExplorePortal[];
}

const mapFiles = import.meta.glob<ExploreMapFile>("./maps/*.json", {
  eager: true,
});

function toExploreMap(file: ExploreMapFile): ExploreMap {
  return {
    id: file.id,
    layout: file.layout,
    cols: file.layout[0]?.length ?? 0,
    rows: file.layout.length,
    spawn: file.spawn,
    portals: file.portals ?? [],
  };
}

export const EXPLORE_MAPS: Record<string, ExploreMap> = Object.fromEntries(
  Object.values(mapFiles).map((file) => [file.id, toExploreMap(file)]),
);

export const EXPLORE_MAP_START: ExploreMap =
  EXPLORE_MAPS.meadow ?? Object.values(EXPLORE_MAPS)[0];

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
