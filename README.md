# Turn-Based RPG (PixiJS v8 + TypeScript + Vite)

A minimal turn-based battle RPG built with PixiJS v8. Battle a Slime by choosing
Attack / Heal / Defend each turn until one side falls.

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
│   └── BattleScene.ts    # The turn-based battle: layout, turn flow, win/lose
├── entities/
│   └── Fighter.ts        # Combatant model + view (stats, HP, damage, healing)
├── systems/
│   └── TurnManager.ts    # Turn order (sorted by speed) and advancement
├── ui/
│   ├── ActionMenu.ts     # Clickable action buttons (Attack / Heal / Defend)
│   ├── HealthBar.ts      # HP bar that shifts green -> yellow -> red
│   └── BattleLog.ts      # Scrolling message log
├── data/
│   └── battle.ts         # Stats for the player and enemies, tuning constants
└── utils/
    └── tween.ts          # Tiny ticker-based tween helper (delays, lunges)
```

## How a battle works

1. `TurnManager` sorts combatants by `speed` and yields them one at a time.
2. On the player's turn, the `ActionMenu` is shown; picking an action resolves
   it (damage rolls use `attack - defense` plus a small random variance).
3. On the enemy's turn, the Slime waits a beat, then lunges and attacks.
4. `Defend` halves the next incoming damage; `Heal` consumes one of the 3
   starting potions.
5. When either fighter's HP reaches 0, a banner is shown and clicking anywhere
   restarts the battle.

## Extending

- Add more enemies in `src/data/battle.ts` and spawn them in `BattleScene`.
- Add new scenes (title screen, map, shop) by implementing the `Scene`
  interface and calling `sceneManager.switchTo(...)` from `Game`.
- Replace the `Graphics`-drawn fighters with sprites via `Assets.load(...)`.
