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
  EXPLORE_TILE_SIZE,
  type ExploreMap,
  type ExplorePortal,
  exploreGrassKey,
  explorePortalAt,
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
import { tween, type TweenHandle } from "../utils/tween";

const SPEED_PX_PER_MS = 0.18;
const MENU_BAR_HEIGHT = 56;
const FADE_IN_MS = 350;
const FADE_OUT_MS = 250;

export class ExploreScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly menuBar = new Graphics();
  private readonly tileLayer = new Container();
  private readonly markerLayer = new Container();
  private readonly player: AnimatedSprite;
  private readonly menu = new ActionMenu();
  private readonly fade = new Graphics();
  private fadeTween: TweenHandle | null = null;
  private facing: Facing = "down";
  private teleported = false;

  private path: Tile[] = [];
  private tileW = EXPLORE_TILE_SIZE;
  private tileH = EXPLORE_TILE_SIZE;
  private readonly playerOffset: Point;
  private origin = new Point(0, 0);

  constructor(
    private readonly app: Application,
    private readonly ground: TileTextures,
    private readonly animations: CharacterSprites,
    private readonly map: ExploreMap,
    private readonly onExit: () => void,
    private readonly onTeleport: (portal: ExplorePortal) => void,
    spawn: Tile = map.spawn,
  ) {
    this.playerOffset = new Point(
      (spawn.x + 0.5) * EXPLORE_TILE_SIZE,
      (spawn.y + 0.5) * EXPLORE_TILE_SIZE,
    );
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
      this.markerLayer,
      this.player,
      this.menu,
      this.fade,
    );

    this.menu.show([{ id: "menu", label: "Menu" }], () => this.onExit());

    this.container.eventMode = "static";
    this.container.on("pointerdown", this.onPointerDown);
    this.app.renderer.on("resize", this.layout);
    window.addEventListener("keydown", this.onKeyDown);
    this.app.ticker.add(this.update);
    this.layout();
    this.fade.alpha = 1;
    this.fadeTween = tween(this.app.ticker, FADE_IN_MS, (p) => {
      this.fade.alpha = 1 - p;
    });
  }

  exit(): void {
    this.container.off("pointerdown", this.onPointerDown);
    this.app.renderer.off("resize", this.layout);
    window.removeEventListener("keydown", this.onKeyDown);
    this.app.ticker.remove(this.update);
    this.fadeTween?.cancel();
    this.fadeTween = null;
    this.path = [];
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;

    this.bg.clear().rect(0, 0, width, height).fill(0x141428);
    this.fade.clear().rect(0, 0, width, height).fill(0x000000);

    const playH = height - MENU_BAR_HEIGHT;
    this.menuBar
      .clear()
      .rect(0, playH, width, MENU_BAR_HEIGHT)
      .fill(0x1d1d36)
      .stroke({ width: 2, color: 0x2e2e4a });

    const prevW = this.tileW;
    const prevH = this.tileH;
    this.tileW = Math.max(8, width / this.map.cols);
    this.tileH = Math.max(8, playH / this.map.rows);
    this.playerOffset.set(
      this.playerOffset.x * (this.tileW / prevW),
      this.playerOffset.y * (this.tileH / prevH),
    );

    const mapW = this.map.cols * this.tileW;
    const mapH = this.map.rows * this.tileH;
    this.origin.set((width - mapW) / 2, (playH - mapH) / 2);

    this.buildTileSprites();
    this.buildMarkers();
    this.positionPlayer();

    this.menu.position.set(
      width / 2 - this.menu.width / 2,
      playH + (MENU_BAR_HEIGHT - this.menu.height) / 2,
    );
    this.container.hitArea = new Rectangle(0, 0, width, height);
  };

  private buildTileSprites(): void {
    for (const child of this.tileLayer.removeChildren()) child.destroy();

    for (let y = 0; y < this.map.rows; y++) {
      for (let x = 0; x < this.map.cols; x++) {
        const char = this.map.layout[y][x];
        if (char !== "." && char !== ",") {
          this.addTileSprite(exploreGrassKey(x, y), x, y);
        }
        const key = exploreTileKey(this.map, x, y);
        if (key === null) continue;
        this.addTileSprite(key, x, y);
      }
    }
  }

  private buildMarkers(): void {
    for (const child of this.markerLayer.removeChildren()) child.destroy();
    const radius = Math.min(this.tileW, this.tileH) * 0.35;
    for (const portal of this.map.portals) {
      const marker = new Graphics()
        .circle(0, 0, radius)
        .fill({ color: 0x7fd4ff, alpha: 0.45 })
        .stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
      marker.position.set(
        this.origin.x + (portal.x + 0.5) * this.tileW,
        this.origin.y + (portal.y + 0.5) * this.tileH,
      );
      this.markerLayer.addChild(marker);
    }
  }

  private addTileSprite(key: string, x: number, y: number): void {
    const texture = this.ground[key];
    if (!texture) return;
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(this.tileW / texture.width, this.tileH / texture.height);
    sprite.position.set(
      this.origin.x + (x + 0.5) * this.tileW,
      this.origin.y + (y + 0.5) * this.tileH,
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
    if (this.teleported) return;
    const tile = this.toTile(e.global);
    if (!tile || isExploreBlocked(this.map, tile.x, tile.y)) return;
    const from: Tile = {
      x: Math.floor(this.playerOffset.x / this.tileW),
      y: Math.floor(this.playerOffset.y / this.tileH),
    };
    const path = findPath(from, tile, this.map.cols, this.map.rows, (t) =>
      isExploreBlocked(this.map, t.x, t.y),
    );
    if (path) this.path = path;
  };

  private toTile(p: Point): Tile | null {
    const x = Math.floor((p.x - this.origin.x) / this.tileW);
    const y = Math.floor((p.y - this.origin.y) / this.tileH);
    if (x < 0 || y < 0 || x >= this.map.cols || y >= this.map.rows) return null;
    return { x, y };
  }

  private readonly update = (t: Ticker): void => {
    if (this.path.length === 0) {
      this.setPlayerAnimation(false);
      return;
    }

    const target = this.path[0];
    const targetX = (target.x + 0.5) * this.tileW;
    const targetY = (target.y + 0.5) * this.tileH;
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
    this.checkPortal();
  };

  private checkPortal(): void {
    if (this.teleported) return;
    const tileX = Math.floor(this.playerOffset.x / this.tileW);
    const tileY = Math.floor(this.playerOffset.y / this.tileH);
    const portal = explorePortalAt(this.map, tileX, tileY);
    if (portal) {
      this.teleported = true;
      this.fadeTween = tween(
        this.app.ticker,
        FADE_OUT_MS,
        (p) => {
          this.fade.alpha = p;
        },
        () => this.onTeleport(portal),
      );
    }
  }

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
    this.player.scale.set((this.tileH * 1.5) / SPRITE_FRAME_PX);
    this.player.position.set(
      this.origin.x + this.playerOffset.x,
      this.origin.y + this.playerOffset.y,
    );
  }
}
