import type { RngState } from '@sitio/kernel';

export const SITIO_SIZE = 24;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];
export const MONTHS_PER_SEASON = 4;
export const TURNS_PER_YEAR = MONTHS_PER_SEASON * SEASONS.length;
export const FINAL_TURN = TURNS_PER_YEAR * 3;

export const TERRAIN_TERRA = 0;
export const TERRAIN_MATA = 1;
export const TERRAIN_ROAD = 2;

export const BUILDING_NONE = 0;
export const BUILDING_SEDE = 1;
export const BUILDING_HOUSE = 2;
export const BUILDING_TERREIRO = 3;
export const BUILDING_TULHA = 4;
export const BUILDING_CAPELA = 5;
export const BUILDING_VENDA = 6;
export const BUILDING_ESCOLA = 7;

export const SEDE_X = 6;
export const SEDE_Y = 2;
export const SEDE_WIDTH = 3;
export const SEDE_HEIGHT = 2;

export interface Footprint {
  w: number;
  h: number;
}

export const BUILDING_FOOTPRINTS: Record<number, Footprint> = {
  [BUILDING_SEDE]: { w: SEDE_WIDTH, h: SEDE_HEIGHT },
  [BUILDING_HOUSE]: { w: 2, h: 2 },
  [BUILDING_TERREIRO]: { w: 2, h: 2 },
  [BUILDING_TULHA]: { w: 3, h: 3 },
  [BUILDING_CAPELA]: { w: 1, h: 2 },
  [BUILDING_VENDA]: { w: 2, h: 1 },
  [BUILDING_ESCOLA]: { w: 2, h: 2 },
};

export function footprintOfBuilding(id: number): Footprint {
  return BUILDING_FOOTPRINTS[id] ?? { w: 1, h: 1 };
}

export type BuildingKind = 'house' | 'terreiro' | 'tulha' | 'capela' | 'venda' | 'escola';

export const BUILDING_IDS: Record<BuildingKind, number> = {
  house: BUILDING_HOUSE,
  terreiro: BUILDING_TERREIRO,
  tulha: BUILDING_TULHA,
  capela: BUILDING_CAPELA,
  venda: BUILDING_VENDA,
  escola: BUILDING_ESCOLA,
};

export interface BuildingSpec {
  coins: number;
  wood: number;
  days: number;
  prereq?: BuildingKind[];
  unique?: boolean;
}

export const BUILDING_SPECS: Record<BuildingKind, BuildingSpec> = {
  house: { coins: 4, wood: 2, days: 2 },
  terreiro: { coins: 3, wood: 2, days: 2 },
  tulha: { coins: 4, wood: 3, days: 2, prereq: ['terreiro'], unique: true },
  capela: { coins: 5, wood: 3, days: 3, prereq: ['escola'], unique: true },
  venda: { coins: 4, wood: 2, days: 2, prereq: ['tulha'], unique: true },
  escola: { coins: 6, wood: 3, days: 3, prereq: ['venda'], unique: true },
};

export const COFFEE_NONE = 0;
export const COFFEE_MUDA = 1;
export const COFFEE_GROWING = 2;
export const COFFEE_FORMING = 3;
export const COFFEE_MATURE = 4;
export const COFFEE_PES_PER_CELL = 2;

export type CoffeeGrade = 'bad' | 'medium' | 'good';
export const COFFEE_GRADES: readonly CoffeeGrade[] = ['bad', 'medium', 'good'];

export interface CoffeeGrades {
  bad: number;
  medium: number;
  good: number;
}

export interface MarketCart {
  wood: number;
  fertilizer: number;
  limestone: number;
  seedlings: number;
  food: number;
  bad: number;
  medium: number;
  good: number;
}

export type InputKind = 'fertilizer' | 'limestone';

export interface InputStock {
  fertilizer: number;
  limestone: number;
}

export const INPUT_PRICES: Record<InputKind, number> = {
  fertilizer: 3,
  limestone: 2,
};

export const FAMILY_INVITE_COST = 4;
export const SEEDLING_BUNDLE_SIZE = 4;
export const SEEDLING_BUNDLE_PRICE = 1;
export const COFFEE_LOT_SEEDLINGS = 16;
export const COFFEE_PLANT_PERIODS = 2;

export const COFFEE_QUALITY_BASE = 40;
export const FERTILIZER_QUALITY_BONUS = 20;
export const LIMESTONE_QUALITY_BONUS = 20;
export const ROAD_TILES_PER_MONTH = 1;

export const START_COINS = 12;
export const START_FOOD = 4;
export const START_WOOD = 4;
export const WOOD_PER_CLEAR = 2;
export const WOOD_BUY_PRICE = 1;
export const FAMILY_NEED = 2;
export const YARD_FOOD_PER_PERIOD = 2;
export const FOOD_CAP = 8;
export const FOOD_SELL_PRICE = 1;
export const REST_BONUS = 1;
export const COFFEE_CELLS_PER_PERIOD = 4;
export const HARVEST_YIELD = COFFEE_PES_PER_CELL;
export const TERREIRO_CAPACITY = 16;
export const TULHA_EXTRA_CAPACITY = 6;
export const COFFEE_BASE_PRICE = 2;
export const ARRIVAL_REPUTATION = 3;
export const MORALE_START = 3;
export const MORALE_MAX = 4;
export const WIN_FAMILIES = 6;
export const FROST_LOSS = 2;
export const SCHOOL_AGE = 6;
export const EDUCATION_PERIODS = 4;
export const PERIODS_PER_MONTH_TASK = 2;
export const OUTFIT_COUNT = 6;
export type PersonSex = 'male' | 'female';

export const FAMILY_NAMES = [
  'Silva',
  'Pereira',
  'Oliveira',
  'Costa',
  'Souza',
  'Lima',
  'Almeida',
  'Ribeiro',
  'Carvalho',
  'Gomes',
] as const;

export const PERSON_NAMES = [
  'João',
  'Maria',
  'Ana',
  'Pedro',
  'Rita',
  'José',
  'Clara',
  'Paulo',
  'Lúcia',
  'Carlos',
  'Helena',
  'Miguel',
  'Teresa',
  'Rafael',
  'Inês',
  'Tomás',
  'Beatriz',
  'Manuel',
  'Sofia',
  'António',
] as const;

export type WorkTask =
  | { kind: 'idle' }
  | { kind: 'rest' }
  | { kind: 'yard' }
  | { kind: 'coffee' }
  | { kind: 'study' }
  | { kind: 'road' }
  | { kind: 'plantLot'; orderId: number }
  | { kind: 'fertilize'; x: number; y: number }
  | { kind: 'limestone'; x: number; y: number }
  | { kind: 'build'; siteId: number }
  | { kind: 'plant'; x: number; y: number }
  | { kind: 'clear'; x: number; y: number };

export type TaskKind = WorkTask['kind'];

export type SetupStep = 'sede' | 'house' | 'terreiro' | 'coffee';
export type StarterKind = SetupStep;

export const STARTER_FOOTPRINTS: Record<StarterKind, Footprint> = {
  sede: BUILDING_FOOTPRINTS[BUILDING_SEDE] ?? { w: SEDE_WIDTH, h: SEDE_HEIGHT },
  house: BUILDING_FOOTPRINTS[BUILDING_HOUSE] ?? { w: 2, h: 2 },
  terreiro: BUILDING_FOOTPRINTS[BUILDING_TERREIRO] ?? { w: 2, h: 2 },
  coffee: { w: 4, h: 2 },
};

export interface Person {
  id: number;
  name: string;
  age: number;
  familyId: number;
  education: boolean;
  educationProgress: number;
  sex: PersonSex;
  outfit: number;
  task: WorkTask;
}

export interface Family {
  id: number;
  name: string;
  houseX: number;
  houseY: number;
  morale: number;
}

export interface Site {
  id: number;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  required: number;
}

export interface Structure {
  id: number;
  kind: BuildingKind | 'sede';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoffeeLot {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fertilized: boolean;
  limed: boolean;
}

export interface CoffeePlantOrder {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  required: number;
}

export interface MonthHistoryPoint {
  turn: number;
  month: number;
  year: number;
  season: Season;
  coins: number;
  income: number;
  expenses: number;
  harvest: CoffeeGrades;
  stock: CoffeeGrades;
}

export type YearEvent = 'none' | 'frost' | 'drought';

export interface MoraleChange {
  id: number;
  from: number;
  to: number;
}

export interface SeasonReport {
  turn: number;
  month: number;
  year: number;
  season: Season;
  harvest: number;
  lost: number;
  sold: number;
  stock: number;
  revenue: number;
  price: number;
  foodProduced: number;
  foodConsumed: number;
  foodBought: number;
  foodSold: number;
  foodWasted: number;
  restBonus: number;
  planted: number;
  cleared: number;
  studied: number;
  educated: number;
  roads: number;
  fertilized: number;
  limed: number;
  harvestGrades: CoffeeGrades;
  arrivals: number;
  departures: number;
  stalledCoffee: number;
  completed: BuildingKind[];
  event: YearEvent;
  hunger: boolean;
  morale: MoraleChange[];
}

export type SitioStatus = 'playing' | 'won' | 'lost' | 'ended';

export interface SitioStats {
  name: string;
  seed: string;
  turn: number;
  year: number;
  season: Season;
  families: number;
  coins: number;
  food: number;
  wood: number;
  inputStock: InputStock;
  seedlings: number;
  coffeeStock: number;
  coffeeGrades: CoffeeGrades;
  coffeeCapacity: number;
  coffeePrice: number;
  roadQueue: number;
  reputation: number;
  status: SitioStatus;
  harvestTotal: number;
  revenueTotal: number;
  builtTotal: number;
  arrivalsTotal: number;
  departuresTotal: number;
}

export interface SitioTotals {
  harvestTotal: number;
  revenueTotal: number;
  builtTotal: number;
  arrivalsTotal: number;
  departuresTotal: number;
}

export interface SitioFullState {
  name: string;
  seed: string;
  turn: number;
  month: number;
  monthOfSeason: number;
  monthOfYear: number;
  year: number;
  season: Season;
  coins: number;
  availableCoins: number;
  food: number;
  foodCapacity: number;
  wood: number;
  inputStock: InputStock;
  seedlings: number;
  coffeeStock: number;
  coffeeGrades: CoffeeGrades;
  coffeeCapacity: number;
  coffeePrice: number;
  reputation: number;
  status: SitioStatus;
  setup: SetupStep | null;
  terrain: Uint8Array;
  buildings: Uint8Array;
  coffee: Uint8Array;
  families: Family[];
  people: Person[];
  sites: Site[];
  structures: Structure[];
  coffeeLots: CoffeeLot[];
  plantOrders: CoffeePlantOrder[];
  roadPlan: { x: number; y: number }[];
  marketCart: MarketCart;
  yearEvent: YearEvent;
  lastReport: SeasonReport | null;
  history: MonthHistoryPoint[];
  stats: SitioStats;
}

export interface SitioSnapshot {
  name: string;
  seed: string;
  turn: number;
  coins: number;
  food: number;
  wood: number;
  inputStock: InputStock;
  seedlings: number;
  coffeeStock: number;
  coffeeGrades: CoffeeGrades;
  coffeePrice: number;
  status: SitioStatus;
  yearEvent: YearEvent;
  setup: SetupStep | null;
  rng: RngState;
  terrain: Uint8Array;
  buildings: Uint8Array;
  coffee: Uint8Array;
  families: Family[];
  people: Person[];
  sites: Site[];
  structures: Structure[];
  coffeeLots: CoffeeLot[];
  plantOrders: CoffeePlantOrder[];
  roadPlan: { x: number; y: number }[];
  marketCart: MarketCart;
  totals: SitioTotals;
  lastReport: SeasonReport | null;
  history: MonthHistoryPoint[];
  monthSold: number;
  monthRevenue: number;
  monthExpense: number;
}

export interface NewSitioOptions {
  name: string;
  seed: string;
}

export interface SitioMeta {
  name: string;
  seed: string;
  turn: number;
  year: number;
  season: Season;
  families: number;
  coins: number;
  savedAt: string;
}

export type SitioCommand =
  | { type: 'assign'; personId: number; task: WorkTask }
  | { type: 'build'; kind: BuildingKind; x: number; y: number }
  | { type: 'placeStarter'; kind: StarterKind; x: number; y: number }
  | { type: 'sellCoffee'; grade: CoffeeGrade; amount: number }
  | { type: 'sellFood'; amount: number }
  | { type: 'buyWood'; amount: number }
  | { type: 'buyInput'; kind: InputKind; amount: number }
  | { type: 'buySeedlings'; amount: number }
  | { type: 'plantCoffeeLot'; x: number; y: number }
  | { type: 'planRoad'; x: number; y: number }
  | { type: 'clearRoadPlan' }
  | { type: 'clearMarketCart' }
  | { type: 'inviteFamily' }
  | { type: 'endMonth' };

export type SitioCommandReason =
  | 'oob'
  | 'occupied'
  | 'mata'
  | 'road'
  | 'setup'
  | 'no-coins'
  | 'no-wood'
  | 'no-input'
  | 'no-seedlings'
  | 'no-house'
  | 'no-family'
  | 'no-person'
  | 'not-adult'
  | 'no-school'
  | 'invalid-task'
  | 'invalid-amount'
  | 'no-stock'
  | 'prereq'
  | 'unique'
  | 'reserved'
  | 'no-site'
  | 'game-over'
  | 'nothing';

export type SitioCommandResult =
  | { ok: true; siteId?: number }
  | { ok: false; reason: SitioCommandReason };

export type StarterPreviewResult =
  | { ok: true }
  | { ok: false; reason: SitioCommandReason };

export type ToSitioMessage =
  | { type: 'newGame'; options: NewSitioOptions }
  | { type: 'command'; id: number; command: SitioCommand }
  | { type: 'starterPreview'; id: number; kind: StarterKind; x: number; y: number }
  | { type: 'buildPreview'; id: number; kind: BuildingKind; x: number; y: number }
  | { type: 'coffeePreview'; id: number; x: number; y: number }
  | { type: 'snapshot'; id: number }
  | { type: 'hash'; id: number }
  | { type: 'exportSave'; id: number; savedAt: string }
  | { type: 'importSave'; id: number; text: string };

export type LoadSitioResult =
  | { ok: true; meta: SitioMeta; migratedFrom: number | null }
  | { ok: false; errors: { code: string; detail?: string }[] };

export type FromSitioMessage =
  | { type: 'init'; state: SitioFullState }
  | { type: 'state'; state: SitioFullState }
  | { type: 'commandResult'; id: number; result: SitioCommandResult }
  | { type: 'starterPreviewResult'; id: number; result: StarterPreviewResult }
  | { type: 'buildPreviewResult'; id: number; result: SitioCommandResult }
  | { type: 'coffeePreviewResult'; id: number; result: SitioCommandResult }
  | { type: 'snapshot'; id: number; snapshot: SitioSnapshot }
  | { type: 'hash'; id: number; hash: string }
  | { type: 'saveData'; id: number; text: string; meta: SitioMeta }
  | { type: 'loadResult'; id: number; result: LoadSitioResult }
  | { type: 'error'; message: string };

export function seasonOf(turn: number): Season {
  const index = Math.floor(turn / MONTHS_PER_SEASON) % SEASONS.length;
  return SEASONS[(index + SEASONS.length) % SEASONS.length] as Season;
}

export function yearOf(turn: number): number {
  return Math.floor(turn / TURNS_PER_YEAR) + 1;
}

export function monthOfSeason(turn: number): number {
  return (turn % MONTHS_PER_SEASON) + 1;
}

export function monthOfYear(turn: number): number {
  return (turn % TURNS_PER_YEAR) + 1;
}

export function isBuildingKind(value: string): value is BuildingKind {
  return value in BUILDING_IDS;
}
