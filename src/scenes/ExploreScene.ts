import {
  AnimatedSprite,
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Ticker,
} from "pixi.js";
import {
  SPRITE_FRAME_PX,
  type CharacterSprites,
  type TileTextures,
} from "../assets";
import {
  EXPLORE_COLS,
  EXPLORE_LAYOUT,
  EXPLORE_ROWS,
  EXPLORE_SPAWN,
  EXPLORE_TILE_SIZE,
  exploreGrassKey,
  exploreTileKey,
  isExploreBlocked,
} from "../data/explore";
import type { Scene } from "../game/Scene";
import { ActionMenu } from "../ui/ActionMenu";
import {
  facingFromDelta,
  findPath,
  type Facing,
  type Tile,
} from "../utils/grid";

const SPEED_PX_PER_MS = 0.18;
const MENU_BAR_HEIGHT = 56;
const MARGIN = 16;

export class ExploreScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly menuBar = new Graphics();
  private readonly tileLayer = new Container();
  private readonly player: AnimatedSprite;
  private readonly menu = new ActionMenu();
  private facing: Facing = "down";

  private path: Tile[] = [];
  private tileSize = EXPLORE_TILE_SIZE;
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
    this.container.addChild(
      this.bg,
      this.menuBar,
      this.tileLayer,
      this.player,
      this.menu,
    );

    this.menu.show([{ id: "menu", label: "Menu" }], () => this.onExit());

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

    const playH = height - MENU_BAR_HEIGHT;
    this.menuBar
      .clear()
      .rect(0, playH, width, MENU_BAR_HEIGHT)
      .fill(0x1d1d36)
      .stroke({ width: 2, color: 0x2e2e4a });

    const size = Math.max(
      8,
      Math.min(
        (width - MARGIN * 2) / EXPLORE_COLS,
        (playH - MARGIN * 2) / EXPLORE_ROWS,
      ),
    );
    const ratio = size / this.tileSize;
    this.tileSize = size;
    this.playerOffset.set(
      this.playerOffset.x * ratio,
      this.playerOffset.y * ratio,
    );

    const mapW = EXPLORE_COLS * this.tileSize;
    const mapH = EXPLORE_ROWS * this.tileSize;
    this.origin.set((width - mapW) / 2, (playH - mapH) / 2);

    this.buildTileSprites();
    this.positionPlayer();

    this.menu.position.set(
      width / 2 - this.menu.width / 2,
      playH + (MENU_BAR_HEIGHT - this.menu.height) / 2,
    );
    this.container.hitArea = new Rectangle(0, 0, width, height);
  };

  private buildTileSprites(): void {
    for (const child of this.tileLayer.removeChildren()) child.destroy();

    for (let y = 0; y < EXPLORE_ROWS; y++) {
      for (let x = 0; x < EXPLORE_COLS; x++) {
        const char = EXPLORE_LAYOUT[y][x];
        if (char !== "." && char !== ",") {
          this.addTileSprite(exploreGrassKey(x, y), x, y);
        }
        const key = exploreTileKey(x, y);
        if (key === null) continue;
        this.addTileSprite(key, x, y);
      }
    }
  }

  private addTileSprite(key: string, x: number, y: number): void {
    const texture = this.ground[key];
    if (!texture) return;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(this.tileSize / Math.max(texture.width, texture.height));
    sprite.position.set(
      this.origin.x + (x + 0.5) * this.tileSize,
      this.origin.y + (y + 0.5) * this.tileSize,
    );
    this.tileLayer.addChild(sprite);
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
      x: Math.floor(this.playerOffset.x / this.tileSize),
      y: Math.floor(this.playerOffset.y / this.tileSize),
    };
    const path = findPath(from, tile, EXPLORE_COLS, EXPLORE_ROWS, (t) =>
      isExploreBlocked(t.x, t.y),
    );
    if (path) this.path = path;
  };

  private toTile(p: Point): Tile | null {
    const x = Math.floor((p.x - this.origin.x) / this.tileSize);
    const y = Math.floor((p.y - this.origin.y) / this.tileSize);
    if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return null;
    return { x, y };
  }

  private readonly update = (t: Ticker): void => {
    if (this.path.length === 0) {
      this.setPlayerAnimation(false);
      return;
    }

    const target = this.path[0];
    const targetX = (target.x + 0.5) * this.tileSize;
    const targetY = (target.y + 0.5) * this.tileSize;
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
    this.player.scale.set((this.tileSize * 1.5) / SPRITE_FRAME_PX);
    this.player.position.set(
      this.origin.x + this.playerOffset.x,
      this.origin.y + this.playerOffset.y,
    );
  }
}
