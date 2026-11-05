import { Application, Container, Graphics, Rectangle, Text } from "pixi.js";
import {
  enemyStats,
  HEAL_AMOUNT,
  playerStats,
  STARTING_POTIONS,
} from "../data/battle";
import { Fighter } from "../entities/Fighter";
import type { Scene } from "../game/Scene";
import { TurnManager } from "../systems/TurnManager";
import { ActionMenu, type BattleAction } from "../ui/ActionMenu";
import { BattleLog } from "../ui/BattleLog";
import { tween } from "../utils/tween";

export class BattleScene implements Scene {
  readonly container = new Container();

  private bg = new Graphics();
  private player!: Fighter;
  private enemy!: Fighter;
  private turns!: TurnManager;
  private menu!: ActionMenu;
  private log!: BattleLog;
  private banner!: Text;
  private potions = STARTING_POTIONS;
  private busy = false;
  private over = false;

  constructor(
    private readonly app: Application,
    private readonly onRestart: () => void,
  ) {}

  enter(): void {
    this.container.addChild(this.bg);

    this.player = new Fighter(playerStats);
    this.enemy = new Fighter(enemyStats);
    this.container.addChild(this.player, this.enemy);

    this.menu = new ActionMenu([
      { action: "attack", label: "Attack" },
      { action: "heal", label: this.healLabel() },
      { action: "defend", label: "Defend" },
    ]);
    this.log = new BattleLog();
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

    this.container.addChild(this.menu, this.log, this.banner);

    this.container.eventMode = "static";
    this.container.on("pointerdown", () => {
      if (this.over) this.onRestart();
    });

    this.app.renderer.on("resize", this.layout);
    this.layout();

    this.turns = new TurnManager([this.player, this.enemy]);
    this.log.add("A wild Slime appears!");
    this.startTurn();
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;

    this.bg
      .clear()
      .rect(0, 0, width, height)
      .fill(0x141428)
      .rect(0, height * 0.62, width, 4)
      .fill(0x2a2a44);

    this.player.position.set(width * 0.25, height * 0.45);
    this.enemy.position.set(width * 0.75, height * 0.45);
    this.menu.position.set(width * 0.08, height * 0.7);
    this.log.position.set(width * 0.5, height * 0.7);
    this.banner.position.set(width / 2, height * 0.18);
    this.container.hitArea = new Rectangle(0, 0, width, height);
  };

  private startTurn(): void {
    if (this.checkEnd()) return;

    while (!this.turns.current.isAlive) {
      this.turns.next();
      if (this.checkEnd()) return;
    }

    const current = this.turns.current;

    if (current === this.player) {
      this.log.add("Your turn.");
      this.menu.show((action) => this.playerAction(action));
    } else {
      this.busy = true;
      this.menu.hide();
      tween(this.app.ticker, 700, undefined, () => this.enemyAction());
    }
  }

  private playerAction(action: BattleAction): void {
    if (this.busy || this.over) return;

    if (action === "heal" && this.potions <= 0) {
      this.log.add("No potions left!");
      return;
    }

    this.busy = true;
    this.menu.hide();

    switch (action) {
      case "attack": {
        const damage = this.rollDamage(this.player, this.enemy);
        this.log.add(`Hero attacks for ${damage} damage!`);
        this.lunge(this.player, this.enemy).then(() => {
          this.enemy.takeDamage(damage);
          this.endTurn();
        });
        break;
      }
      case "heal": {
        this.potions--;
        const healed = this.player.heal(HEAL_AMOUNT);
        this.menu.setLabel("heal", this.healLabel());
        this.log.add(`Hero drinks a potion (+${healed} HP).`);
        this.endTurn();
        break;
      }
      case "defend": {
        this.player.isDefending = true;
        this.log.add("Hero braces for impact.");
        this.endTurn();
        break;
      }
    }
  }

  private enemyAction(): void {
    const damage = this.rollDamage(this.enemy, this.player);
    this.log.add(`Slime attacks for ${damage} damage!`);
    this.lunge(this.enemy, this.player).then(() => {
      this.player.takeDamage(damage);
      this.endTurn();
    });
  }

  private endTurn(): void {
    this.busy = false;
    if (this.checkEnd()) return;
    this.turns.next();
    this.startTurn();
  }

  private checkEnd(): boolean {
    if (this.over) return true;

    if (!this.enemy.isAlive) {
      this.finish("Victory! The Slime is defeated.");
      return true;
    }
    if (!this.player.isAlive) {
      this.finish("Defeat... The Hero has fallen.");
      return true;
    }
    return false;
  }

  private finish(message: string): void {
    this.over = true;
    this.menu.hide();
    this.banner.text = `${message}\nClick anywhere to play again`;
    this.banner.visible = true;
  }

  private rollDamage(attacker: Fighter, defender: Fighter): number {
    const base = attacker.stats.attack - defender.stats.defense;
    const variance = Math.floor(Math.random() * 5) - 2;
    return Math.max(1, base + variance);
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

  private healLabel(): string {
    return `Heal (${this.potions})`;
  }
}
