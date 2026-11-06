import type { FighterStats } from "../entities/Fighter";
import { SPRITE_SET } from "./tiles";
import type { Tile } from "../utils/grid";

export const GRID_COLS = 8;
export const GRID_ROWS = 6;
export const TILE_SIZE = 72;
export const OBSTACLES: Tile[] = [
  { x: 3, y: 1 },
  { x: 4, y: 4 },
];

export const MAX_CT = 100;
export const CT_RATE = 6;
export const BACKSTAB_MULTIPLIER = 1.5;

export const partyStats: FighterStats[] = [
  {
    name: "Hero",
    team: "player",
    maxHp: 60,
    attack: 12,
    defense: 4,
    speed: 8,
    maxMp: 8,
    move: 3,
    range: 1,
    color: 0x4a9eff,
    spawn: { x: 0, y: 2 },
    sprites: SPRITE_SET.assassin,
    skills: [
      {
        id: "power-strike",
        name: "Power Strike",
        mpCost: 4,
        range: 1,
        power: 1.8,
      },
    ],
  },
  {
    name: "Mage",
    team: "player",
    maxHp: 42,
    attack: 8,
    defense: 2,
    speed: 6,
    maxMp: 14,
    move: 3,
    range: 1,
    color: 0xb06ae0,
    spawn: { x: 0, y: 4 },
    sprites: SPRITE_SET.assassin,
    skills: [
      {
        id: "fire",
        name: "Fire",
        mpCost: 5,
        range: 3,
        power: 1.5,
        magical: true,
      },
      {
        id: "heal",
        name: "Heal",
        mpCost: 4,
        range: 2,
        healAmount: 26,
        targetAlly: true,
      },
    ],
  },
];

export const enemyStats: FighterStats[] = [
  {
    name: "Goblin",
    team: "enemy",
    maxHp: 26,
    attack: 10,
    defense: 1,
    speed: 6,
    maxMp: 0,
    move: 3,
    range: 1,
    color: 0x7ac24f,
    spawn: { x: 7, y: 1 },
    sprites: SPRITE_SET.goblin,
    skills: [],
  },
  {
    name: "Goblin 2",
    team: "enemy",
    maxHp: 24,
    attack: 11,
    defense: 1,
    speed: 7,
    maxMp: 0,
    move: 4,
    range: 1,
    color: 0x9ac24f,
    spawn: { x: 7, y: 3 },
    sprites: SPRITE_SET.goblin,
    skills: [],
  },
  {
    name: "Chief Goblin",
    team: "enemy",
    maxHp: 40,
    attack: 13,
    defense: 2,
    speed: 5,
    maxMp: 0,
    move: 3,
    range: 1,
    color: 0xc24f4f,
    spawn: { x: 6, y: 4 },
    sprites: SPRITE_SET.chiefGoblin,
    skills: [],
  },
];
