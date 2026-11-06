# Tactical RPG (PixiJS v8 + TypeScript + Vite)

A Final-Fantasy-Tactics-style tactical battle built with PixiJS v8. A party of
two (Hero + Mage) fights three enemies on a grid battlefield where units act
based on a charge-time (CT) turn system.

## Run

```bash
npm install
npm run dev      # start the dev server (port 8080)
npm run build    # lint + typecheck + production build
```

## Project structure

```
src/
├── main.ts               # Bootstrap: creates the Application and starts the Game
├── game/
│   ├── Game.ts           # Root game object, owns the SceneManager
│   ├── Scene.ts          # Scene interface (enter/exit + container)
│   └── SceneManager.ts   # Switches between scenes, disposes the old one
├── scenes/
│   ├── SelectionScene.ts # Mode selection screen (Combat / Explore)
│   ├── ExploreScene.ts   # Overworld exploration: walk the summer map (WASD/arrows)
│   └── BattleScene.ts    # The tactical battle: grid, turn flow, input, enemy AI
├── entities/
│   └── Fighter.ts        # Combatant model + view (HP/MP/CT bars, facing, skills)
├── systems/
│   └── TurnManager.ts    # CT charge: units act when their charge reaches 100
├── ui/
│   ├── ActionMenu.ts     # Generic clickable menu (Move / Attack / Skill / Wait)
│   ├── TurnOrderPanel.ts # Live turn-order list sorted by charge time
│   ├── HealthBar.ts      # Generic bar (HP, MP, CT) with optional fixed color
│   └── BattleLog.ts      # Scrolling message log
├── data/
│   ├── battle.ts         # Grid config, party/enemy stats, skills, tuning constants
│   └── explore.ts        # Exploration map layout (Simple Summer tiles) and spawn
└── utils/
    ├── grid.ts           # Tiles, Chebyshev distance, range queries, facing
    └── tween.ts          # Tiny ticker-based tween helper (delays, lunges)
```

## How a battle works

1. Every unit has a charge time (CT) that fills in real time, faster for
   higher `speed`. When CT reaches 100 the unit takes a turn; the
   `TurnOrderPanel` shows who is next.
2. On a unit's turn you may **Move** to any highlighted tile (within the
   unit's move range, avoiding obstacles and occupied tiles) and then
   **Attack**, cast a **Skill**, or **Wait**.
3. Attacks and skills have a range; melee is range 1, the Mage's Fire reaches
   3 tiles and ignores most defense, Heal targets an ally. Skills cost MP.
4. Units have a facing direction (shown by the white arrow). Striking a unit
   from behind deals 150% damage.
5. Enemies move toward your party and attack when in range.
6. When one side is wiped out, a banner is shown and clicking anywhere
   restarts the battle.

## Extending

- Tune the grid, obstacles, units, and skills in `src/data/battle.ts`.
- Add new scenes (title screen, map, shop) by implementing the `Scene`
  interface and calling `sceneManager.switchTo(...)` from `Game`.
- Ground and prop tiles come from the Simple Summer set as individual PNGs
  in `assets/tiles/simple_summer/`, loaded by `src/assets.ts` and keyed by
  file name (e.g. `ground_05`, `prop_tree_medium`; see `SUMMER_TILE` in
  `src/data/tiles.ts`). Characters still use the Kenney Tiny Dungeon
  tilemap (`assets/tiny_dungeon_tilemap.png`), sliced into 16x16 frames by
  `src/assets.ts`; character indices live in `DUNGEON_CHARACTER`.

## Exploration

Choose **Explore** on the selection screen to walk the hero freely around
the summer map (hold WASD or arrow keys; trees, ponds, fences, rocks
and the map edge block movement via tile collision). Press **Esc** to return
to the selection screen. The map layout lives in `src/data/explore.ts` and
uses `SUMMER_TILE` keys from the Simple Summer tiles.
