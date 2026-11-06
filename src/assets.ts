import { Assets, Spritesheet, type Texture } from "pixi.js";
import dungeonTilemapUrl from "../assets/tiny_dungeon_tilemap.png";
import {
  CHARACTER_PX,
  SHEET_COLS,
  SHEET_PITCH,
  SHEET_ROWS,
  tileTextureId,
} from "./data/tiles";

export type TileTextures = Record<string, Texture>;

export interface TilemapSet {
  summer: TileTextures;
  characters: TileTextures;
}

const summerTileUrls = import.meta.glob<string>(
  "../assets/tiles/simple_summer/*.png",
  { eager: true, query: "?url", import: "default" },
);

export function summerTileKey(path: string): string {
  return path
    .split("/")
    .pop()!
    .replace(/\.png$/i, "")
    .replace(/^top-down simple summer_?/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function loadSummerTiles(): Promise<TileTextures> {
  const entries = await Promise.all(
    Object.entries(summerTileUrls).map(async ([path, url]) => {
      const texture = await Assets.load<Texture>(url);
      texture.source.scaleMode = "nearest";
      return [summerTileKey(path), texture] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function sliceDungeonTilemap(url: string): Promise<TileTextures> {
  const texture = await Assets.load<Texture>(url);
  texture.source.scaleMode = "nearest";

  const frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  > = {};
  for (let i = 0; i < SHEET_COLS * SHEET_ROWS; i++) {
    frames[tileTextureId(i)] = {
      frame: {
        x: (i % SHEET_COLS) * SHEET_PITCH,
        y: Math.floor(i / SHEET_COLS) * SHEET_PITCH,
        w: CHARACTER_PX,
        h: CHARACTER_PX,
      },
    };
  }

  const sheet = new Spritesheet({
    texture,
    data: { frames, meta: { scale: "1" } },
  });
  await sheet.parse();
  return sheet.textures;
}

export async function loadTilemaps(): Promise<TilemapSet> {
  const [summer, characters] = await Promise.all([
    loadSummerTiles(),
    sliceDungeonTilemap(dungeonTilemapUrl),
  ]);
  return { summer, characters };
}
