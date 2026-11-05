import type { Fighter } from "../entities/Fighter";

export class TurnManager {
  private readonly order: Fighter[];
  private index = 0;

  constructor(combatants: Fighter[]) {
    this.order = [...combatants].sort((a, b) => b.stats.speed - a.stats.speed);
  }

  get current(): Fighter {
    return this.order[this.index];
  }

  next(): Fighter {
    this.index = (this.index + 1) % this.order.length;
    return this.current;
  }
}
