import { Container, Graphics } from "pixi.js";

export class HealthBar extends Container {
  private readonly fill: Graphics;

  constructor(
    private readonly maxHp: number,
    private readonly barWidth = 90,
    private readonly barHeight = 10,
  ) {
    super();

    this.addChild(
      new Graphics()
        .roundRect(-barWidth / 2, 0, barWidth, barHeight, barHeight / 2)
        .fill(0x1b1b1b)
        .stroke({ width: 2, color: 0x000000 }),
    );

    this.fill = new Graphics();
    this.addChild(this.fill);

    this.setHp(maxHp);
  }

  setHp(hp: number): void {
    const ratio = Math.max(0, Math.min(1, hp / this.maxHp));
    const color = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffc107 : 0xf44336;

    this.fill
      .clear()
      .roundRect(
        -this.barWidth / 2 + 2,
        2,
        (this.barWidth - 4) * ratio,
        this.barHeight - 4,
        (this.barHeight - 4) / 2,
      )
      .fill(color);
  }
}
