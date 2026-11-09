import {
  Application,
  Container,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Text,
} from "pixi.js";
import type { TileTextures } from "../assets";
import {
  EXPLORE_COLS,
  EXPLORE_ROWS,
  EXPLORE_MAPS,
  type ExplorePortal,
} from "../data/explore";
import type { Scene } from "../game/Scene";
import { ActionMenu } from "../ui/ActionMenu";

type Tool = "ground" | "objects" | "portal";

interface EditableMap {
  id: string;
  portals: ExplorePortal[];
  blocked: string[];
  ground: (string | null)[][];
  objects: (string | null)[][];
}

const TOP_BAR_H = 92;
const PALETTE_W = 208;
const PALETTE_ICON = 56;
const PALETTE_COLS = 3;

export class EditorScene implements Scene {
  readonly container = new Container();

  private readonly bg = new Graphics();
  private readonly gridLayer = new Container();
  private readonly markerLayer = new Container();
  private readonly gridLines = new Graphics();
  private readonly paletteViewport = new Container();
  private readonly paletteMask = new Graphics();
  private readonly paletteInner = new Container();
  private readonly scrollUpBtn = new Container();
  private readonly scrollDownBtn = new Container();
  private readonly statusText = new Text({
    text: "",
    style: { fill: 0xaaaacc, fontSize: 13 },
  });

  private readonly mapMenu = new ActionMenu();
  private readonly toolMenu = new ActionMenu();
  private readonly targetMenu = new ActionMenu();
  private readonly fileMenu = new ActionMenu();

  private readonly maps: Record<string, EditableMap> = {};
  private currentId = "";
  private tool: Tool = "ground";
  private selectedTile: string | null = null;
  private portalTarget = "";
  private tile = 32;
  private readonly origin = new Point(0, 0);

  constructor(
    private readonly app: Application,
    private readonly ground: TileTextures,
    private readonly onExit: () => void,
  ) {
    for (const [id, map] of Object.entries(EXPLORE_MAPS)) {
      this.maps[id] = {
        id,
        portals: map.portals.map((p) => ({ ...p })),
        blocked: [...map.blocked],
        ground: map.ground.map((row) => [...row]),
        objects: map.objects.map((row) => [...row]),
      };
    }
    this.currentId = Object.keys(this.maps)[0] ?? "";
    this.portalTarget = this.currentId;
  }

  private get current(): EditableMap {
    return this.maps[this.currentId];
  }

  enter(): void {
    this.container.addChild(
      this.bg,
      this.mapMenu,
      this.toolMenu,
      this.targetMenu,
      this.fileMenu,
      this.gridLayer,
      this.markerLayer,
      this.gridLines,
      this.paletteViewport,
      this.statusText,
    );
    this.paletteViewport.addChild(
      this.paletteMask,
      this.paletteInner,
      this.scrollUpBtn,
      this.scrollDownBtn,
    );

    this.container.eventMode = "static";
    this.gridLayer.eventMode = "static";
    this.gridLayer.on("pointerdown", this.onGridPointer);
    this.paletteViewport.eventMode = "static";
    this.paletteViewport.on("wheel", this.onPaletteWheel);

    for (const [btn, dir] of [
      [this.scrollUpBtn, -1],
      [this.scrollDownBtn, 1],
    ] as const) {
      const bg = new Graphics()
        .roundRect(0, 0, PALETTE_W - 16, 22, 4)
        .fill(0x2e4a7a)
        .stroke({ width: 1, color: 0x6f9fdf });
      const label = new Text({
        text: dir < 0 ? "▲ scroll" : "▼ scroll",
        style: { fill: 0xffffff, fontSize: 12 },
      });
      label.anchor.set(0.5);
      label.position.set((PALETTE_W - 16) / 2, 11);
      btn.addChild(bg, label);
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.on("pointerdown", () => this.scrollPalette(dir * 160));
    }

    this.app.renderer.on("resize", this.layout);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("contextmenu", this.onContextMenu);
    this.layout();
  }

  exit(): void {
    this.app.renderer.off("resize", this.layout);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("contextmenu", this.onContextMenu);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.onExit();
    } else if (e.key === "s" || e.key === "S") {
      this.toggleBlocked();
    } else if (e.key === "w" || e.key === "W") {
      this.saveCurrent();
    }
  };

  private readonly onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private readonly layout = (): void => {
    const { width, height } = this.app.screen;
    this.bg.clear().rect(0, 0, width, height).fill(0x141428);

    this.mapMenu.show(
      Object.keys(this.maps).map((id) => ({
        id,
        label: id === this.currentId ? `* ${id}` : id,
      })),
      (id) => {
        this.currentId = id;
        this.portalTarget = this.portalTarget === id ? id : this.portalTarget;
        this.refresh();
      },
      "horizontal",
    );
    this.mapMenu.position.set(8, 8);

    this.toolMenu.show(
      [
        { id: "ground", label: this.tool === "ground" ? "* Ground" : "Ground" },
        {
          id: "objects",
          label: this.tool === "objects" ? "* Objects" : "Objects",
        },
        { id: "portal", label: this.tool === "portal" ? "* Portal" : "Portal" },
      ],
      (id) => {
        this.tool = id as Tool;
        this.refresh();
      },
      "horizontal",
    );
    this.toolMenu.position.set(8, 44);

    const fileItems = [
      { id: "new", label: "New" },
      { id: "save", label: "Save JSON" },
      { id: "import", label: "Import" },
      { id: "back", label: "Back" },
    ];
    this.fileMenu.show(
      fileItems,
      (id) => {
        if (id === "new") this.createMap();
        else if (id === "save") this.saveCurrent();
        else if (id === "import") this.importFile();
        else this.onExit();
      },
      "horizontal",
    );
    this.fileMenu.position.set(width - 8 - this.fileMenu.width, 8);

    this.targetMenu.visible = this.tool === "portal";
    if (this.tool === "portal") {
      this.targetMenu.show(
        Object.keys(this.maps).map((id) => ({
          id,
          label: id === this.portalTarget ? `> ${id}` : id,
        })),
        (id) => {
          this.portalTarget = id;
          this.refresh();
        },
        "horizontal",
      );
      this.targetMenu.position.set(8, 80);
    }

    const availW = width - PALETTE_W - 16;
    const availH = height - TOP_BAR_H - 16;
    this.tile = Math.max(
      8,
      Math.min((availW - 8) / EXPLORE_COLS, (availH - 8) / EXPLORE_ROWS),
    );
    this.origin.set(
      8 + (availW - EXPLORE_COLS * this.tile) / 2,
      TOP_BAR_H + 8 + (availH - EXPLORE_ROWS * this.tile) / 2,
    );

    this.buildGrid();
    this.buildPalette();

    this.paletteViewport.position.set(width - PALETTE_W + 8, TOP_BAR_H + 8);
    const palH = height - TOP_BAR_H - 16;
    this.paletteMask
      .clear()
      .rect(0, 0, PALETTE_W - 16, palH)
      .fill(0x1d1d36);
    this.paletteInner.mask = this.paletteMask;
    this.paletteViewport.hitArea = new Rectangle(0, 0, PALETTE_W - 16, palH);
    this.scrollUpBtn.position.set(0, 0);
    this.scrollDownBtn.position.set(0, palH - 22);

    this.statusText.position.set(8, height - 24);
    this.updateStatus();
  };

  private refresh(): void {
    this.layout();
  }

  private buildGrid(): void {
    for (const child of this.gridLayer.removeChildren()) child.destroy();
    for (const child of this.markerLayer.removeChildren()) child.destroy();
    const map = this.current;
    if (!map) return;

    const showGround = this.tool === "ground" || this.tool === "portal";
    const showObjects = this.tool === "objects";
    for (let y = 0; y < EXPLORE_ROWS; y++) {
      for (let x = 0; x < EXPLORE_COLS; x++) {
        const g = map.ground[y][x];
        if (showGround && g && this.ground[g]) this.addCellSprite(g, x, y);
        const o = map.objects[y][x];
        if (showObjects && o && this.ground[o]) this.addCellSprite(o, x, y);
      }
    }

    this.gridLines
      .clear()
      .rect(
        this.origin.x,
        this.origin.y,
        EXPLORE_COLS * this.tile,
        EXPLORE_ROWS * this.tile,
      )
      .stroke({ width: 2, color: 0x2e2e4a });
    for (let x = 1; x < EXPLORE_COLS; x++) {
      this.gridLines
        .moveTo(this.origin.x + x * this.tile, this.origin.y)
        .lineTo(
          this.origin.x + x * this.tile,
          this.origin.y + EXPLORE_ROWS * this.tile,
        )
        .stroke({ width: 1, color: 0x23233a });
    }
    for (let y = 1; y < EXPLORE_ROWS; y++) {
      this.gridLines
        .moveTo(this.origin.x, this.origin.y + y * this.tile)
        .lineTo(
          this.origin.x + EXPLORE_COLS * this.tile,
          this.origin.y + y * this.tile,
        )
        .stroke({ width: 1, color: 0x23233a });
    }

    const r = this.tile * 0.35;
    for (const portal of this.tool === "portal" ? map.portals : []) {
      const marker = new Graphics()
        .circle(0, 0, r)
        .fill({ color: 0x7fd4ff, alpha: 0.45 })
        .stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
      marker.position.set(
        this.origin.x + (portal.x + 0.5) * this.tile,
        this.origin.y + (portal.y + 0.5) * this.tile,
      );
      this.markerLayer.addChild(marker);
    }

    this.gridLayer.hitArea = new Rectangle(
      this.origin.x,
      this.origin.y,
      EXPLORE_COLS * this.tile,
      EXPLORE_ROWS * this.tile,
    );
  }

  private addCellSprite(key: string, x: number, y: number): void {
    const texture = this.ground[key];
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.scale.set(this.tile / texture.width, this.tile / texture.height);
    sprite.position.set(
      this.origin.x + (x + 0.5) * this.tile,
      this.origin.y + (y + 0.5) * this.tile,
    );
    this.gridLayer.addChild(sprite);
  }

  private buildPalette(): void {
    for (const child of this.paletteInner.removeChildren()) child.destroy();
    const keys = Object.keys(this.ground).sort();
    keys.forEach((key, i) => {
      const cell = new Container();
      const col = i % PALETTE_COLS;
      const row = Math.floor(i / PALETTE_COLS);
      cell.position.set(col * PALETTE_ICON, row * PALETTE_ICON);
      const bg = new Graphics()
        .roundRect(2, 2, PALETTE_ICON - 4, PALETTE_ICON - 4, 4)
        .fill(key === this.selectedTile ? 0x6f9fdf : 0x23233a)
        .stroke({
          width: 2,
          color: key === this.selectedTile ? 0xffffff : 0x2e2e4a,
        });
      const icon = new Sprite(this.ground[key]);
      icon.anchor.set(0.5);
      icon.scale.set(
        (PALETTE_ICON - 12) / this.ground[key].width,
        (PALETTE_ICON - 12) / this.ground[key].height,
      );
      icon.position.set(PALETTE_ICON / 2, PALETTE_ICON / 2);
      cell.addChild(bg, icon);
      cell.eventMode = "static";
      cell.cursor = "pointer";
      cell.on("pointerdown", () => {
        this.selectedTile = key;
        if (this.tool === "portal") this.tool = "objects";
        this.refresh();
      });
      this.paletteInner.addChild(cell);
    });
    this.paletteInner.y = 0;
  }

  private scrollPalette(dy: number): void {
    const viewH = (this.paletteViewport.hitArea as Rectangle)?.height ?? 0;
    const maxY = Math.max(0, this.paletteInner.height - viewH);
    this.paletteInner.y = Math.min(
      0,
      Math.max(this.paletteInner.y + dy, -maxY),
    );
  }

  private readonly onPaletteWheel = (e: FederatedWheelEvent): void => {
    this.scrollPalette(-e.deltaY);
  };

  private readonly onGridPointer = (e: FederatedPointerEvent): void => {
    const map = this.current;
    if (!map) return;
    const x = Math.floor((e.global.x - this.origin.x) / this.tile);
    const y = Math.floor((e.global.y - this.origin.y) / this.tile);
    if (x < 0 || y < 0 || x >= EXPLORE_COLS || y >= EXPLORE_ROWS) return;

    if (this.tool === "portal") {
      if (e.button === 2) {
        map.portals = map.portals.filter((p) => !(p.x === x && p.y === y));
      } else {
        if (!map.portals.some((p) => p.x === x && p.y === y)) {
          map.portals.push({ x, y, target: this.portalTarget });
        }
      }
    } else if (e.button === 2) {
      map[this.tool][y][x] = null;
    } else {
      map[this.tool][y][x] = this.selectedTile;
    }
    this.buildGrid();
    this.updateStatus();
  };

  private updateStatus(): void {
    const map = this.current;
    if (!map) {
      this.statusText.text = "";
      return;
    }
    const blocked =
      this.selectedTile && map.blocked.includes(this.selectedTile)
        ? "blocked"
        : "walkable";
    this.statusText.text = `Map: ${map.id} | Tool: ${this.tool} | Tile: ${
      this.selectedTile ?? "(none)"
    } (${blocked}) | Portals: ${map.portals.length} | Click: paint, Right-click: erase | S: toggle blocked, W: save`;
  }

  private toggleBlocked(): void {
    const map = this.current;
    if (!map || !this.selectedTile) return;
    const i = map.blocked.indexOf(this.selectedTile);
    if (i >= 0) map.blocked.splice(i, 1);
    else map.blocked.push(this.selectedTile);
    this.updateStatus();
  }

  private saveCurrent(): void {
    const map = this.current;
    if (!map) return;
    const data = {
      id: map.id,
      portals: map.portals,
      blocked: map.blocked,
      ground: map.ground,
      objects: map.objects,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${map.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private createMap(): void {
    const id = window.prompt(
      "New map id:",
      `map${Object.keys(this.maps).length + 1}`,
    );
    if (!id || this.maps[id]) return;
    const empty = () =>
      Array.from({ length: EXPLORE_ROWS }, () =>
        Array.from({ length: EXPLORE_COLS }, () => null),
      );
    this.maps[id] = {
      id,
      portals: [],
      blocked: [],
      ground: empty(),
      objects: empty(),
    };
    this.currentId = id;
    this.refresh();
  }

  private importFile(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          const map: EditableMap = {
            id: String(data.id),
            portals: data.portals ?? [],
            blocked: data.blocked ?? [],
            ground: data.ground,
            objects: data.objects,
          };
          this.maps[map.id] = map;
          this.currentId = map.id;
          this.refresh();
        } catch {
          window.alert("Invalid map file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
