import { Assets, Spritesheet, type Texture } from "pixi.js";
import dungeonTilemapUrl from "../assets/tiny_dungeon_tilemap.png";
import {
  CHARACTER_PX,
  SHEET_COLS,
  SHEET_PITCH,
  SHEET_ROWS,
  tileTextureId,
} from "./data/tiles";
import type { Facing } from "./utils/grid";

export type TileTextures = Record<string, Texture>;

export const SPRITE_FRAME_PX = 480;

export type SpriteAnimations = Record<
  Facing,
  { idle: Texture[]; walk: Texture[] }
>;

export interface TilemapSet {
  summer: TileTextures;
  characters: TileTextures;
  assassin: SpriteAnimations;
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

const SPRITE_DIRECTION: Record<string, Facing> = {
  front: "down",
  back: "up",
  left: "left",
  right: "right",
};

const assassinIdleUrls = import.meta.glob<string>(
  "../assets/sprites/assassin/* - Idle.png",
  { eager: true, query: "?url", import: "default" },
);
const assassinWalkUrls = import.meta.glob<string>(
  "../assets/sprites/assassin/* - Walking.png",
  { eager: true, query: "?url", import: "default" },
);

async function sliceSpriteSheet(url: string): Promise<Texture[]> {
  const texture = await Assets.load<Texture>(url);
  texture.source.scaleMode = "nearest";

  const cols = Math.round(texture.width / SPRITE_FRAME_PX);
  const rows = Math.round(texture.height / SPRITE_FRAME_PX);
  const frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  > = {};
  for (let i = 0; i < cols * rows; i++) {
    frames[`frame_${i}`] = {
      frame: {
        x: (i % cols) * SPRITE_FRAME_PX,
        y: Math.floor(i / cols) * SPRITE_FRAME_PX,
        w: SPRITE_FRAME_PX,
        h: SPRITE_FRAME_PX,
      },
    };
  }

  const sheet = new Spritesheet({
    texture,
    data: { frames, meta: { scale: "1" } },
  });
  await sheet.parse();
  const textures: Texture[] = [];
  for (let i = 0; i < cols * rows; i++)
    textures.push(sheet.textures[`frame_${i}`]);
  return textures;
}

async function loadAssassinAnimations(): Promise<SpriteAnimations> {
  const anims = {} as SpriteAnimations;
  await Promise.all(
    Object.entries(SPRITE_DIRECTION).map(async ([dir, facing]) => {
      const name = dir[0].toUpperCase() + dir.slice(1);
      const [idle, walk] = await Promise.all([
        sliceSpriteSheet(
          assassinIdleUrls[`../assets/sprites/assassin/${name} - Idle.png`],
        ),
        sliceSpriteSheet(
          assassinWalkUrls[`../assets/sprites/assassin/${name} - Walking.png`],
        ),
      ]);
      anims[facing] = { idle, walk };
    }),
  );
  return anims;
}

export async function loadTilemaps(): Promise<TilemapSet> {
  const [summer, characters, assassin] = await Promise.all([
    loadSummerTiles(),
    sliceDungeonTilemap(dungeonTilemapUrl),
    loadAssassinAnimations(),
  ]);
  return { summer, characters, assassin };
}
