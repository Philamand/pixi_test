import { Container, Graphics, Text } from "pixi.js";

export class BattleLog extends Container {
  private readonly lines: string[] = [];
  private readonly text: Text;

  constructor(
    private readonly maxLines = 6,
    width = 360,
    height = 150,
  ) {
    super();

    this.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, 10)
        .fill({ color: 0x000000, alpha: 0.45 })
        .stroke({ width: 2, color: 0x444466 }),
    );

    this.text = new Text({
      text: "",
      style: {
        fill: 0xeeeeee,
        fontSize: 14,
        lineHeight: 20,
        wordWrap: true,
        wordWrapWidth: width - 24,
      },
    });
    this.text.position.set(12, 10);
    this.addChild(this.text);
  }

  add(message: string): void {
    this.lines.push(message);
    while (this.lines.length > this.maxLines) {
      this.lines.shift();
    }
    this.text.text = this.lines.join("\n");
  }
}
