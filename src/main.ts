import { Application } from "pixi.js";
import { loadTilemaps } from "./assets";
import { Game } from "./game/Game";

(async () => {
  const app = new Application();

  await app.init({ background: "#141428", resizeTo: window });

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const tilemaps = await loadTilemaps();
  const game = new Game(app, tilemaps);
  game.start();
})();
