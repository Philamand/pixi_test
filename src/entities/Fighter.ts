import { AnimatedSprite, Container, Text } from "pixi.js";
import { SPRITE_FRAME_PX, type CharacterSprites } from "../assets";
import { MAX_CT, TILE_SIZE } from "../data/battle";
import { type SpriteSetName } from "../data/tiles";
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
  projectile?: "fireball";
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
  sprites: SpriteSetName;
  skills: Skill[];
}

type FighterState = "idle" | "walk" | "attack" | "hurt" | "dying";

export class Fighter extends Container {
  readonly stats: FighterStats;
  readonly healthBar: HealthBar;
  tileX: number;
  tileY: number;
  facing: Facing;
  hp: number;
  mp: number;
  ct = 0;

  private readonly sprite: AnimatedSprite;
  private readonly mpBar: HealthBar;
  private readonly ctBar: HealthBar;
  private state: FighterState = "idle";

  constructor(
    stats: FighterStats,
    private readonly sprites: CharacterSprites,
  ) {
    super();
    this.stats = stats;
    this.hp = stats.maxHp;
    this.mp = stats.maxMp;
    this.tileX = stats.spawn.x;
    this.tileY = stats.spawn.y;
    this.facing = stats.team === "enemy" ? "down" : "up";

    this.sprite = new AnimatedSprite(sprites.directions[this.facing].idle);
    this.sprite.anchor.set(0.5, 0.8);
    this.sprite.scale.set((TILE_SIZE * 1.5) / SPRITE_FRAME_PX);
    this.sprite.animationSpeed = 0.12;
    this.sprite.play();
    this.addChild(this.sprite);

    const nameLabel = new Text({
      text: stats.name,
      style: { fill: 0xffffff, fontSize: 14, fontWeight: "bold" },
    });
    nameLabel.anchor.set(0.5, 1);
    nameLabel.y = -80;
    this.addChild(nameLabel);

    this.ctBar = new HealthBar(MAX_CT, 56, 5, 0xffd54a);
    this.ctBar.y = -74;
    this.addChild(this.ctBar);

    this.healthBar = new HealthBar(stats.maxHp, 64, 10);
    this.healthBar.y = 42;
    this.addChild(this.healthBar);

    this.mpBar = new HealthBar(stats.maxMp, 56, 6, 0x3f8cff);
    this.mpBar.y = 56;
    this.mpBar.visible = stats.maxMp > 0;
    this.addChild(this.mpBar);
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
    if (!this.isAlive) {
      this.state = "dying";
      this.sprite.loop = false;
      this.sprite.onComplete = () => {
        this.visible = false;
      };
      this.sprite.textures = this.sprites.dying;
      this.sprite.gotoAndPlay(0);
    } else {
      this.playOnce("hurt", () => this.setState("idle"));
    }
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
    if (this.state === "idle") this.setState("idle");
  }

  playWalk(): void {
    this.setState("walk");
  }

  playIdle(): void {
    this.setState("idle");
  }

  attack(): Promise<void> {
    return new Promise((resolve) => {
      this.playOnce("attack", () => {
        this.setState("idle");
        resolve();
      });
    });
  }

  private setState(state: FighterState): void {
    this.state = state;
    if (state === "dying") return;
    const frames = this.sprites.directions[this.facing][state];
    this.sprite.loop = true;
    this.sprite.onComplete = undefined;
    if (this.sprite.textures !== frames) this.sprite.textures = frames;
    this.sprite.gotoAndPlay(0);
  }

  private playOnce(state: "attack" | "hurt", onDone: () => void): void {
    this.state = state;
    const frames = this.sprites.directions[this.facing][state];
    this.sprite.loop = false;
    this.sprite.onComplete = onDone;
    if (this.sprite.textures !== frames) this.sprite.textures = frames;
    this.sprite.gotoAndPlay(0);
  }
}
