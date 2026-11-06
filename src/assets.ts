import { Assets, Spritesheet, type Texture } from "pixi.js";
import { SPRITE_SET, type SpriteSetName } from "./data/tiles";
import type { Facing } from "./utils/grid";

export type TileTextures = Record<string, Texture>;

export const SPRITE_FRAME_PX = 480;

export type SpriteState = "idle" | "walk" | "attack" | "hurt";

export type CharacterSprites = {
  directions: Record<Facing, Record<SpriteState, Texture[]>>;
  dying: Texture[];
};

export interface TilemapSet {
  summer: TileTextures;
  sprites: Record<SpriteSetName, CharacterSprites>;
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

const SPRITE_FOLDERS = Object.values(SPRITE_SET);

const spriteSheetUrls = import.meta.glob<string>(
  "../assets/sprites/{assassin,goblin,chief_goblin}/* - {Idle,Walking,Attacking,Hurt}.png",
  { eager: true, query: "?url", import: "default" },
);
const spriteDyingUrls = import.meta.glob<string>(
  "../assets/sprites/{assassin,goblin,chief_goblin}/Dying.png",
  { eager: true, query: "?url", import: "default" },
);

const SPRITE_DIRECTION: Record<string, Facing> = {
  front: "down",
  back: "up",
  left: "left",
  right: "right",
};

const SPRITE_STATE_FILE: Record<SpriteState, string> = {
  idle: "Idle",
  walk: "Walking",
  attack: "Attacking",
  hurt: "Hurt",
};

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

async function loadCharacterSprites(
  folder: SpriteSetName,
): Promise<CharacterSprites> {
  const directions = {} as CharacterSprites["directions"];
  await Promise.all(
    Object.entries(SPRITE_DIRECTION).map(async ([dir, facing]) => {
      const name = dir[0].toUpperCase() + dir.slice(1);
      const states = {} as CharacterSprites["directions"][Facing];
      await Promise.all(
        (Object.keys(SPRITE_STATE_FILE) as SpriteState[]).map(async (state) => {
          states[state] = await sliceSpriteSheet(
            spriteSheetUrls[
              `../assets/sprites/${folder}/${name} - ${SPRITE_STATE_FILE[state]}.png`
            ],
          );
        }),
      );
      directions[facing] = states;
    }),
  );
  const dying = await sliceSpriteSheet(
    spriteDyingUrls[`../assets/sprites/${folder}/Dying.png`],
  );
  return { directions, dying };
}

async function loadSprites(): Promise<TilemapSet["sprites"]> {
  const out = {} as TilemapSet["sprites"];
  await Promise.all(
    SPRITE_FOLDERS.map(async (folder) => {
      out[folder] = await loadCharacterSprites(folder);
    }),
  );
  return out;
}

export async function loadTilemaps(): Promise<TilemapSet> {
  const [summer, sprites] = await Promise.all([
    loadSummerTiles(),
    loadSprites(),
  ]);
  return { summer, sprites };
}
