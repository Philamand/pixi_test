import { Container, Graphics, Text } from "pixi.js";
import { HealthBar } from "../ui/HealthBar";

export interface FighterStats {
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  color: number;
}

export class Fighter extends Container {
  readonly stats: FighterStats;
  readonly healthBar: HealthBar;
  hp: number;
  isDefending = false;

  constructor(stats: FighterStats) {
    super();
    this.stats = stats;
    this.hp = stats.maxHp;

    this.addChild(
      new Graphics()
        .roundRect(-30, -40, 60, 80, 12)
        .fill(stats.color)
        .stroke({ width: 3, color: 0x000000 }),
    );

    const nameLabel = new Text({
      text: stats.name,
      style: { fill: 0xffffff, fontSize: 14, fontWeight: "bold" },
    });
    nameLabel.anchor.set(0.5, 1);
    nameLabel.y = -50;
    this.addChild(nameLabel);

    this.healthBar = new HealthBar(stats.maxHp);
    this.healthBar.y = 50;
    this.addChild(this.healthBar);
  }

  takeDamage(amount: number): number {
    const dealt = this.isDefending ? Math.ceil(amount / 2) : amount;
    this.hp = Math.max(0, this.hp - dealt);
    this.isDefending = false;
    this.healthBar.setHp(this.hp);
    return dealt;
  }

  heal(amount: number): number {
    const healed = Math.min(amount, this.stats.maxHp - this.hp);
    this.hp += healed;
    this.healthBar.setHp(this.hp);
    return healed;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }
}
