import {
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
import type { TileTextures } from "../assets";
import {
  BACKSTAB_MULTIPLIER,
  enemyStats,
  GRID_COLS,
  GRID_ROWS,
  OBSTACLES,
  partyStats,
  TILE_SIZE,
} from "../data/battle";
import { TILE_INDEX, TILE_PX, tileTextureId } from "../data/tiles";
import { Fighter, type Skill } from "../entities/Fighter";
import type { Scene } from "../game/Scene";
import { TurnManager } from "../systems/TurnManager";
import { ActionMenu, type MenuItem } from "../ui/ActionMenu";
import { BattleLog } from "../ui/BattleLog";
import { TurnOrderPanel } from "../ui/TurnOrderPanel";
import {
  chebyshev,
  FACING_VECTORS,
  tileKey,
  tilesWithinRange,
  type Tile,
} from "../utils/grid";
import { tween } from "../utils/tween";

type Phase = "charging" | "menu" | "resolving" | "enemy" | "over";

type Selecting = "none" | "move" | "target";

export class BattleScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly tileLayer = new Container();
  private readonly gridGfx = new Graphics();
  private readonly highlightGfx = new Graphics();
  private readonly menu = new ActionMenu();
  private readonly log = new BattleLog();
  private fighters: Fighter[] = [];
  private turns!: TurnManager;
  private orderPanel!: TurnOrderPanel;
  private banner!: Text;

  private phase: Phase = "charging";
  private selecting: Selecting = "none";
  private active: Fighter | null = null;
  private hasMoved = false;
  private moveTiles: Tile[] = [];
  private targetUnits: Fighter[] = [];
  private pendingSkill: Skill | null = null;
  private hover: Tile | null = null;
  private over = false;
  private origin = new Point(0, 0);

  constructor(
    private readonly app: Application,
    private readonly textures: TileTextures,
    private readonly onRestart: () => void,
  ) {}

  enter(): void {
    this.container.addChild(
      this.bg,
      this.tileLayer,
      this.gridGfx,
      this.highlightGfx,
    );

    this.fighters = [...partyStats, ...enemyStats].map(
      (s) => new Fighter(s, this.textures[tileTextureId(s.sprite)]),
    );
    for (const f of this.fighters) this.container.addChild(f);

    this.orderPanel = new TurnOrderPanel(this.fighters);
    this.container.addChild(this.menu, this.log, this.orderPanel);

    this.banner = new Text({
      text: "",
      style: {
        fill: 0xffe066,
        fontSize: 32,
        fontWeight: "bold",
        align: "center",
      },
    });
    this.banner.anchor.set(0.5);
    this.banner.visible = false;
    this.container.addChild(this.banner);

    this.container.eventMode = "static";
    this.container.on("pointerdown", this.onPointerDown);
    this.container.on("pointermove", this.onPointerMove);

    this.app.renderer.on("resize", this.layout);
    this.layout();

    this.turns = new TurnManager(this.fighters);
    this.log.add("Tactical battle! Defeat all enemies.");
    this.app.ticker.add(this.update);
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
    this.app.ticker.remove(this.update);
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;

    this.bg.clear().rect(0, 0, width, height).fill(0x141428);

    const panelWidth = 250;
    const gridW = GRID_COLS * TILE_SIZE;
    const gridH = GRID_ROWS * TILE_SIZE;
    this.origin.set(
      Math.max(16, (width - panelWidth - gridW) / 2),
      Math.max(48, (height - gridH) / 2 - 16),
    );

    this.buildTileSprites();

    this.gridGfx.clear();
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const px = this.origin.x + x * TILE_SIZE;
        const py = this.origin.y + y * TILE_SIZE;
        this.gridGfx
          .rect(px, py, TILE_SIZE, TILE_SIZE)
          .stroke({ width: 1, color: 0x00000088 });
      }
    }

    for (const f of this.fighters) this.positionFighter(f);

    const panelX = this.origin.x + gridW + 24;
    this.orderPanel.position.set(panelX, this.origin.y);
    this.log.position.set(panelX, this.origin.y + 250);
    this.menu.position.set(this.origin.x, this.origin.y + gridH + 16);
    this.banner.position.set(width / 2, height * 0.12);
    this.container.hitArea = new Rectangle(0, 0, width, height);
    this.drawHighlights();
  };

  private buildTileSprites(): void {
    for (const child of this.tileLayer.removeChildren()) child.destroy();

    const scale = TILE_SIZE / TILE_PX;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const obstacle = this.isObstacle({ x, y });
        const debris =
          TILE_INDEX.floorDebris[
            (x * 3 + y * 5) % TILE_INDEX.floorDebris.length
          ];
        const index = obstacle
          ? (x + y) % 2 === 0
            ? TILE_INDEX.rock
            : TILE_INDEX.rockAlt
          : (x + y) % 4 === 0
            ? debris
            : TILE_INDEX.floor;
        const texture = this.textures[tileTextureId(index)];
        if (!texture) continue;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.scale.set(scale);
        sprite.position.set(
          this.origin.x + (x + 0.5) * TILE_SIZE,
          this.origin.y + (y + 0.5) * TILE_SIZE,
        );
        this.tileLayer.addChild(sprite);
      }
    }
  }

  private readonly update = (t: Ticker): void => {
    this.orderPanel.refresh();
    if (this.over || this.phase !== "charging") return;
    this.turns.update(t.deltaMS);
    const ready = this.turns.ready();
    if (ready) this.beginTurn(ready);
  };

  private beginTurn(f: Fighter): void {
    if (!f.isAlive) {
      this.turns.consume(f);
      return;
    }
    this.active = f;
    if (f.stats.team === "player") {
      this.phase = "menu";
      this.hasMoved = false;
      this.log.add(`${f.stats.name}'s turn.`);
      this.showMainMenu();
    } else {
      this.phase = "enemy";
      this.menu.hide();
      void this.runEnemy(f);
    }
    this.drawHighlights();
  }

  private readonly onPointerDown = (e: FederatedPointerEvent): void => {
    if (this.over) {
      this.onRestart();
      return;
    }
    const tile = this.toTile(e.global);
    if (!tile) return;
    if (this.phase !== "menu" || !this.active) return;

    if (
      this.selecting === "move" &&
      this.moveTiles.some((t) => t.x === tile.x && t.y === tile.y)
    ) {
      void this.tryMove(tile);
    } else if (this.selecting === "target") {
      const target = this.unitAt(tile);
      if (target && this.targetUnits.includes(target)) {
        void this.resolveAction(target);
      } else {
        this.selecting = "none";
        this.showMainMenu();
        this.drawHighlights();
      }
    }
  };

  private readonly onPointerMove = (e: FederatedPointerEvent): void => {
    const tile = this.toTile(e.global);
    if (tile?.x === this.hover?.x && tile?.y === this.hover?.y) return;
    this.hover = tile;
    this.drawHighlights();
  };

  private showMainMenu(): void {
    if (!this.active) return;
    const items: MenuItem[] = [
      { id: "move", label: "Move", disabled: this.hasMoved },
      { id: "attack", label: "Attack" },
      { id: "skill", label: "Skill" },
      { id: "wait", label: "Wait" },
    ];
    this.menu.show(items, (id) => this.onMenuSelect(id));
  }

  private onMenuSelect(id: string): void {
    if (!this.active || this.phase !== "menu") return;
    switch (id) {
      case "move":
        this.selecting = "move";
        this.computeMoveTiles();
        this.log.add("Choose a destination tile.");
        this.drawHighlights();
        break;
      case "attack":
        this.beginTargeting(null);
        break;
      case "skill":
        this.showSkillMenu();
        break;
      case "wait":
        this.log.add(`${this.active.stats.name} waits.`);
        this.endTurn();
        break;
    }
  }

  private showSkillMenu(): void {
    const f = this.active;
    if (!f) return;
    const items: MenuItem[] = f.stats.skills.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.mpCost} MP)`,
      disabled: f.mp < s.mpCost,
    }));
    items.push({ id: "back", label: "Back" });
    this.selecting = "none";
    this.menu.show(items, (id) => {
      if (!this.active) return;
      if (id === "back") {
        this.showMainMenu();
        return;
      }
      const skill = this.active.stats.skills.find((s) => s.id === id);
      if (skill) this.beginTargeting(skill);
    });
  }

  private beginTargeting(skill: Skill | null): void {
    const f = this.active;
    if (!f) return;
    const range = skill?.range ?? f.stats.range;
    const pool = skill?.targetAlly ? this.aliveAllies() : this.aliveEnemies();
    this.targetUnits = pool.filter((t) => chebyshev(f.tile, t.tile) <= range);
    if (this.targetUnits.length === 0) {
      this.log.add("No target in range.");
      this.selecting = "none";
      this.showMainMenu();
      this.drawHighlights();
      return;
    }
    this.pendingSkill = skill;
    this.selecting = "target";
    this.menu.hide();
    this.log.add(
      skill ? `Choose a target for ${skill.name}.` : "Choose a target.",
    );
    this.drawHighlights();
  }

  private computeMoveTiles(): void {
    const f = this.active;
    if (!f) return;
    const occupied = new Set(
      this.fighters.filter((o) => o.isAlive).map((o) => tileKey(o.tile)),
    );
    this.moveTiles = tilesWithinRange(
      f.tile,
      f.stats.move,
      GRID_COLS,
      GRID_ROWS,
      (t) =>
        !this.isObstacle(t) &&
        !occupied.has(tileKey(t)) &&
        !(t.x === f.tileX && t.y === f.tileY),
    );
  }

  private async tryMove(tile: Tile): Promise<void> {
    const f = this.active;
    if (!f || this.phase !== "menu") return;
    this.selecting = "none";
    this.hasMoved = true;
    await this.moveFighter(f, tile);
    this.showMainMenu();
    this.drawHighlights();
  }

  private async resolveAction(target: Fighter): Promise<void> {
    const f = this.active;
    if (!f || this.phase !== "menu") return;
    this.phase = "resolving";
    this.selecting = "none";
    this.menu.hide();
    const skill = this.pendingSkill;
    this.pendingSkill = null;
    if (skill) f.spendMp(skill.mpCost);

    await this.lunge(f, target);

    if (skill?.healAmount) {
      const healed = target.heal(skill.healAmount);
      this.log.add(
        `${f.stats.name} casts ${skill.name} on ${target.stats.name} (+${healed} HP).`,
      );
    } else {
      const { damage, backstab } = this.rollDamage(f, target, skill);
      target.takeDamage(damage);
      this.log.add(
        `${f.stats.name} hits ${target.stats.name} for ${damage} damage!` +
          (backstab ? " Back attack!" : ""),
      );
    }
    this.endTurn();
  }

  private async runEnemy(f: Fighter): Promise<void> {
    await this.sleep(600);
    if (this.over || this.phase !== "enemy") return;

    const targets = this.aliveAllies();
    if (targets.length === 0) {
      this.endTurn();
      return;
    }

    let nearest = targets[0];
    let best = Infinity;
    for (const t of targets) {
      const d = chebyshev(f.tile, t.tile);
      if (d < best) {
        best = d;
        nearest = t;
      }
    }

    if (best > f.stats.range) {
      const tile = this.bestMoveTile(f, nearest);
      if (tile) await this.moveFighter(f, tile);
    }

    if (chebyshev(f.tile, nearest) <= f.stats.range) {
      await this.lunge(f, nearest);
      const { damage, backstab } = this.rollDamage(f, nearest, null);
      nearest.takeDamage(damage);
      this.log.add(
        `${f.stats.name} hits ${nearest.stats.name} for ${damage} damage!` +
          (backstab ? " Back attack!" : ""),
      );
    } else {
      this.log.add(`${f.stats.name} waits.`);
    }
    this.endTurn();
  }

  private bestMoveTile(f: Fighter, target: Fighter): Tile | null {
    const occupied = new Set(
      this.fighters.filter((o) => o.isAlive).map((o) => tileKey(o.tile)),
    );
    const options = tilesWithinRange(
      f.tile,
      f.stats.move,
      GRID_COLS,
      GRID_ROWS,
      (t) =>
        !this.isObstacle(t) &&
        !occupied.has(tileKey(t)) &&
        !(t.x === f.tileX && t.y === f.tileY),
    );
    let bestTile: Tile | null = null;
    let bestDist = chebyshev(f.tile, target);
    for (const t of options) {
      const d = chebyshev(t, target);
      if (d < bestDist) {
        bestDist = d;
        bestTile = t;
      }
    }
    return bestTile;
  }

  private endTurn(): void {
    if (this.active) this.turns.consume(this.active);
    this.active = null;
    this.selecting = "none";
    this.moveTiles = [];
    this.targetUnits = [];
    this.menu.hide();
    if (this.checkEnd()) return;
    this.phase = "charging";
    this.drawHighlights();
  }

  private checkEnd(): boolean {
    if (this.over) return true;
    if (this.aliveEnemies().length === 0) {
      this.finish("Victory! All enemies defeated.");
      return true;
    }
    if (this.aliveAllies().length === 0) {
      this.finish("Defeat... Your party has fallen.");
      return true;
    }
    return false;
  }

  private finish(message: string): void {
    this.over = true;
    this.phase = "over";
    this.menu.hide();
    this.banner.text = `${message}\nClick anywhere to play again`;
    this.banner.visible = true;
  }

  private rollDamage(
    attacker: Fighter,
    defender: Fighter,
    skill: Skill | null,
  ): { damage: number; backstab: boolean } {
    const power = skill?.power ?? 1;
    const atk = attacker.stats.attack * power;
    const def = defender.stats.defense * (skill?.magical ? 0.25 : 0.6);
    const variance = 0.9 + Math.random() * 0.2;
    let damage = Math.max(1, Math.round((atk - def) * variance));
    const backstab = this.isBehind(attacker, defender);
    if (backstab) damage = Math.round(damage * BACKSTAB_MULTIPLIER);
    return { damage, backstab };
  }

  private isBehind(attacker: Fighter, defender: Fighter): boolean {
    const v = FACING_VECTORS[defender.facing];
    return (
      attacker.tileX === defender.tileX - v.x &&
      attacker.tileY === defender.tileY - v.y
    );
  }

  private moveFighter(f: Fighter, tile: Tile): Promise<void> {
    return new Promise((resolve) => {
      const from = { x: f.tileX, y: f.tileY };
      f.faceToward(from, tile);
      f.tileX = tile.x;
      f.tileY = tile.y;
      const start = f.position.clone();
      const target = this.tileCenter(tile);
      tween(
        this.app.ticker,
        260,
        (p) => {
          f.position.set(
            start.x + (target.x - start.x) * p,
            start.y + (target.y - start.y) * p,
          );
        },
        resolve,
      );
    });
  }

  private lunge(attacker: Fighter, target: Fighter): Promise<void> {
    return new Promise((resolve) => {
      const originX = attacker.position.x;
      const direction = originX < target.position.x ? 1 : -1;
      tween(
        this.app.ticker,
        300,
        (progress) => {
          attacker.position.x =
            originX + Math.sin(progress * Math.PI) * 40 * direction;
        },
        resolve,
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) =>
      tween(this.app.ticker, ms, undefined, resolve),
    );
  }

  private positionFighter(f: Fighter): void {
    const c = this.tileCenter(f.tile);
    f.position.set(c.x, c.y);
  }

  private tileCenter(t: Tile): Point {
    return new Point(
      this.origin.x + (t.x + 0.5) * TILE_SIZE,
      this.origin.y + (t.y + 0.5) * TILE_SIZE,
    );
  }

  private toTile(p: Point): Tile | null {
    const x = Math.floor((p.x - this.origin.x) / TILE_SIZE);
    const y = Math.floor((p.y - this.origin.y) / TILE_SIZE);
    if (x < 0 || y < 0 || x >= GRID_COLS || y >= GRID_ROWS) return null;
    return { x, y };
  }

  private unitAt(t: Tile): Fighter | null {
    return (
      this.fighters.find(
        (f) => f.isAlive && f.tileX === t.x && f.tileY === t.y,
      ) ?? null
    );
  }

  private isObstacle(t: Tile): boolean {
    return OBSTACLES.some((o) => o.x === t.x && o.y === t.y);
  }

  private aliveAllies(): Fighter[] {
    return this.fighters.filter((f) => f.isAlive && f.stats.team === "player");
  }

  private aliveEnemies(): Fighter[] {
    return this.fighters.filter((f) => f.isAlive && f.stats.team === "enemy");
  }

  private drawHighlights(): void {
    const g = this.highlightGfx.clear();
    const tileXY = (t: Tile): [number, number] => [
      this.origin.x + t.x * TILE_SIZE,
      this.origin.y + t.y * TILE_SIZE,
    ];

    if (this.active && this.phase !== "charging" && this.phase !== "over") {
      const [px, py] = tileXY(this.active.tile);
      g.rect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4).stroke({
        width: 3,
        color: 0xffe066,
      });
    }
    if (this.selecting === "move") {
      for (const t of this.moveTiles) {
        const [px, py] = tileXY(t);
        g.rect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6).fill({
          color: 0x4a9eff,
          alpha: 0.35,
        });
      }
    }
    if (this.selecting === "target") {
      for (const u of this.targetUnits) {
        const [px, py] = tileXY(u.tile);
        g.rect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6)
          .fill({ color: 0xe05555, alpha: 0.4 })
          .stroke({ width: 2, color: 0xff8080 });
      }
    }
    if (
      this.hover &&
      (this.selecting === "move" || this.selecting === "target")
    ) {
      const [px, py] = tileXY(this.hover);
      g.rect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2).stroke({
        width: 2,
        color: 0xffffff,
      });
    }
  }
}
