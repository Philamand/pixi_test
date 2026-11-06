import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Point,
  Sprite,
  Text,
  Ticker,
} from "pixi.js";
import {
  SPRITE_FRAME_PX,
  type CharacterSprites,
  type TileTextures,
} from "../assets";
import {
  EXPLORE_COLS,
  EXPLORE_ROWS,
  EXPLORE_SPAWN,
  EXPLORE_TILE_SIZE,
  exploreTileKey,
  isExploreBlocked,
} from "../data/explore";
import type { Scene } from "../game/Scene";
import { facingFromDelta, type Facing } from "../utils/grid";

const SPEED_PX_PER_MS = 0.18;
const PLAYER_RADIUS = 12;

const MOVE_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "w",
  "s",
  "a",
  "d",
  "W",
  "S",
  "A",
  "D",
]);

export class ExploreScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly tileLayer = new Container();
  private readonly player: AnimatedSprite;
  private facing: Facing = "down";
  private readonly hint = new Text({
    text: "WASD / Arrow keys to move — Esc for menu",
    style: { fill: 0xccccdd, fontSize: 14, align: "center" },
  });

  private readonly keys = new Set<string>();
  private readonly playerOffset = new Point(
    (EXPLORE_SPAWN.x + 0.5) * EXPLORE_TILE_SIZE,
    (EXPLORE_SPAWN.y + 0.5) * EXPLORE_TILE_SIZE,
  );
  private origin = new Point(0, 0);

  constructor(
    private readonly app: Application,
    private readonly ground: TileTextures,
    private readonly animations: CharacterSprites,
    private readonly onExit: () => void,
  ) {
    this.player = new AnimatedSprite(animations.directions.down.idle);
    this.player.anchor.set(0.5, 0.8);
    this.player.animationSpeed = 0.1;
    this.player.play();
  }

  enter(): void {
    this.container.addChild(this.bg, this.tileLayer, this.player, this.hint);

    this.app.renderer.on("resize", this.layout);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clearKeys);
    this.app.ticker.add(this.update);
    this.layout();
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clearKeys);
    this.app.ticker.remove(this.update);
    this.keys.clear();
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

    for (let y = 0; y < EXPLORE_ROWS; y++) {
      for (let x = 0; x < EXPLORE_COLS; x++) {
        const key = exploreTileKey(x, y);
        if (key === null) continue;
        const texture = this.ground[key];
        if (!texture) continue;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.scale.set(
          EXPLORE_TILE_SIZE / Math.max(texture.width, texture.height),
        );
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
    if (!MOVE_KEYS.has(e.key)) return;
    e.preventDefault();
    this.keys.add(e.key);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key);
  };

  private readonly clearKeys = (): void => {
    this.keys.clear();
  };

  private readonly update = (t: Ticker): void => {
    let dx = 0;
    let dy = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A"))
      dx -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("d") || this.keys.has("D"))
      dx += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W"))
      dy -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("s") || this.keys.has("S"))
      dy += 1;
    if (dx === 0 && dy === 0) {
      this.setPlayerAnimation(false);
      return;
    }
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    this.facing = facingFromDelta(dx, dy);

    const step = SPEED_PX_PER_MS * t.deltaMS;
    let absX = this.origin.x + this.playerOffset.x;
    let absY = this.origin.y + this.playerOffset.y;

    const nextX = absX + dx * step;
    if (!this.collides(nextX, absY)) absX = nextX;
    const nextY = absY + dy * step;
    if (!this.collides(absX, nextY)) absY = nextY;

    this.playerOffset.set(absX - this.origin.x, absY - this.origin.y);
    this.positionPlayer();
    this.setPlayerAnimation(true);
  };

  private setPlayerAnimation(moving: boolean): void {
    const anim = moving
      ? this.animations.directions[this.facing].walk
      : this.animations.directions[this.facing].idle;
    if (this.player.textures !== anim) {
      this.player.textures = anim;
      this.player.gotoAndPlay(0);
    }
    this.player.animationSpeed = moving ? 0.2 : 0.1;
  }

  private collides(x: number, y: number): boolean {
    const minTx = Math.floor(
      (x - PLAYER_RADIUS - this.origin.x) / EXPLORE_TILE_SIZE,
    );
    const maxTx = Math.floor(
      (x + PLAYER_RADIUS - this.origin.x) / EXPLORE_TILE_SIZE,
    );
    const minTy = Math.floor(
      (y - PLAYER_RADIUS - this.origin.y) / EXPLORE_TILE_SIZE,
    );
    const maxTy = Math.floor(
      (y + PLAYER_RADIUS - this.origin.y) / EXPLORE_TILE_SIZE,
    );
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (isExploreBlocked(tx, ty)) return true;
      }
    }
    return false;
  }

  private positionPlayer(): void {
    this.player.scale.set((EXPLORE_TILE_SIZE * 1.5) / SPRITE_FRAME_PX);
    this.player.position.set(
      this.origin.x + this.playerOffset.x,
      this.origin.y + this.playerOffset.y,
    );
  }
}
