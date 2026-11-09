import type { Application } from "pixi.js";
import type { TilemapSet } from "../assets";
import {
  EXPLORE_MAP_START,
  EXPLORE_MAPS,
  exploreArrivalSpawn,
  type ExploreMap,
} from "../data/explore";
import { BattleScene } from "../scenes/BattleScene";
import { ExploreScene } from "../scenes/ExploreScene";
import { SelectionScene, type SelectionMode } from "../scenes/SelectionScene";
import { SceneManager } from "./SceneManager";

export class Game {
  private readonly scenes: SceneManager;

  constructor(
    readonly app: Application,
    private readonly tilemaps: TilemapSet,
  ) {
    this.scenes = new SceneManager(app);
  }

  start(): void {
    this.scenes.switchTo(
      new SelectionScene(this.app, (mode) => this.startMode(mode)),
    );
  }

  private startMode(mode: SelectionMode): void {
    if (mode === "combat") {
      this.startBattle();
    } else {
      this.startExplore();
    }
  }

  private startBattle(): void {
    this.scenes.switchTo(
      new BattleScene(
        this.app,
        this.tilemaps.summer,
        this.tilemaps.sprites,
        this.tilemaps.fireball,
        () => this.startBattle(),
      ),
    );
  }

  private startExplore(
    map: ExploreMap = EXPLORE_MAP_START,
    fromMapId: string | null = null,
  ): void {
    this.scenes.switchTo(
      new ExploreScene(
        this.app,
        this.tilemaps.summer,
        this.tilemaps.sprites.assassin,
        map,
        () => this.start(),
        (portal) => {
          const target = EXPLORE_MAPS[portal.target];
          if (target) this.startExplore(target, map.id);
        },
        exploreArrivalSpawn(map, fromMapId),
      ),
    );
  }
}
