import { Container, Graphics, Text } from "pixi.js";
import { MAX_CT } from "../data/battle";
import type { Fighter } from "../entities/Fighter";

const PANEL_WIDTH = 220;
const TITLE_HEIGHT = 30;
const ROW_HEIGHT = 30;
const BAR_WIDTH = 110;
const BAR_HEIGHT = 8;

interface Row {
  container: Container;
  label: Text;
  fill: Graphics;
}

export class TurnOrderPanel extends Container {
  private readonly rows = new Map<Fighter, Row>();

  constructor(private readonly fighters: Fighter[]) {
    super();

    const height = TITLE_HEIGHT + fighters.length * ROW_HEIGHT + 12;

    this.addChild(
      new Graphics()
        .roundRect(0, 0, PANEL_WIDTH, height, 10)
        .fill({ color: 0x000000, alpha: 0.45 })
        .stroke({ width: 2, color: 0x444466 }),
    );

    const title = new Text({
      text: "Turn Order",
      style: { fill: 0xffe066, fontSize: 16, fontWeight: "bold" },
    });
    title.position.set(12, 8);
    this.addChild(title);

    for (const f of fighters) {
      const row = new Container();

      const label = new Text({
        text: f.stats.name,
        style: { fill: 0xeeeeee, fontSize: 13 },
      });
      label.position.set(12, 4);
      row.addChild(label);

      row.addChild(
        new Graphics()
          .roundRect(12, 20, BAR_WIDTH, BAR_HEIGHT, BAR_HEIGHT / 2)
          .fill(0x1b1b1b)
          .stroke({ width: 1, color: 0x000000 }),
      );

      const fill = new Graphics();
      fill.position.set(12, 20);
      row.addChild(fill);

      this.rows.set(f, { container: row, label, fill });
      this.addChild(row);
    }
  }

  refresh(): void {
    const sorted = [...this.fighters].sort((a, b) => b.ct - a.ct);
    sorted.forEach((f, index) => {
      const row = this.rows.get(f);
      if (!row) return;
      this.addChild(row.container);
      row.container.y = TITLE_HEIGHT + index * ROW_HEIGHT;
      row.label.text = f.isAlive ? f.stats.name : `${f.stats.name} (KO)`;
      row.label.style.fill = f.stats.team === "player" ? 0x9ecbff : 0xff9e9e;
      row.label.alpha = f.isAlive ? 1 : 0.4;
      const ratio = Math.max(0, Math.min(1, f.ct / MAX_CT));
      row.fill
        .clear()
        .rect(0, 0, BAR_WIDTH * ratio, BAR_HEIGHT)
        .fill(f.stats.team === "player" ? 0x4a9eff : 0xe05555);
    });
  }
}
