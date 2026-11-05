import type { Application } from "pixi.js";
import { BattleScene } from "../scenes/BattleScene";
import { SceneManager } from "./SceneManager";

export class Game {
  private readonly scenes: SceneManager;

  constructor(readonly app: Application) {
    this.scenes = new SceneManager(app);
  }

  start(): void {
    this.scenes.switchTo(new BattleScene(this.app, () => this.start()));
  }
}
