import type { FighterStats } from "../entities/Fighter";

export const playerStats: FighterStats = {
  name: "Hero",
  maxHp: 60,
  attack: 12,
  defense: 4,
  speed: 8,
  color: 0x4a9eff,
};

export const enemyStats: FighterStats = {
  name: "Slime",
  maxHp: 40,
  attack: 9,
  defense: 2,
  speed: 5,
  color: 0x59c24f,
};

export const HEAL_AMOUNT = 20;
export const STARTING_POTIONS = 3;
