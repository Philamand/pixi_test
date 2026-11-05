import type { Container } from "pixi.js";

export interface Scene {
  readonly container: Container;
  enter(): void;
  exit(): void;
}
