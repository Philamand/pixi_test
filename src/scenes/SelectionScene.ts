import { Application, Container, Graphics, Text } from "pixi.js";
import type { Scene } from "../game/Scene";
import { ActionMenu, type MenuItem } from "../ui/ActionMenu";

export type SelectionMode = "combat" | "explore";

export class SelectionScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly title = new Text({
    text: "Tactical RPG",
    style: {
      fill: 0xffe066,
      fontSize: 40,
      fontWeight: "bold",
      align: "center",
    },
  });
  private readonly menu = new ActionMenu();

  constructor(
    private readonly app: Application,
    private readonly onSelect: (mode: SelectionMode) => void,
  ) {}

  enter(): void {
    this.title.anchor.set(0.5);
    this.container.addChild(this.bg, this.title, this.menu);

    const items: MenuItem[] = [
      { id: "combat", label: "Combat" },
      { id: "explore", label: "Explore" },
    ];
    this.menu.show(items, (id) => this.onSelect(id as SelectionMode));

    this.app.renderer.on("resize", this.layout);
    this.layout();
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
  }

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;

    this.bg.clear().rect(0, 0, width, height).fill(0x141428);

    this.title.position.set(width / 2, height * 0.3);
    this.menu.position.set(width / 2 - this.menu.width / 2, height * 0.42);
  };
}
