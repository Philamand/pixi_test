import { Container, Graphics, Text } from "pixi.js";

export type BattleAction = "attack" | "heal" | "defend";

interface MenuItem {
  action: BattleAction;
  label: string;
}

const BUTTON_WIDTH = 150;
const BUTTON_HEIGHT = 38;
const BUTTON_GAP = 8;

export class ActionMenu extends Container {
  private readonly labels = new Map<BattleAction, Text>();
  private onSelect: ((action: BattleAction) => void) | null = null;

  constructor(items: MenuItem[]) {
    super();

    items.forEach((item, index) => {
      const button = this.createButton(item, index);
      this.addChild(button);
    });
  }

  show(onSelect: (action: BattleAction) => void): void {
    this.onSelect = onSelect;
    this.visible = true;
  }

  hide(): void {
    this.onSelect = null;
    this.visible = false;
  }

  setLabel(action: BattleAction, label: string): void {
    this.labels.get(action)!.text = label;
  }

  private createButton(item: MenuItem, index: number): Container {
    const button = new Container();
    button.y = index * (BUTTON_HEIGHT + BUTTON_GAP);

    const bg = new Graphics()
      .roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 8)
      .fill(0x2e4a7a)
      .stroke({ width: 2, color: 0x6f9fdf });

    const label = new Text({
      text: item.label,
      style: { fill: 0xffffff, fontSize: 16 },
    });
    label.anchor.set(0.5);
    label.position.set(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2);

    button.addChild(bg, label);
    button.eventMode = "static";
    button.cursor = "pointer";
    button.on("pointerdown", () => this.onSelect?.(item.action));
    button.on("pointerover", () => button.scale.set(1.05));
    button.on("pointerout", () => button.scale.set(1));

    this.labels.set(item.action, label);

    return button;
  }
}
