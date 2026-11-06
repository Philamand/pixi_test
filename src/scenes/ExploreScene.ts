import {
  AnimatedSprite,
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Rectangle,
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
import {
  facingFromDelta,
  findPath,
  type Facing,
  type Tile,
} from "../utils/grid";

const SPEED_PX_PER_MS = 0.18;

export class ExploreScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly tileLayer = new Container();
  private readonly player: AnimatedSprite;
  private facing: Facing = "down";
  private readonly hint = new Text({
    text: "Click or tap to move \u2014 Esc for menu",
    style: { fill: 0xccccdd, fontSize: 14, align: "center" },
  });

  private path: Tile[] = [];
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

    this.container.eventMode = "static";
    this.container.on("pointerdown", this.onPointerDown);
    this.app.renderer.on("resize", this.layout);
    window.addEventListener("keydown", this.onKeyDown);
    this.app.ticker.add(this.update);
    this.layout();
  }

  exit(): void {
    this.container.off("pointerdown", this.onPointerDown);
    this.app.renderer.off("resize", this.layout);
    window.removeEventListener("keydown", this.onKeyDown);
    this.app.ticker.remove(this.update);
    this.path = [];
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
    this.container.hitArea = new Rectangle(0, 0, width, height);
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
    }
  };

  private readonly onPointerDown = (e: FederatedPointerEvent): void => {
    const tile = this.toTile(e.global);
    if (!tile || isExploreBlocked(tile.x, tile.y)) return;
    const from: Tile = {
      x: Math.floor(this.playerOffset.x / EXPLORE_TILE_SIZE),
      y: Math.floor(this.playerOffset.y / EXPLORE_TILE_SIZE),
    };
    const path = findPath(from, tile, EXPLORE_COLS, EXPLORE_ROWS, (t) =>
      isExploreBlocked(t.x, t.y),
    );
    if (path) this.path = path;
  };

  private toTile(p: Point): Tile | null {
    const x = Math.floor((p.x - this.origin.x) / EXPLORE_TILE_SIZE);
    const y = Math.floor((p.y - this.origin.y) / EXPLORE_TILE_SIZE);
    if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return null;
    return { x, y };
  }

  private readonly update = (t: Ticker): void => {
    if (this.path.length === 0) {
      this.setPlayerAnimation(false);
      return;
    }

    const target = this.path[0];
    const targetX = (target.x + 0.5) * EXPLORE_TILE_SIZE;
    const targetY = (target.y + 0.5) * EXPLORE_TILE_SIZE;
    const dx = targetX - this.playerOffset.x;
    const dy = targetY - this.playerOffset.y;
    const dist = Math.hypot(dx, dy);
    const step = SPEED_PX_PER_MS * t.deltaMS;

    this.facing = facingFromDelta(dx, dy);
    if (dist <= step) {
      this.playerOffset.set(targetX, targetY);
      this.path.shift();
    } else {
      this.playerOffset.set(
        this.playerOffset.x + (dx / dist) * step,
        this.playerOffset.y + (dy / dist) * step,
      );
    }
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

  private positionPlayer(): void {
    this.player.scale.set((EXPLORE_TILE_SIZE * 1.5) / SPRITE_FRAME_PX);
    this.player.position.set(
      this.origin.x + this.playerOffset.x,
      this.origin.y + this.playerOffset.y,
    );
  }
}
