export const SHEET_COLS = 12;
export const SHEET_ROWS = 11;
export const SHEET_PITCH = 17;
export const TILE_PX = 16;

export const TILE_INDEX = {
  floor: 48,
  floorDebris: [49, 50, 51, 52, 53],
  rock: 56,
  rockAlt: 63,
  hero: 96,
  mage: 84,
  slime: 108,
  bat: 109,
  goblin: 110,
} as const;

export const tileTextureId = (index: number): string => `tile_${index}`;
