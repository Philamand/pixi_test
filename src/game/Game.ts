import type { Application } from "pixi.js";
import type { TileTextures } from "../assets";
import { BattleScene } from "../scenes/BattleScene";
import { SceneManager } from "./SceneManager";

export class Game {
  private readonly scenes: SceneManager;

  constructor(
    readonly app: Application,
    private readonly textures: TileTextures,
  ) {
    this.scenes = new SceneManager(app);
  }

  start(): void {
    this.scenes.switchTo(
      new BattleScene(this.app, this.textures, () => this.start()),
    );
  }
}
