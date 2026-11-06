import { Assets, Spritesheet, type Texture } from "pixi.js";
import dungeonTilemapUrl from "../assets/tiny_dungeon_tilemap.png";
import townTilemapUrl from "../assets/tiny_town_tilemap.png";
import {
  SHEET_COLS,
  SHEET_PITCH,
  SHEET_ROWS,
  TILE_PX,
  tileTextureId,
} from "./data/tiles";

export type TileTextures = Record<string, Texture>;

export interface TilemapSet {
  dungeon: TileTextures;
  town: TileTextures;
}

async function sliceTilemap(url: string): Promise<TileTextures> {
  const texture = await Assets.load<Texture>(url);

  const frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  > = {};
  for (let i = 0; i < SHEET_COLS * SHEET_ROWS; i++) {
    frames[tileTextureId(i)] = {
      frame: {
        x: (i % SHEET_COLS) * SHEET_PITCH,
        y: Math.floor(i / SHEET_COLS) * SHEET_PITCH,
        w: TILE_PX,
        h: TILE_PX,
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
  const [dungeon, town] = await Promise.all([
    sliceTilemap(dungeonTilemapUrl),
    sliceTilemap(townTilemapUrl),
  ]);
  return { dungeon, town };
}
