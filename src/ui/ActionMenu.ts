import { Container, Graphics, Text } from "pixi.js";

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

const BUTTON_WIDTH = 160;
const BUTTON_HEIGHT = 36;
const BUTTON_GAP = 8;

export class ActionMenu extends Container {
  private buttons: Container[] = [];
  private onSelect: ((id: string) => void) | null = null;
  private orientation: "vertical" | "horizontal" = "vertical";

  show(
    items: MenuItem[],
    onSelect: (id: string) => void,
    orientation: "vertical" | "horizontal" = "vertical",
  ): void {
    this.clear();
    this.onSelect = onSelect;
    this.orientation = orientation;
    items.forEach((item, index) => {
      this.addChild(this.createButton(item, index));
    });
    this.visible = true;
  }

  hide(): void {
    this.onSelect = null;
    this.visible = false;
  }

  private clear(): void {
    for (const button of this.buttons) button.destroy();
    this.buttons = [];
  }

  private createButton(item: MenuItem, index: number): Container {
    const button = new Container();
    if (this.orientation === "horizontal") {
      button.x = index * (BUTTON_WIDTH + BUTTON_GAP);
    } else {
      button.y = index * (BUTTON_HEIGHT + BUTTON_GAP);
    }

    const bg = new Graphics()
      .roundRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 8)
      .fill(item.disabled ? 0x3a3a4a : 0x2e4a7a)
      .stroke({ width: 2, color: item.disabled ? 0x555566 : 0x6f9fdf });

    const label = new Text({
      text: item.label,
      style: { fill: item.disabled ? 0x8888a0 : 0xffffff, fontSize: 16 },
    });
    label.anchor.set(0.5);
    label.position.set(BUTTON_WIDTH / 2, BUTTON_HEIGHT / 2);

    button.addChild(bg, label);

    if (item.disabled) {
      button.alpha = 0.6;
    } else {
      button.eventMode = "static";
      button.cursor = "pointer";
      button.on("pointerdown", () => this.onSelect?.(item.id));
      button.on("pointerover", () => button.scale.set(1.05));
      button.on("pointerout", () => button.scale.set(1));
    }

    this.buttons.push(button);
    return button;
  }
}
