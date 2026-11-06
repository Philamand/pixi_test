import { Application, Container, Graphics, Point, Sprite, Text } from "pixi.js";
import type { TileTextures } from "../assets";
import {
  EXPLORE_COLS,
  EXPLORE_ROWS,
  EXPLORE_SPAWN,
  EXPLORE_TILE_SIZE,
  exploreTileIndex,
  isExploreBlocked,
} from "../data/explore";
import { TILE_INDEX, TILE_PX, tileTextureId } from "../data/tiles";
import type { Scene } from "../game/Scene";
import type { Tile } from "../utils/grid";
import { tween, type TweenHandle } from "../utils/tween";

const MOVE_MS = 140;

const KEY_DELTAS: Record<string, Tile> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 },
};

export class ExploreScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly tileLayer = new Container();
  private readonly player: Sprite;
  private readonly hint = new Text({
    text: "WASD / Arrow keys to move — Esc for menu",
    style: { fill: 0xccccdd, fontSize: 14, align: "center" },
  });

  private playerTile: Tile = { ...EXPLORE_SPAWN };
  private origin = new Point(0, 0);
  private moving = false;
  private moveTween: TweenHandle | null = null;

  constructor(
    private readonly app: Application,
    private readonly textures: TileTextures,
    private readonly onExit: () => void,
  ) {
    this.player = new Sprite(textures[tileTextureId(TILE_INDEX.hero)]);
    this.player.anchor.set(0.5);
  }

  enter(): void {
    this.container.addChild(this.bg, this.tileLayer, this.player, this.hint);

    this.app.renderer.on("resize", this.layout);
    window.addEventListener("keydown", this.onKeyDown);
    this.layout();
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
    window.removeEventListener("keydown", this.onKeyDown);
    this.moveTween?.cancel();
    this.moveTween = null;
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;

    this.bg.clear().rect(0, 0, width, height).fill(0x141428);

    const mapW = EXPLORE_COLS * EXPLORE_TILE_SIZE;
    const mapH = EXPLORE_ROWS * EXPLORE_TILE_SIZE;
    this.origin.set(
      Math.max(16, (width - mapW) / 2),
      Math.max(48, (height - mapH) / 2 - 16),
    );

    this.buildTileSprites();
    this.positionPlayer();

    this.hint.anchor.set(0.5);
    this.hint.position.set(width / 2, this.origin.y + mapH + 24);
  };

  private buildTileSprites(): void {
    for (const child of this.tileLayer.removeChildren()) child.destroy();

    const scale = EXPLORE_TILE_SIZE / TILE_PX;
    for (let y = 0; y < EXPLORE_ROWS; y++) {
      for (let x = 0; x < EXPLORE_COLS; x++) {
        const index = exploreTileIndex(x, y);
        if (index === null) continue;
        const texture = this.textures[tileTextureId(index)];
        if (!texture) continue;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale);
        sprite.position.set(
          this.origin.x + (x + 0.5) * EXPLORE_TILE_SIZE,
          this.origin.y + (y + 0.5) * EXPLORE_TILE_SIZE,
        );
        this.tileLayer.addChild(sprite);
      }
    }
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.onExit();
      return;
    }
    const delta = KEY_DELTAS[e.key];
    if (!delta) return;
    e.preventDefault();
    this.tryMove(delta);
  };

  private tryMove(delta: Tile): void {
    if (this.moving) return;
    const target = {
      x: this.playerTile.x + delta.x,
      y: this.playerTile.y + delta.y,
    };
    if (isExploreBlocked(target.x, target.y)) return;

    this.moving = true;
    const start = this.player.position.clone();
    const end = new Point(
      this.origin.x + (target.x + 0.5) * EXPLORE_TILE_SIZE,
      this.origin.y + (target.y + 0.5) * EXPLORE_TILE_SIZE,
    );
    this.moveTween = tween(
      this.app.ticker,
      MOVE_MS,
      (p) => {
        this.player.position.set(
          start.x + (end.x - start.x) * p,
          start.y + (end.y - start.y) * p,
        );
      },
      () => {
        this.playerTile = target;
        this.moving = false;
        this.moveTween = null;
      },
    );
  }

  private positionPlayer(): void {
    this.player.scale.set(EXPLORE_TILE_SIZE / TILE_PX);
    this.player.position.set(
      this.origin.x + (this.playerTile.x + 0.5) * EXPLORE_TILE_SIZE,
      this.origin.y + (this.playerTile.y + 0.5) * EXPLORE_TILE_SIZE,
    );
  }
}
