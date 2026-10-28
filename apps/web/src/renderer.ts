import {
  BUILDING_CAPELA,
  BUILDING_ESCOLA,
  BUILDING_FORNO,
  BUILDING_HOUSE,
  BUILDING_IDS,
  BUILDING_SEDE,
  BUILDING_TERREIRO,
  BUILDING_TULHA,
  BUILDING_VENDA,
  COFFEE_FORMING,
  COFFEE_GROWING,
  COFFEE_MATURE,
  COFFEE_MUDA,
  COFFEE_NONE,
  SITIO_SIZE,
  TERRAIN_MATA,
  TERRAIN_ROAD,
  type BuildingKind,
  coffeeHarvestForecast,
  type CoffeeLot,
  type SitioFullState,
  type WorkTask,
} from '@sitio/simulation';
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import {
  Camera,
  HEIGHT_STEP,
  pickTile,
  tileCenter,
  tileQuad,
  vertexToScreen,
  type HeightSource,
  type Point,
} from '@sitio/view-iso';
import { fieldMarkers, planActors, restingHouses, type ActorPlan } from './actors';
import { spriteName } from './appearance';
import { readSlices } from './atlas';

class FlatHeights implements HeightSource {
  constructor(readonly size: number) {}
  corners(): [number, number, number, number] {
    return [0, 0, 0, 0];
  }
}

const TERRA = [0x7d5638, 0x865d3c, 0x744e32] as const;
const MATA = [0x2f5637, 0x356040, 0x294d31] as const;
const ROAD = [0x8a6a48, 0x947452, 0x7f6040] as const;
const COFFEE = [0x78a34a, 0x5c8f3e, 0x437434, 0x2f5f2a] as const;

function tileHash(x: number, y: number): number {
  let h = Math.imul(x + 17, 374761393) + Math.imul(y + 31, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ACTOR_SLOTS = [
  { x: 0, y: 0 },
  { x: -12, y: 2 },
  { x: 12, y: 2 },
  { x: 0, y: -8 },
  { x: -20, y: -3 },
  { x: 20, y: -3 },
  { x: -7, y: 8 },
  { x: 7, y: 8 },
  { x: -25, y: 6 },
  { x: 25, y: 6 },
  { x: 0, y: 11 },
  { x: -15, y: 11 },
] as const;

const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
};

const Z_GLYPH = ['111', '001', '010', '100', '111'];

function drawGlyph(
  g: Graphics,
  rows: string[],
  x: number,
  y: number,
  color: number,
  scale = 1,
): number {
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    if (!line) continue;
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '1') g.rect(x + col * scale, y + row * scale, scale, scale).fill(color);
    }
  }
  return (rows[0]?.length ?? 0) * scale;
}

function drawNumber(
  g: Graphics,
  value: number | null,
  x: number,
  y: number,
  color: number,
  scale = 1,
): number {
  if (value === null) return drawGlyph(g, DIGITS['-'] ?? [], x, y, color, scale);
  const text = String(Math.max(0, Math.min(99, Math.floor(value))));
  let width = 0;
  for (const char of text) {
    width += drawGlyph(g, DIGITS[char] ?? DIGITS['-'] ?? [], x + width, y, color, scale) + scale;
  }
  return Math.max(0, width - scale);
}

function drawTool(g: Graphics, task: WorkTask): void {
  const dark = 0x4a2c1e;
  const metal = 0xb8b0a0;
  switch (task.kind) {
    case 'yard':
    case 'plant':
    case 'clear':
      g.rect(0, -11, 2, 12).fill(0x8a5a3b);
      g.rect(-3, -14, 6, 3).fill(metal);
      break;
    case 'coffee':
      g.rect(-4, -8, 8, 6).fill(0x9a6b43);
      g.rect(-3, -9, 6, 2).fill(0xd0a86a);
      g.rect(-2, -3, 4, 2).fill(dark);
      break;
    case 'build':
      g.rect(0, -12, 2, 10).fill(0x8a5a3b);
      g.rect(-3, -15, 6, 3).fill(metal);
      break;
    case 'fertilize':
    case 'limestone':
      g.rect(-3, -9, 6, 7).fill(0xb89a6a);
      g.rect(-2, -10, 4, 2).fill(0x6a4a32);
      break;
    case 'roast':
      g.rect(-1, -11, 2, 11).fill(0x6b3d2a);
      g.rect(-4, -13, 8, 4).fill(0x8a5a3b);
      g.rect(-2, -16, 4, 3).fill(0xe0a84a);
      break;
    case 'study':
      g.rect(-4, -8, 8, 6).fill(0xf0e2c4);
      g.rect(-4, -8, 1, 6).fill(0x8a5a3b);
      break;
    case 'road':
      g.rect(0, -11, 2, 12).fill(0x8a5a3b);
      g.rect(-3, -14, 6, 3).fill(metal);
      break;
    default:
      break;
  }
}

interface AnimatedView {
  update(time: number): void;
}

class FloatView implements AnimatedView {
  constructor(
    private readonly target: Container,
    private readonly baseY: number,
    private readonly phase: number,
    private readonly amplitude = 1.5,
  ) {}

  update(time: number): void {
    this.target.y = this.baseY + Math.sin(time / 600 + this.phase * Math.PI * 2) * this.amplitude;
  }
}

class ActorView implements AnimatedView {
  private frame = 0;

  constructor(
    private readonly body: Container,
    private readonly sprite: Sprite,
    private readonly frames: Texture[],
    private readonly phase: number,
    private readonly tool: Graphics | null,
  ) {}

  update(time: number): void {
    const next = Math.floor((time + this.phase * 500) / 420) % 2;
    if (next !== this.frame && this.frames[next]) {
      this.frame = next;
      this.sprite.texture = this.frames[next];
    }
    this.body.y = Math.sin(time / 650 + this.phase * Math.PI * 2) * 0.9;
    if (this.tool) this.tool.rotation = Math.sin(time / 430 + this.phase * 4) * 0.18;
  }
}

class RestBubbleView implements AnimatedView {
  constructor(
    private readonly letters: Graphics[],
    private readonly offsets: { x: number; y: number }[],
  ) {}

  update(time: number): void {
    this.letters.forEach((letter, index) => {
      const phase = ((time / 1100 + index * 0.33) % 1 + 1) % 1;
      const offset = this.offsets[index];
      letter.x = (offset?.x ?? 0) + phase * 4;
      letter.y = (offset?.y ?? 0) - phase * 16;
      letter.alpha = 0.25 + (1 - phase) * 0.75;
    });
  }
}

function buildingColor(id: number): number {
  switch (id) {
    case BUILDING_SEDE:
      return 0xe8d8b8;
    case BUILDING_HOUSE:
      return 0xf0e2c4;
    case BUILDING_TERREIRO:
      return 0xc9b38a;
    case BUILDING_TULHA:
      return 0x9a6b43;
    case BUILDING_CAPELA:
      return 0xf4efe0;
    case BUILDING_VENDA:
      return 0xd9b36a;
    case BUILDING_ESCOLA:
      return 0xd7c6a2;
    case BUILDING_FORNO:
      return 0xa8663e;
    default:
      return 0xb0a090;
  }
}

function buildingSprite(id: number): string | null {
  switch (id) {
    case BUILDING_SEDE:
      return 'sede';
    case BUILDING_HOUSE:
      return 'house';
    case BUILDING_TERREIRO:
      return 'terreiro';
    case BUILDING_TULHA:
      return 'tulha';
    case BUILDING_CAPELA:
      return 'capela';
    case BUILDING_VENDA:
      return 'venda';
    case BUILDING_ESCOLA:
      return 'escola';
    case BUILDING_FORNO:
      return 'forno';
    default:
      return null;
  }
}

interface BuildingArt {
  scale: number;
  anchorX: number;
  anchorY: number;
  yOffset: number;
  xOffset?: number;
}

const DEFAULT_BUILDING_ART: BuildingArt = {
  scale: 1,
  anchorX: 0.5,
  anchorY: 1,
  yOffset: 12,
};

const BUILDING_ART: Record<number, BuildingArt> = {
  [BUILDING_SEDE]: { scale: 2, anchorX: 64 / 112, anchorY: 52 / 88, yOffset: 0 },
  [BUILDING_HOUSE]: { scale: 2, anchorX: 0.5, anchorY: 56 / 80, yOffset: 0 },
  [BUILDING_TERREIRO]: { scale: 2, anchorX: 0.5, anchorY: 56 / 80, yOffset: 0 },
  [BUILDING_TULHA]: { scale: 2, anchorX: 64 / 128, anchorY: 56 / 104, yOffset: 0 },
  [BUILDING_VENDA]: { scale: 2, anchorX: 48 / 96, anchorY: 40 / 64, yOffset: 0 },
  [BUILDING_CAPELA]: { scale: 2, anchorX: 40 / 80, anchorY: 64 / 112, yOffset: 0 },
  [BUILDING_ESCOLA]: { scale: 2, anchorX: 48 / 96, anchorY: 56 / 88, yOffset: 0 },
  [BUILDING_FORNO]: { scale: 2, anchorX: 64 / 128, anchorY: 56 / 104, yOffset: 0 },
};

function buildingArt(id: number): BuildingArt {
  return BUILDING_ART[id] ?? DEFAULT_BUILDING_ART;
}

async function loadAtlas(): Promise<Map<string, Texture> | null> {
  const base = import.meta.env.BASE_URL;
  try {
    const response = await fetch(`${base}art/sitio.json`);
    if (!response.ok) return null;
    const slices = readSlices(await response.json());
    if (slices.size === 0) return null;
    const sheet = await Assets.load<Texture>(`${base}art/sitio.png`);
    sheet.source.scaleMode = 'nearest';
    const textures = new Map<string, Texture>();
    for (const [name, bounds] of slices) {
      textures.set(
        name,
        new Texture({
          source: sheet.source,
          frame: new Rectangle(bounds.x, bounds.y, bounds.w, bounds.h),
        }),
      );
    }
    return textures;
  } catch {
    return null;
  }
}

export class SitioRenderer {
  readonly app = new Application();
  readonly camera = new Camera();
  private readonly root = new Container();
  private readonly ground = new Graphics();
  private readonly tileLayer = new Container();
  private readonly objects = new Container();
  private readonly statusLayer = new Container();
  private readonly animated: AnimatedView[] = [];
  private readonly ghostLayer = new Container();
  private readonly planLayer = new Graphics();
  private readonly overlay = new Graphics();
  private readonly heights = new FlatHeights(SITIO_SIZE);
  private atlas: Map<string, Texture> | null = null;
  private state: SitioFullState | null = null;
  private onTile: ((x: number, y: number) => void) | null = null;
  private onHover: ((tile: Point | null) => void) | null = null;
  private hover: Point | null = null;
  private placement: {
    x: number;
    y: number;
    w: number;
    h: number;
    valid: boolean;
    kind?: BuildingKind | 'sede' | 'coffee';
  } | null = null;
  private ghost: Sprite | null = null;
  private panning: { x: number; y: number } | null = null;
  private initialized = false;
  private destroyed = false;
  private inputEnabled = true;
  private time = 0;
  private readonly listeners = new AbortController();

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: host,
      background: 0x241c16,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    host.appendChild(this.app.canvas);
    this.app.canvas.classList.add('game-canvas');
    this.objects.sortableChildren = true;
    this.tileLayer.sortableChildren = true;
    this.statusLayer.sortableChildren = true;
    this.root.addChild(
      this.ground,
      this.tileLayer,
      this.objects,
      this.statusLayer,
      this.ghostLayer,
      this.planLayer,
      this.overlay,
    );
    this.app.stage.addChild(this.root);
    this.atlas = await loadAtlas();
    this.attachInput(this.app.canvas);
    this.app.ticker.add(() => this.frame());
    this.initialized = true;
    this.setupCamera();
    this.rebuild();
    this.refreshGhost();
  }

  setOnTile(handler: (x: number, y: number) => void): void {
    this.onTile = handler;
  }

  setOnHover(handler: (tile: Point | null) => void): void {
    this.onHover = handler;
  }

  private setHover(tile: Point | null): void {
    if (this.hover?.x === tile?.x && this.hover?.y === tile?.y) return;
    this.hover = tile;
    this.onHover?.(tile);
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  setPlacement(
    placement: {
      x: number;
      y: number;
      w: number;
      h: number;
      valid: boolean;
      kind?: BuildingKind | 'sede' | 'coffee';
    } | null,
  ): void {
    this.placement = placement;
    if (this.initialized) this.refreshGhost();
  }

  private refreshGhost(): void {
    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }
    const placement = this.placement;
    if (!placement?.kind) return;
    let textureName: string | null;
    let art: BuildingArt;
    if (placement.kind === 'coffee') {
      textureName = 'coffee_lot_0';
      art = { scale: 2, anchorX: 76 / 128, anchorY: 56 / 96, yOffset: 0 };
    } else {
      const id =
        placement.kind === 'sede' ? BUILDING_SEDE : BUILDING_IDS[placement.kind];
      textureName = buildingSprite(id);
      art = buildingArt(id);
    }
    if (!textureName) return;
    const texture = this.atlas?.get(textureName);
    if (!texture) return;
    const sprite = new Sprite(texture);
    const centre =
      placement.w > 1 || placement.h > 1
        ? vertexToScreen(
            placement.x + placement.w / 2,
            placement.y + placement.h / 2,
            0,
          )
        : tileCenter(this.heights, placement.x, placement.y);
    sprite.anchor.set(art.anchorX, art.anchorY);
    sprite.scale.set(art.scale);
    sprite.alpha = 0.55;
    sprite.tint = placement.valid ? 0xffffff : 0xffaaaa;
    sprite.position.set(centre.x + (art.xOffset ?? 0), centre.y + art.yOffset);
    this.ghost = sprite;
    this.ghostLayer.addChild(sprite);
  }

  setState(state: SitioFullState): void {
    this.state = state;
    if (this.initialized) this.rebuild();
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners.abort();
    if (this.initialized) this.app.destroy(true, { children: true });
  }

  private setupCamera(): void {
    const left = vertexToScreen(0, SITIO_SIZE, 0);
    const right = vertexToScreen(SITIO_SIZE, 0, 0);
    const bottom = vertexToScreen(SITIO_SIZE, SITIO_SIZE, 0);
    this.camera.bounds = {
      minX: left.x,
      maxX: right.x,
      minY: -HEIGHT_STEP * 2,
      maxY: bottom.y,
    };
    this.camera.viewWidth = this.app.screen.width;
    this.camera.viewHeight = this.app.screen.height;
    const centre = tileCenter(this.heights, SITIO_SIZE / 2, SITIO_SIZE / 2);
    const panelOffset = this.app.screen.width > 900 ? 150 : 0;
    this.camera.centerOn(centre.x + panelOffset, centre.y);
  }

  private rebuild(): void {
    this.ground.clear();
    this.planLayer.clear();
    this.animated.length = 0;
    for (const child of this.tileLayer.removeChildren()) child.destroy();
    for (const child of this.objects.removeChildren()) child.destroy();
    for (const child of this.statusLayer.removeChildren()) child.destroy();
    const state = this.state;
    if (!state) return;

    for (const tile of state.roadPlan) {
      const quad = tileQuad(this.heights, tile.x, tile.y).flatMap((point) => [
        point.x,
        point.y,
      ]);
      this.planLayer
        .poly(quad)
        .fill({ color: 0xe0a84a, alpha: 0.22 })
        .stroke({ width: 1, color: 0xe0a84a, alpha: 0.8 });
    }

    for (let y = 0; y < SITIO_SIZE; y++) {
      for (let x = 0; x < SITIO_SIZE; x++) {
        const index = y * SITIO_SIZE + x;
        const terrain = state.terrain[index] ?? 0;
        const variant = tileHash(x, y);
        const tile =
          terrain === TERRAIN_ROAD
            ? `road_${this.roadMask(state, x, y)}`
            : terrain === TERRAIN_MATA
              ? variant < 0.5
                ? 'tile_mata'
                : 'tile_mata_alt'
              : variant < 0.5
                ? 'tile_terra'
                : 'tile_terra_alt';
        if (this.drawTileSprite(tile, x, y)) continue;
        const palette = terrain === TERRAIN_ROAD ? ROAD : terrain === TERRAIN_MATA ? MATA : TERRA;
        const color = palette[Math.floor(variant * palette.length)] ?? palette[0];
        const quad = tileQuad(this.heights, x, y).flatMap((point) => [point.x, point.y]);
        this.ground.poly(quad).fill(color).stroke({ width: 1, color: 0x1b140f, alpha: 0.28 });
      }
    }

    for (let y = 0; y < SITIO_SIZE; y++) {
      for (let x = 0; x < SITIO_SIZE; x++) {
        const index = y * SITIO_SIZE + x;
        const terrain = state.terrain[index] ?? 0;
        if (terrain === TERRAIN_MATA && !this.drawSprite('tree', x, y, 0.2, 2, 1, 9)) {
          this.drawTree(this.objectAt(x, y));
        }
        const coffee = state.coffee[index] ?? COFFEE_NONE;
        if (coffee !== COFFEE_NONE && !this.coffeeLotAt(state, x, y)) {
          const coffeeName =
            ['coffee_0', 'coffee_1', 'coffee_2', 'coffee_3'][coffee - COFFEE_MUDA] ?? 'coffee_0';
          if (!this.drawSprite(coffeeName, x, y, 0.1, 2, 1, 10)) {
            this.drawCoffee(this.objectAt(x, y, 0.1), coffee);
          }
        }
      }
    }

    for (const structure of state.structures) {
      const id = structure.kind === 'sede' ? BUILDING_SEDE : BUILDING_IDS[structure.kind];
      const name = buildingSprite(id);
      if (
        !name ||
        !this.drawFootprintBuilding(
          name,
          structure.x,
          structure.y,
          structure.w,
          structure.h,
          buildingArt(id),
        )
      ) {
        this.drawBuilding(this.objectAt(structure.x, structure.y, 0.2), id);
      }
    }

    for (const lot of state.coffeeLots) {
      const stage = this.coffeeLotStage(state, lot);
      if (stage >= 0 && !this.drawCoffeeLot(lot, stage)) {
        for (let y = lot.y; y < lot.y + lot.h; y++) {
          for (let x = lot.x; x < lot.x + lot.w; x++) {
            const coffee = state.coffee[y * SITIO_SIZE + x] ?? COFFEE_NONE;
            if (coffee === COFFEE_NONE) continue;
            const coffeeName =
              ['coffee_0', 'coffee_1', 'coffee_2', 'coffee_3'][coffee - COFFEE_MUDA] ?? 'coffee_0';
            if (!this.drawSprite(coffeeName, x, y, 0.1, 2, 1, 10)) {
              this.drawCoffee(this.objectAt(x, y, 0.1), coffee);
            }
          }
        }
      }
    }

    for (const site of state.sites) {
      this.drawConstructionSite(
        this.objectAtCenter(site.x, site.y, site.w, site.h, 0.3),
        site.x,
        site.y,
        site.w,
        site.h,
        site.progress,
        site.required,
      );
    }

    for (const order of state.plantOrders) {
      this.drawPlantOrder(
        this.objectAtCenter(order.x, order.y, order.w, order.h, 0.3),
        order.x,
        order.y,
        order.w,
        order.h,
        order.progress,
        order.required,
      );
    }

    for (const plan of planActors(state)) this.drawActor(state, plan);
    this.drawFieldMarkers(state);
    this.drawForecasts(state);
    this.drawRestBubbles(state);
  }

  private roadMask(state: SitioFullState, x: number, y: number): number {
    const isRoad = (xx: number, yy: number): boolean =>
      xx < 0 ||
      yy < 0 ||
      xx >= SITIO_SIZE ||
      yy >= SITIO_SIZE ||
      state.terrain[yy * SITIO_SIZE + xx] === TERRAIN_ROAD;
    return (
      (isRoad(x, y - 1) ? 1 : 0) |
      (isRoad(x + 1, y) ? 2 : 0) |
      (isRoad(x, y + 1) ? 4 : 0) |
      (isRoad(x - 1, y) ? 8 : 0)
    );
  }

  private coffeeLotAt(state: SitioFullState, x: number, y: number): CoffeeLot | null {
    return (
      state.coffeeLots.find(
        (lot) => x >= lot.x && y >= lot.y && x < lot.x + lot.w && y < lot.y + lot.h,
      ) ?? null
    );
  }

  private coffeeLotStage(state: SitioFullState, lot: CoffeeLot): number {
    let stage = -1;
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) {
        const coffee = state.coffee[y * SITIO_SIZE + x] ?? COFFEE_NONE;
        if (coffee !== COFFEE_NONE) stage = Math.max(stage, coffee - COFFEE_MUDA);
      }
    }
    return stage;
  }

  private drawCoffeeLot(lot: CoffeeLot, stage: number): boolean {
    const texture = this.atlas?.get(`coffee_lot_${stage}`);
    if (!texture) return false;
    const sprite = new Sprite(texture);
    const centre = vertexToScreen(lot.x + lot.w / 2, lot.y + lot.h / 2, 0);
    sprite.anchor.set(76 / 128, 56 / 96);
    sprite.scale.set(2);
    sprite.position.set(centre.x, centre.y);
    sprite.zIndex = lot.x + lot.y + (lot.w - 1) + (lot.h - 1) + 0.1;
    this.objects.addChild(sprite);
    return true;
  }

  private drawTileSprite(name: string, x: number, y: number): boolean {
    const texture = this.atlas?.get(name);
    if (!texture) return false;
    const sprite = new Sprite(texture);
    const centre = tileCenter(this.heights, x, y);
    sprite.anchor.set(0.5);
    sprite.scale.set(2);
    sprite.position.set(centre.x, centre.y);
    sprite.zIndex = x + y;
    this.tileLayer.addChild(sprite);
    return true;
  }

  private drawFootprintBuilding(
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
    art: BuildingArt,
  ): boolean {
    const texture = this.atlas?.get(name);
    if (!texture) return false;
    const sprite = new Sprite(texture);
    const centre =
      w > 1 || h > 1
        ? vertexToScreen(x + w / 2, y + h / 2, 0)
        : tileCenter(this.heights, x, y);
    sprite.anchor.set(art.anchorX, art.anchorY);
    sprite.scale.set(art.scale);
    sprite.position.set(centre.x + (art.xOffset ?? 0), centre.y + art.yOffset);
    sprite.zIndex = x + y + (w - 1) + (h - 1) + 0.2;
    this.objects.addChild(sprite);
    return true;
  }

  private drawSprite(
    name: string,
    x: number,
    y: number,
    offset: number,
    scale: number,
    anchorY: number,
    yOffset: number,
    xOffset = 0,
  ): boolean {
    const texture = this.atlas?.get(name);
    if (!texture) return false;
    const sprite = new Sprite(texture);
    const centre = tileCenter(this.heights, x, y);
    sprite.anchor.set(0.5, anchorY);
    sprite.scale.set(scale);
    sprite.position.set(centre.x + xOffset, centre.y + yOffset);
    sprite.zIndex = x + y + offset;
    this.objects.addChild(sprite);
    return true;
  }

  private objectAtCenter(x: number, y: number, w: number, h: number, offset = 0): Graphics {
    const sprite = new Graphics();
    const centre = vertexToScreen(x + w / 2, y + h / 2, 0);
    sprite.position.set(centre.x, centre.y);
    sprite.zIndex = x + y + w / 2 + h / 2 + offset;
    this.objects.addChild(sprite);
    return sprite;
  }

  private objectAt(x: number, y: number, offset = 0): Graphics {
    const sprite = new Graphics();
    const centre = tileCenter(this.heights, x, y);
    sprite.position.set(centre.x, centre.y);
    sprite.zIndex = x + y + offset;
    this.objects.addChild(sprite);
    return sprite;
  }

  private drawTree(g: Graphics): void {
    g.rect(-2, -18, 4, 18).fill(0x5a3d27);
    g.poly([-13, -14, -2, -30, 9, -14]).fill(0x2f5a37);
    g.poly([-10, -22, -2, -34, 6, -22]).fill(0x3f6b44);
    g.rect(-1, -30, 2, 4).fill(0x3f6b44);
  }

  private drawCoffee(g: Graphics, stage: number): void {
    const color = COFFEE[Math.max(0, Math.min(3, stage - COFFEE_MUDA))] ?? COFFEE[0];
    const height = stage === COFFEE_MUDA ? 7 : stage === COFFEE_GROWING ? 11 : 15;
    g.rect(-1, -height, 2, height).fill(color);
    g.poly([-8, -height + 2, 0, -height - 6, 8, -height + 2]).fill(color);
    g.poly([-6, -height + 7, 0, -height - 1, 6, -height + 7]).fill(color);
    if (stage === COFFEE_MATURE) {
      g.rect(-5, -height - 1, 2, 2).fill(0xc7442e);
      g.rect(2, -height + 1, 2, 2).fill(0xc7442e);
      g.rect(-1, -height + 5, 2, 2).fill(0xd85a3a);
    } else if (stage === COFFEE_FORMING) {
      g.rect(-4, -height, 2, 2).fill(0xd8a33a);
      g.rect(2, -height + 3, 2, 2).fill(0xd8a33a);
    }
  }

  private drawBuilding(g: Graphics, id: number): void {
    const wall = buildingColor(id);
    if (id === BUILDING_TERREIRO) {
      g.poly([-14, 0, 0, -7, 14, 0, 0, 7]).fill(0xc9b38a);
      g.poly([-10, 0, 0, -5, 10, 0, 0, 5]).fill(0xa88a62);
      return;
    }
    if (id === BUILDING_HOUSE) {
      g.rect(-13, -14, 26, 14).fill(wall);
      g.poly([-16, -14, 0, -24, 16, -14]).fill(0xb8563a);
      g.rect(-3, -8, 6, 8).fill(0x6b3d2a);
      g.rect(-11, -10, 4, 4).fill(0x6b3d2a);
      g.rect(7, -10, 4, 4).fill(0x6b3d2a);
      g.rect(14, -3, 9, 4).fill(0x4f7a3a);
      g.rect(15, -5, 2, 2).fill(0xe8d08a);
      g.rect(20, -5, 2, 2).fill(0xe8d08a);
      return;
    }
    if (id === BUILDING_SEDE) {
      g.rect(-16, -22, 32, 22).fill(wall);
      g.poly([-19, -22, 0, -34, 19, -22]).fill(0x8c4a34);
      g.rect(-4, -12, 8, 12).fill(0x5a3424);
      g.rect(-12, -16, 5, 5).fill(0x5a3424);
      g.rect(7, -16, 5, 5).fill(0x5a3424);
      return;
    }
    if (id === BUILDING_TULHA) {
      g.rect(-14, -16, 28, 16).fill(wall);
      g.poly([-17, -16, 0, -26, 17, -16]).fill(0x6e4a2e);
      g.rect(-4, -9, 8, 9).fill(0x4a3220);
      return;
    }
    if (id === BUILDING_CAPELA) {
      g.rect(-12, -18, 24, 18).fill(wall);
      g.poly([-15, -18, 0, -28, 15, -18]).fill(0x8c6a4a);
      g.rect(-15, -30, 2, 8).fill(0x4a3a2a);
      g.rect(-18, -27, 8, 2).fill(0x4a3a2a);
      g.rect(-3, -10, 6, 10).fill(0x6b4a2e);
      return;
    }
    if (id === BUILDING_VENDA) {
      g.rect(-12, -14, 24, 14).fill(wall);
      g.poly([-15, -14, 0, -22, 15, -14]).fill(0x8c4a34);
      g.rect(-10, -11, 20, 4).fill(0xe0a84a);
      g.rect(-10, -7, 20, 7).fill(0x7a5a3a);
      return;
    }
    if (id === BUILDING_ESCOLA) {
      g.rect(-14, -16, 28, 16).fill(wall);
      g.poly([-17, -16, 0, -26, 17, -16]).fill(0x6e4a2e);
      g.rect(-11, -12, 5, 5).fill(0x6b4a2e);
      g.rect(-2, -12, 4, 5).fill(0x6b4a2e);
      g.rect(7, -12, 5, 5).fill(0x6b4a2e);
      return;
    }
    if (id === BUILDING_FORNO) {
      g.rect(-16, -6, 32, 6).fill(0x6a4a32);
      g.rect(-14, -14, 28, 9).fill(wall);
      g.ellipse(0, -14, 14, 10).fill(0xb8563a);
      g.ellipse(0, -14, 8, 5).fill(0x4a2c1e);
      g.rect(9, -30, 5, 18).fill(0x8a5a3b);
      g.rect(8, -32, 7, 3).fill(0x6b3d2a);
      g.rect(-4, -9, 8, 9).fill(0x4a2c1e);
      g.rect(-12, -3, 5, 3).fill(0x9a6b43);
      g.rect(7, -3, 5, 3).fill(0x9a6b43);
      return;
    }
    g.rect(-13, -14, 26, 14).fill(wall);
    g.poly([-16, -14, 0, -24, 16, -14]).fill(0x8c4a34);
  }

  private drawConstructionSite(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    progress: number,
    required: number,
  ): void {
    const centre = vertexToScreen(x + w / 2, y + h / 2, 0);
    const local = (wx: number, wy: number) => {
      const point = vertexToScreen(wx, wy, 0);
      return { x: point.x - centre.x, y: point.y - centre.y };
    };
    const corners = [
      local(x, y),
      local(x + w, y),
      local(x + w, y + h),
      local(x, y + h),
    ];
    const ratio = required > 0 ? Math.max(0, Math.min(1, progress / required)) : 0;
    const barWidth = Math.max(28, w * 13);
    const beam = (a: { x: number; y: number }, b: { x: number; y: number }, width: number, color: number) => {
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color });
    };
    const stake = (point: { x: number; y: number }, height: number) => {
      g.rect(point.x - 1, point.y - height, 3, height).fill(0x6b4d30);
      g.rect(point.x - 2, point.y - height - 2, 5, 3).fill(0xb07a4a);
    };

    g.poly(corners.flatMap((point) => [point.x, point.y]))
      .fill({ color: 0x6b4a32, alpha: 0.96 })
      .stroke({ width: 1, color: 0x3f2a1e });
    const inner = [
      local(x + 0.18, y + 0.18),
      local(x + w - 0.18, y + 0.18),
      local(x + w - 0.18, y + h - 0.18),
      local(x + 0.18, y + h - 0.18),
    ];
    g.poly(inner.flatMap((point) => [point.x, point.y]))
      .fill({ color: 0x8a7a68, alpha: 0.8 })
      .stroke({ width: 1, color: 0x5a4a3a });

    for (const point of corners) stake(point, 7);
    beam(corners[0] ?? { x: 0, y: 0 }, corners[1] ?? { x: 0, y: 0 }, 1, 0xd6c2a0);
    beam(corners[1] ?? { x: 0, y: 0 }, corners[2] ?? { x: 0, y: 0 }, 1, 0xd6c2a0);

    const materialLeft = local(x - 0.22, y + h + 0.35);
    const materialRight = local(x + w + 0.22, y + h * 0.55);
    const pile = (point: { x: number; y: number }) => {
      g.rect(point.x - 8, point.y - 3, 12, 3).fill(0xb07a4a);
      g.rect(point.x - 7, point.y - 6, 11, 3).fill(0xc9b38a);
      g.rect(point.x - 5, point.y - 8, 8, 2).fill(0xd6c2a0);
    };
    pile(materialLeft);
    pile(materialRight);
    g.rect(materialLeft.x - 2, materialLeft.y - 12, 2, 12).fill(0x8a5a3b);
    g.rect(materialRight.x - 2, materialRight.y - 10, 2, 10).fill(0x8a5a3b);

    const frontLeft = local(x + 0.2, y + h);
    const frontRight = local(x + w - 0.2, y + h);
    const barrow = local(x + 0.2, y + h + 0.55);
    g.rect(barrow.x - 10, barrow.y - 5, 13, 3).fill(0xd6c2a0);
    g.circle(barrow.x - 9, barrow.y - 1, 3).fill(0x4a2c1e);
    g.circle(barrow.x + 1, barrow.y - 1, 2).fill(0x4a2c1e);
    g.rect(barrow.x - 3, barrow.y - 7, 2, 5).fill(0xb07a4a);

    const sawhorse = local(x + w - 0.25, y + h + 0.35);
    g.rect(sawhorse.x - 6, sawhorse.y - 5, 2, 5).fill(0x8a5a3b);
    g.rect(sawhorse.x + 4, sawhorse.y - 5, 2, 5).fill(0x8a5a3b);
    g.rect(sawhorse.x - 7, sawhorse.y - 7, 14, 2).fill(0xb07a4a);

    const ladder = local(x + w - 0.15, y + h - 0.5);
    g.rect(ladder.x - 5, ladder.y - 12, 2, 12).fill(0xb07a4a);
    g.rect(ladder.x + 1, ladder.y - 12, 2, 12).fill(0xb07a4a);
    for (let rung = 0; rung < 4; rung++) {
      g.rect(ladder.x - 5, ladder.y - 10 + rung * 3, 8, 1).fill(0xf0e2c4);
    }

    const bricks = local(x + w + 0.22, y + h + 0.55);
    for (let row = 0; row < 3; row++) {
      g.rect(bricks.x - 8, bricks.y - row * 3, 15, 2).fill(row % 2 === 0 ? 0xb8563a : 0xd6c2a0);
    }

    if (ratio >= 0) {
      const scaffoldHeight = 7 + ratio * 13;
      const topLeft = local(x + 0.15, y + 0.15);
      const topRight = local(x + w - 0.15, y + 0.15);
      const bottomLeft = local(x + 0.15, y + h - 0.15);
      const bottomRight = local(x + w - 0.15, y + h - 0.15);
      stake(topLeft, scaffoldHeight);
      stake(topRight, scaffoldHeight);
      stake(bottomLeft, scaffoldHeight);
      stake(bottomRight, scaffoldHeight);
      beam(
        { x: topLeft.x, y: topLeft.y - scaffoldHeight },
        { x: topRight.x, y: topRight.y - scaffoldHeight },
        3,
        0xb07a4a,
      );
      beam(
        { x: bottomLeft.x, y: bottomLeft.y - scaffoldHeight },
        { x: bottomRight.x, y: bottomRight.y - scaffoldHeight },
        3,
        0xb07a4a,
      );
      beam(
        { x: topLeft.x, y: topLeft.y - scaffoldHeight },
        { x: bottomLeft.x, y: bottomLeft.y - scaffoldHeight },
        2,
        0x8a5a3b,
      );
      beam(
        { x: topRight.x, y: topRight.y - scaffoldHeight },
        { x: bottomRight.x, y: bottomRight.y - scaffoldHeight },
        2,
        0x8a5a3b,
      );
      beam({ x: topLeft.x, y: topLeft.y - scaffoldHeight }, { x: bottomRight.x, y: bottomRight.y - 3 }, 1, 0xd6c2a0);
      beam({ x: topRight.x, y: topRight.y - scaffoldHeight }, { x: bottomLeft.x, y: bottomLeft.y - 3 }, 1, 0xd6c2a0);
    }

    if (ratio > 0.28) {
      const wallHeight = 3 + ratio * 11;
      g.poly([
        frontLeft.x,
        frontLeft.y,
        frontRight.x,
        frontRight.y,
        frontRight.x,
        frontRight.y - wallHeight,
        frontLeft.x,
        frontLeft.y - wallHeight,
      ])
        .fill({ color: 0xf0e2c4, alpha: 0.95 })
        .stroke({ width: 1, color: 0x6b4d30 });
      g.rect(frontLeft.x + 2, frontLeft.y - 6, 3, 4).fill(0x6a8a9a);
    }

    if (ratio > 0.46) {
      g.poly([
        frontLeft.x,
        frontLeft.y - 12,
        frontRight.x,
        frontRight.y - 12,
        frontRight.x - 3,
        frontRight.y - 16,
        frontLeft.x + 3,
        frontLeft.y - 16,
      ])
        .fill({ color: 0xb8563a, alpha: 0.85 })
        .stroke({ width: 1, color: 0x6e3a28 });
    }

    if (ratio > 0.64) {
      const roofTop = local(x + w / 2, y + h / 2);
      beam(frontLeft, { x: roofTop.x, y: roofTop.y - 19 }, 1, 0x8c4a34);
      beam(frontRight, { x: roofTop.x, y: roofTop.y - 19 }, 1, 0x8c4a34);
      beam(
        { x: frontLeft.x, y: frontLeft.y - 13 },
        { x: roofTop.x, y: roofTop.y - 19 },
        1,
        0xb8563a,
      );
      beam(
        { x: frontRight.x, y: frontRight.y - 13 },
        { x: roofTop.x, y: roofTop.y - 19 },
        1,
        0xb8563a,
      );
    }

    if (ratio > 0.12) {
      const crane = local(x + w + 0.3, y + 0.1);
      g.rect(crane.x - 1, crane.y - 26, 3, 26).fill(0x6b4d30);
      g.rect(crane.x - 12, crane.y - 27, 24, 3).fill(0xb07a4a);
      g.rect(crane.x + 10, crane.y - 24, 1, 15).fill(0x4a2c1e);
      g.rect(crane.x + 7, crane.y - 10, 7, 4).fill(0xb8563a);
      g.rect(crane.x + 8, crane.y - 9, 4, 2).fill(0xd6c2a0);
    }

    g.rect(-barWidth / 2, -4, barWidth, 3).fill(0x2a2018);
    g.rect(-barWidth / 2, -4, barWidth * ratio, 3).fill(0xe0a84a);
    if (ratio > 0.9) g.rect(-6, -6, 12, 1).fill(0xf0e2c4);
  }

  private drawPlantOrder(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    progress: number,
    required: number,
  ): void {
    const centre = vertexToScreen(x + w / 2, y + h / 2, 0);
    const local = (wx: number, wy: number) => {
      const point = vertexToScreen(wx, wy, 0);
      return { x: point.x - centre.x, y: point.y - centre.y };
    };
    const corners = [
      local(x, y),
      local(x + w, y),
      local(x + w, y + h),
      local(x, y + h),
    ];
    const ratio = required > 0 ? Math.max(0, Math.min(1, progress / required)) : 0;
    const barWidth = Math.max(28, w * 13);
    g.poly(corners.flatMap((point) => [point.x, point.y]))
      .fill({ color: 0x6b452c, alpha: 0.95 })
      .stroke({ width: 1, color: 0x3f2a1e });
    const planted = Math.round(ratio * w * h);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const point = local(x + col + 0.5, y + row + 0.5);
        g.ellipse(point.x, point.y, 5, 2).fill(0x8a5a3b);
        if (row * w + col < planted) {
          g.rect(point.x - 1, point.y - 7, 2, 7).fill(0x3f7434);
          g.poly([point.x - 4, point.y - 5, point.x, point.y - 10, point.x + 4, point.y - 5]).fill(0x5c8f3e);
        } else {
          g.rect(point.x - 1, point.y - 2, 2, 2).fill(0x6b452c);
        }
      }
    }
    for (let col = 0; col <= w; col++) {
      const point = local(x + col, y + h + 0.08);
      g.rect(point.x - 1, point.y - 4, 2, 4).fill(0x9a6b43);
    }
    g.rect(-barWidth / 2, -4, barWidth, 3).fill(0x2a2018);
    g.rect(-barWidth / 2, -4, barWidth * ratio, 3).fill(0x7fae5a);
  }

  private drawActor(state: SitioFullState, plan: ActorPlan): void {
    const textures = [
      spriteName(plan.variant, plan.outfit, 0),
      spriteName(plan.variant, plan.outfit, 1),
    ]
      .map((name) => this.atlas?.get(name))
      .filter((texture): texture is Texture => Boolean(texture));
    const anchor = vertexToScreen(plan.anchorX, plan.anchorY, 0);
    const slot = ACTOR_SLOTS[plan.slot % ACTOR_SLOTS.length] ?? ACTOR_SLOTS[0];
    const root = new Container();
    root.position.set(anchor.x + slot.x, anchor.y + slot.y);
    root.zIndex = this.actorDepth(state, plan);
    const shadow = new Graphics();
    shadow.ellipse(0, 0, 7, 3).fill({ color: 0x1a120d, alpha: 0.35 });
    root.addChild(shadow);
    const body = new Container();
    body.y = -1;
    root.addChild(body);
    if (!textures[0]) {
      const fallback = new Graphics();
      fallback.position.set(anchor.x + slot.x, anchor.y + slot.y);
      fallback.zIndex = root.zIndex;
      this.objects.addChild(fallback);
      this.drawFamily(fallback);
      return;
    }
    const sprite = new Sprite(textures[0]);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(2);
    body.addChild(sprite);
    const tool = new Graphics();
    tool.position.set(7, -11);
    drawTool(tool, plan.task);
    body.addChild(tool);
    this.objects.addChild(root);
    const phase = (plan.personId * 0.37) % 1;
    this.animated.push(new ActorView(body, sprite, textures, phase, tool));
  }

  private actorDepth(state: SitioFullState, plan: ActorPlan): number {
    if (plan.groupKey.startsWith('lot:')) {
      const id = Number(plan.groupKey.slice(4));
      const lot = state.coffeeLots.find((entry) => entry.id === id);
      if (lot) return lot.x + lot.y + lot.w + lot.h + 0.5;
    }
    if (plan.groupKey.startsWith('order:')) {
      const id = Number(plan.groupKey.slice(6));
      const order = state.plantOrders.find((entry) => entry.id === id);
      if (order) return order.x + order.y + order.w + order.h + 0.5;
    }
    if (plan.groupKey.startsWith('site:')) {
      const id = Number(plan.groupKey.slice(5));
      const site = state.sites.find((entry) => entry.id === id);
      if (site) return site.x + site.y + site.w + site.h + 0.5;
    }
    return plan.anchorX + plan.anchorY + 0.65;
  }
  private drawFieldMarkers(state: SitioFullState): void {
    for (const marker of fieldMarkers(state)) {
      const lot = state.coffeeLots.find((entry) => entry.id === marker.lotId);
      if (!lot) continue;
      const top = vertexToScreen(lot.x + lot.w / 2, lot.y, 0);
      const entries = [
        { name: 'icon_fertilizer', state: marker.fertilizer },
        { name: 'icon_limestone', state: marker.limestone },
      ].filter(
        (entry): entry is { name: string; state: 'applied' | 'queued' } =>
          entry.state !== null,
      );
      entries.forEach((entry, index) => {
        const texture = this.atlas?.get(entry.name);
        if (!texture) return;
        const holder = new Container();
        const x = top.x + (entries.length === 1 ? 0 : index === 0 ? -9 : 9);
        const y = top.y - 15;
        holder.position.set(x, y);
        holder.zIndex = 1000 + index;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        holder.addChild(sprite);
        if (entry.state === 'applied') {
          const check = new Graphics();
          check
            .moveTo(3, -13)
            .lineTo(5, -11)
            .lineTo(9, -16)
            .stroke({ width: 1, color: 0x8fbf6a });
          holder.addChild(check);
        } else {
          holder.alpha = 0.55;
          this.animated.push(new FloatView(holder, y, (lot.id + index) * 0.21, 1.4));
        }
        this.statusLayer.addChild(holder);
      });
    }
  }

  private drawForecasts(state: SitioFullState): void {
    const clock = this.atlas?.get('icon_clock');
    for (const forecast of coffeeHarvestForecast(state)) {
      const lot = state.coffeeLots.find((entry) => entry.id === forecast.lotId);
      if (!lot) continue;
      const top = vertexToScreen(lot.x + lot.w / 2, lot.y, 0);
      const holder = new Container();
      const x = top.x;
      const y = top.y - 38;
      holder.position.set(x, y);
      holder.zIndex = 1002;
      const background = new Graphics();
      const color = forecast.firstHarvestMonth === null ? 0xb9a78a : 0xe0a84a;
      background
        .rect(-19, -9, 38, 16)
        .fill({ color: 0x241c16, alpha: 0.94 })
        .stroke({ width: 1, color });
      holder.addChild(background);
      if (clock) {
        const icon = new Sprite(clock);
        icon.position.set(-18, -8);
        holder.addChild(icon);
      }
      const digits = new Graphics();
      drawNumber(digits, forecast.firstHarvestMonth, -2, -9, color, 2);
      holder.addChild(digits);
      this.statusLayer.addChild(holder);
      this.animated.push(new FloatView(holder, y, lot.id * 0.29, 1.2));
    }
  }

  private drawRestBubbles(state: SitioFullState): void {
    for (const house of restingHouses(state)) {
      const top = vertexToScreen(house.x, house.y, 0);
      const holder = new Container();
      holder.position.set(top.x, top.y - 120);
      holder.zIndex = 1003;
      const letters: Graphics[] = [];
      const offsets: { x: number; y: number }[] = [];
      for (let index = 0; index < 3; index++) {
        const letter = new Graphics();
        drawGlyph(letter, Z_GLYPH, 0, 0, 0xf0e2c4, 2);
        holder.addChild(letter);
        letters.push(letter);
        offsets.push({ x: index * 8, y: -index * 6 });
      }
      this.statusLayer.addChild(holder);
      this.animated.push(new RestBubbleView(letters, offsets));
    }
  }

  private drawFamily(g: Graphics): void {
    g.rect(-2, -10, 4, 6).fill(0x3a3a3a);
    g.rect(-3, -13, 6, 3).fill(0xe0c070);
    g.rect(-1, -5, 1, 5).fill(0x2a2a2a);
    g.rect(1, -5, 1, 5).fill(0x2a2a2a);
  }

  private pick(clientX: number, clientY: number): Point | null {
    const rect = this.app.canvas.getBoundingClientRect();
    const point = this.camera.screenToWorld(clientX - rect.left, clientY - rect.top);
    return pickTile(this.heights, point.x, point.y, 0);
  }

  private frame(): void {
    this.time += this.app.ticker.deltaMS;
    this.camera.viewWidth = this.app.screen.width;
    this.camera.viewHeight = this.app.screen.height;
    this.camera.apply(this.root, true);
    for (const view of this.animated) view.update(this.time);
    this.drawHover();
  }

  private drawHover(): void {
    this.overlay.clear();
    if (this.placement) {
      const color = this.placement.valid ? 0x8fd18a : 0xd96b6b;
      for (let y = this.placement.y; y < this.placement.y + this.placement.h; y++) {
        for (let x = this.placement.x; x < this.placement.x + this.placement.w; x++) {
          if (x < 0 || y < 0 || x >= SITIO_SIZE || y >= SITIO_SIZE) continue;
          const quad = tileQuad(this.heights, x, y).flatMap((point) => [point.x, point.y]);
          this.overlay
            .poly(quad)
            .fill({ color, alpha: 0.26 })
            .stroke({ width: 1, color, alpha: 0.9 });
        }
      }
    }
    if (!this.hover) return;
    const quad = tileQuad(this.heights, this.hover.x, this.hover.y).flatMap((point) => [
      point.x,
      point.y,
    ]);
    this.overlay
      .poly(quad)
      .fill({ color: 0xfff2d8, alpha: 0.08 })
      .stroke({ width: 2, color: 0xfff2d8, alpha: 0.85 });
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    const signal = this.listeners.signal;
    canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          /* synthetic or already-released pointer */
        }
        if (event.button === 1 || event.button === 2) {
          this.panning = { x: event.clientX, y: event.clientY };
          return;
        }
        if (event.button === 0 && this.inputEnabled) {
          const tile = this.pick(event.clientX, event.clientY);
          if (tile) this.onTile?.(tile.x, tile.y);
        }
      },
      { signal },
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        if (this.panning) {
          this.camera.pan(event.clientX - this.panning.x, event.clientY - this.panning.y);
          this.panning = { x: event.clientX, y: event.clientY };
          return;
        }
        this.setHover(this.inputEnabled ? this.pick(event.clientX, event.clientY) : null);
      },
      { signal },
    );
    canvas.addEventListener('pointerup', () => (this.panning = null), { signal });
    canvas.addEventListener('pointerleave', () => this.setHover(null), { signal });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        this.camera.zoomAt(
          event.deltaY > 0 ? 0.9 : 1.1,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
      },
      { signal, passive: false },
    );
  }
}
