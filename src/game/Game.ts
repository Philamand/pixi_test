import type { Application } from "pixi.js";
import type { TilemapSet } from "../assets";
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
        () => this.startBattle(),
      ),
    );
  }

  private startExplore(): void {
    this.scenes.switchTo(
      new ExploreScene(
        this.app,
        this.tilemaps.summer,
        this.tilemaps.sprites.assassin,
        () => this.start(),
      ),
    );
  }
}
