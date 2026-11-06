export const SHEET_COLS = 12;
export const SHEET_ROWS = 11;
export const SHEET_PITCH = 17;
export const CHARACTER_PX = 16;

export const DUNGEON_CHARACTER = {
  hero: 96,
  mage: 84,
  slime: 108,
  bat: 109,
  goblin: 110,
} as const;

export const tileTextureId = (index: number): string => `tile_${index}`;

// Simple Summer tiles are individual PNGs; texture keys are derived from the
// file names (see summerTileKey in src/assets.ts).
export const SUMMER_TILE = {
  grass: "ground_05",
  grassAlt: "ground_50",
  grassAlt2: "ground_52",
  grassDebris: ["ground_40", "ground_43", "ground_48"],
  sand: "ground_14",
  pond: ["ground_30", "ground_34", "ground_36"],
  tree: "prop_tree_medium",
  treeSmall: "prop_tree_small",
  bush: "prop_bushes_medium",
  rock: "prop_rock_01",
  rockAlt: "prop_rock_02",
  fence: "prop_wooden_fence_horizontal",
} as const;
