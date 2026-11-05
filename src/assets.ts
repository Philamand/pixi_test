import { Spritesheet, Texture } from "pixi.js";
import tilemapUrl from "../assets/tiny_dungeon_tilemap.png";
import {
  SHEET_COLS,
  SHEET_PITCH,
  SHEET_ROWS,
  TILE_PX,
  tileTextureId,
} from "./data/tiles";

export type TileTextures = Record<string, Texture>;

export async function loadTilemap(): Promise<TileTextures> {
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

  const sheet = new Spritesheet(Texture.from(tilemapUrl), {
    frames,
    meta: { scale: "1" },
  });
  await sheet.parse();
  return sheet.textures;
}
