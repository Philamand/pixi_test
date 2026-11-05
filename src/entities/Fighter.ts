import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { MAX_CT, TILE_SIZE } from "../data/battle";
import { TILE_PX } from "../data/tiles";
import { HealthBar } from "../ui/HealthBar";
import { facingFromDelta, type Facing, type Tile } from "../utils/grid";

export type Team = "player" | "enemy";

export interface Skill {
  id: string;
  name: string;
  mpCost: number;
  range: number;
  power?: number;
  magical?: boolean;
  healAmount?: number;
  targetAlly?: boolean;
}

export interface FighterStats {
  name: string;
  team: Team;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  maxMp: number;
  move: number;
  range: number;
  color: number;
  spawn: Tile;
  sprite: number;
  skills: Skill[];
}

export class Fighter extends Container {
  readonly stats: FighterStats;
  readonly healthBar: HealthBar;
  tileX: number;
  tileY: number;
  facing: Facing;
  hp: number;
  mp: number;
  ct = 0;

  private readonly mpBar: HealthBar;
  private readonly ctBar: HealthBar;
  private readonly facingGfx = new Graphics();

  constructor(stats: FighterStats, texture?: Texture) {
    super();
    this.stats = stats;
    this.hp = stats.maxHp;
    this.mp = stats.maxMp;
    this.tileX = stats.spawn.x;
    this.tileY = stats.spawn.y;
    this.facing = stats.team === "enemy" ? "left" : "right";

    if (texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.scale.set((TILE_SIZE * 0.9) / TILE_PX);
      this.addChild(sprite, this.facingGfx);
    } else {
      this.addChild(
        new Graphics()
          .roundRect(-26, -34, 52, 68, 10)
          .fill(stats.color)
          .stroke({ width: 3, color: 0x000000 }),
        this.facingGfx,
      );
    }

    const nameLabel = new Text({
      text: stats.name,
      style: { fill: 0xffffff, fontSize: 14, fontWeight: "bold" },
    });
    nameLabel.anchor.set(0.5, 1);
    nameLabel.y = -56;
    this.addChild(nameLabel);

    this.ctBar = new HealthBar(MAX_CT, 56, 5, 0xffd54a);
    this.ctBar.y = -50;
    this.addChild(this.ctBar);

    this.healthBar = new HealthBar(stats.maxHp, 64, 10);
    this.healthBar.y = 42;
    this.addChild(this.healthBar);

    this.mpBar = new HealthBar(stats.maxMp, 56, 6, 0x3f8cff);
    this.mpBar.y = 56;
    this.mpBar.visible = stats.maxMp > 0;
    this.addChild(this.mpBar);

    this.drawFacing();
  }

  get tile(): Tile {
    return { x: this.tileX, y: this.tileY };
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.setHp(this.hp);
  }

  heal(amount: number): number {
    const healed = Math.min(amount, this.stats.maxHp - this.hp);
    this.hp += healed;
    this.healthBar.setHp(this.hp);
    return healed;
  }

  spendMp(cost: number): boolean {
    if (this.mp < cost) return false;
    this.mp -= cost;
    this.mpBar.setHp(this.mp);
    return true;
  }

  setCt(value: number): void {
    this.ct = value;
    this.ctBar.setHp(value);
  }

  faceToward(from: Tile, to: Tile): void {
    this.facing = facingFromDelta(to.x - from.x, to.y - from.y);
    this.drawFacing();
  }

  private drawFacing(): void {
    const g = this.facingGfx.clear();
    switch (this.facing) {
      case "up":
        g.moveTo(-8, -34).lineTo(8, -34).lineTo(0, -46).closePath();
        break;
      case "down":
        g.moveTo(-8, 34).lineTo(8, 34).lineTo(0, 46).closePath();
        break;
      case "left":
        g.moveTo(-26, -8).lineTo(-26, 8).lineTo(-38, 0).closePath();
        break;
      case "right":
        g.moveTo(26, -8).lineTo(26, 8).lineTo(38, 0).closePath();
        break;
    }
    g.fill(0xffffff);
  }
}
