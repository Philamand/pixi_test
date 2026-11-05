import { CT_RATE, MAX_CT } from "../data/battle";
import type { Fighter } from "../entities/Fighter";

export class TurnManager {
  readonly combatants: Fighter[];

  constructor(combatants: Fighter[]) {
    this.combatants = [...combatants];
  }

  update(deltaMS: number): void {
    for (const f of this.combatants) {
      if (f.isAlive) {
        f.setCt(
          Math.min(MAX_CT, f.ct + (f.stats.speed * CT_RATE * deltaMS) / 1000),
        );
      }
    }
  }

  ready(): Fighter | null {
    let best: Fighter | null = null;
    for (const f of this.combatants) {
      if (f.isAlive && f.ct >= MAX_CT && (!best || f.ct > best.ct)) {
        best = f;
      }
    }
    return best;
  }

  consume(f: Fighter): void {
    f.setCt(0);
  }
}
