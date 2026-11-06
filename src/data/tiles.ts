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

export const SPRITE_SET = {
  assassin: "assassin",
  goblin: "goblin",
  chiefGoblin: "chief_goblin",
} as const;

export type SpriteSetName = (typeof SPRITE_SET)[keyof typeof SPRITE_SET];
