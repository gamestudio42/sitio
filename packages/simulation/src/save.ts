import {
  base64ToBytes,
  bytesToBase64,
  decodeEnvelope,
  encodeEnvelope,
  isRecord,
  type SaveEnvelope,
  type SaveError,
} from '@sitio/kernel';
import {
  FINAL_TURN,
  isBuildingKind,
  seasonOf,
  yearOf,
  SITIO_SIZE,
  COFFEE_GRADES,
  COFFEE_STAGES,
  COFFEE_STORAGES,
  type BuildingKind,
  type CoffeeBatch,
  type CoffeeGrades,
  type CoffeeLot,
  type CoffeeSale,
  type CoffeePlantOrder,
  type Family,
  type InputStock,
  OUTFIT_COUNT,
  type MarketCart,
  type Person,
  type PersonSex,
  type SeasonReport,
  type SetupStep,
  type Site,
  type SitioMeta,
  type SitioSnapshot,
  type SitioStatus,
  type SitioTotals,
  type StarterKind,
  type Structure,
  type MonthHistoryPoint,
  type WorkTask,
  type YearEvent,
} from './types';

export const SITIO_SAVE_FORMAT = 'sitio-save';
export const SITIO_SAVE_VERSION = 25;
export const SITIO_SAVE_EXTENSION = '.sitio.json';

const STATUSES: readonly SitioStatus[] = ['playing', 'won', 'lost', 'ended'];
const EVENTS: readonly YearEvent[] = ['none', 'frost', 'drought'];
const STARTERS: readonly StarterKind[] = ['sede', 'house', 'terreiro', 'coffee'];

interface SitioSaveState {
  name: string;
  seed: string;
  turn: number;
  coins: number;
  food: number;
  wood: number;
  inputStock: InputStock;
  seedlings: number;
  coffeeBatches: CoffeeBatch[];
  coffeePrice: number;
  status: SitioStatus;
  yearEvent: YearEvent;
  setup: SetupStep | null;
  rng: number[];
  terrain: string;
  buildings: string;
  coffee: string;
  families: Family[];
  people: Person[];
  sites: Site[];
  structures: Structure[];
  coffeeLots: CoffeeLot[];
  plantOrders: CoffeePlantOrder[];
  roadPlan: { x: number; y: number }[];
  marketCart: MarketCart;
  history: MonthHistoryPoint[];
  totals: SitioTotals;
  lastReport: SeasonReport | null;
  monthSold: number;
  monthRevenue: number;
  monthExpense: number;
}

export type SitioSaveFile = SaveEnvelope<typeof SITIO_SAVE_FORMAT, SitioMeta, SitioSaveState>;

export type SitioDecodeResult =
  | { ok: true; snapshot: SitioSnapshot; meta: SitioMeta; migratedFrom: number | null }
  | { ok: false; errors: SaveError[] };

export function encodeSitioSave(snapshot: SitioSnapshot, savedAt: string): SitioSaveFile {
  const state: SitioSaveState = {
    name: snapshot.name,
    seed: snapshot.seed,
    turn: snapshot.turn,
    coins: snapshot.coins,
    food: snapshot.food,
    wood: snapshot.wood,
    inputStock: snapshot.inputStock,
    seedlings: snapshot.seedlings,
    coffeeBatches: snapshot.coffeeBatches,
    coffeePrice: snapshot.coffeePrice,
    status: snapshot.status,
    yearEvent: snapshot.yearEvent,
    setup: snapshot.setup,
    rng: [...snapshot.rng],
    terrain: bytesToBase64(snapshot.terrain),
    buildings: bytesToBase64(snapshot.buildings),
    coffee: bytesToBase64(snapshot.coffee),
    families: snapshot.families,
    people: snapshot.people,
    sites: snapshot.sites,
    structures: snapshot.structures,
    coffeeLots: snapshot.coffeeLots,
    plantOrders: snapshot.plantOrders,
    roadPlan: snapshot.roadPlan,
    marketCart: snapshot.marketCart,
    history: snapshot.history,
    totals: snapshot.totals,
    lastReport: snapshot.lastReport,
    monthSold: snapshot.monthSold,
    monthRevenue: snapshot.monthRevenue,
    monthExpense: snapshot.monthExpense,
  };
  return encodeEnvelope(
    SITIO_SAVE_FORMAT,
    SITIO_SAVE_VERSION,
    {
      name: snapshot.name,
      seed: snapshot.seed,
      turn: snapshot.turn,
      year: yearOf(snapshot.turn),
      season: seasonOf(snapshot.turn),
      families: snapshot.families.length,
      coins: snapshot.coins,
      savedAt,
    },
    state,
  );
}

function decodeTask(value: unknown): WorkTask | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  switch (value.kind) {
    case 'idle':
      return { kind: 'idle' };
    case 'rest':
      return { kind: 'rest' };
    case 'yard':
      return { kind: 'yard' };
    case 'coffee':
      return { kind: 'coffee' };
    case 'study':
      return { kind: 'study' };
    case 'road':
      return { kind: 'road' };
    case 'roast':
      return { kind: 'roast' };
    case 'plantLot':
      return typeof value.orderId === 'number'
        ? { kind: 'plantLot', orderId: value.orderId }
        : null;
    case 'fertilize':
      return { kind: 'fertilize' };
    case 'limestone':
      return { kind: 'limestone' };
    case 'build':
      return typeof value.siteId === 'number' ? { kind: 'build', siteId: value.siteId } : null;
    case 'plant':
      return typeof value.x === 'number' && typeof value.y === 'number'
        ? { kind: 'plant', x: value.x, y: value.y }
        : null;
    case 'clear':
      return typeof value.x === 'number' && typeof value.y === 'number'
        ? { kind: 'clear', x: value.x, y: value.y }
        : null;
    default:
      return null;
  }
}

function decodePerson(value: unknown): Person | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.age !== 'number' ||
    typeof value.familyId !== 'number' ||
    typeof value.education !== 'boolean' ||
    typeof value.educationProgress !== 'number'
  ) {
    return null;
  }
  const task = decodeTask(value.task);
  const sex = value.sex === 'male' || value.sex === 'female' ? (value.sex as PersonSex) : null;
  if (!task || !sex) return null;
  if (typeof value.outfit !== 'number' || !Number.isInteger(value.outfit) || value.outfit < 0 || value.outfit >= OUTFIT_COUNT) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    age: value.age,
    familyId: value.familyId,
    education: value.education,
    educationProgress: value.educationProgress,
    sex,
    outfit: value.outfit,
    task,
  };
}

function decodeFamily(value: unknown): Family | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.houseX !== 'number' ||
    typeof value.houseY !== 'number' ||
    typeof value.morale !== 'number'
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    houseX: value.houseX,
    houseY: value.houseY,
    morale: value.morale,
  };
}

function decodeSite(value: unknown): Site | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.kind !== 'string' ||
    !isBuildingKind(value.kind) ||
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.w !== 'number' ||
    typeof value.h !== 'number' ||
    typeof value.progress !== 'number' ||
    typeof value.required !== 'number'
  ) {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind as BuildingKind,
    x: value.x,
    y: value.y,
    w: value.w,
    h: value.h,
    progress: value.progress,
    required: value.required,
  };
}

function decodeStructure(value: unknown): Structure | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.kind !== 'string' ||
    (value.kind !== 'sede' && !isBuildingKind(value.kind)) ||
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.w !== 'number' ||
    typeof value.h !== 'number'
  ) {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind,
    x: value.x,
    y: value.y,
    w: value.w,
    h: value.h,
  };
}

function decodeCoffeeLot(value: unknown): CoffeeLot | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.w !== 'number' ||
    typeof value.h !== 'number' ||
    typeof value.fertilized !== 'boolean' ||
    typeof value.limed !== 'boolean'
  ) {
    return null;
  }
  return {
    id: value.id,
    x: value.x,
    y: value.y,
    w: value.w,
    h: value.h,
    fertilized: value.fertilized,
    limed: value.limed,
  };
}

function decodeCoffeeBatch(value: unknown): CoffeeBatch | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    !Number.isInteger(value.id) ||
    (value.lotId !== null && typeof value.lotId !== 'number') ||
    typeof value.grade !== 'string' ||
    !COFFEE_GRADES.includes(value.grade as CoffeeBatch['grade']) ||
    typeof value.amount !== 'number' ||
    !Number.isFinite(value.amount) ||
    value.amount <= 0 ||
    typeof value.stage !== 'string' ||
    !COFFEE_STAGES.includes(value.stage as CoffeeBatch['stage']) ||
    typeof value.storage !== 'string' ||
    !COFFEE_STORAGES.includes(value.storage as CoffeeBatch['storage']) ||
    typeof value.ageMonths !== 'number' ||
    !Number.isInteger(value.ageMonths) ||
    value.ageMonths < 0
  ) {
    return null;
  }
  return {
    id: value.id,
    lotId: value.lotId,
    grade: value.grade as CoffeeBatch['grade'],
    amount: value.amount,
    stage: value.stage as CoffeeBatch['stage'],
    storage: value.storage as CoffeeBatch['storage'],
    ageMonths: value.ageMonths,
  };
}

function decodeCoffeeSale(value: unknown): CoffeeSale | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.batchId !== 'number' ||
    !Number.isInteger(value.batchId) ||
    typeof value.amount !== 'number' ||
    !Number.isInteger(value.amount) ||
    value.amount <= 0
  ) {
    return null;
  }
  return { batchId: value.batchId, amount: value.amount };
}

function decodeGrades(value: unknown): CoffeeGrades | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.bad !== 'number' ||
    typeof value.medium !== 'number' ||
    typeof value.good !== 'number'
  ) {
    return null;
  }
  return { bad: value.bad, medium: value.medium, good: value.good };
}

function decodeInputs(value: unknown): InputStock | null {
  if (!isRecord(value)) return null;
  if (typeof value.fertilizer !== 'number' || typeof value.limestone !== 'number') {
    return null;
  }
  return { fertilizer: value.fertilizer, limestone: value.limestone };
}

function decodeRoadPlan(value: unknown): { x: number; y: number }[] | null {
  if (!Array.isArray(value)) return null;
  const plan: { x: number; y: number }[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.x !== 'number' || typeof entry.y !== 'number') {
      return null;
    }
    plan.push({ x: entry.x, y: entry.y });
  }
  return plan;
}

function decodePlantOrder(value: unknown): CoffeePlantOrder | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'number' ||
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    typeof value.w !== 'number' ||
    typeof value.h !== 'number' ||
    typeof value.progress !== 'number' ||
    typeof value.required !== 'number'
  ) {
    return null;
  }
  return {
    id: value.id,
    x: value.x,
    y: value.y,
    w: value.w,
    h: value.h,
    progress: value.progress,
    required: value.required,
  };
}

function decodeMarketCart(value: unknown): MarketCart | null {
  if (!isRecord(value)) return null;
  const fields = ['wood', 'fertilizer', 'limestone', 'seedlings', 'food'] as const;
  for (const field of fields) if (typeof value[field] !== 'number') return null;
  if (!Array.isArray(value.coffee)) return null;
  const coffee: CoffeeSale[] = [];
  for (const entry of value.coffee) {
    const sale = decodeCoffeeSale(entry);
    if (!sale) return null;
    coffee.push(sale);
  }
  return {
    wood: value.wood as number,
    fertilizer: value.fertilizer as number,
    limestone: value.limestone as number,
    seedlings: value.seedlings as number,
    food: value.food as number,
    coffee,
  };
}

function decodeHistory(value: unknown): MonthHistoryPoint[] | null {
  if (!Array.isArray(value)) return null;
  const points: MonthHistoryPoint[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.turn !== 'number' ||
      typeof entry.month !== 'number' ||
      typeof entry.year !== 'number' ||
      typeof entry.season !== 'string' ||
      typeof entry.coins !== 'number' ||
      typeof entry.income !== 'number' ||
      typeof entry.expenses !== 'number'
    ) {
      return null;
    }
    const harvest = decodeGrades(entry.harvest);
    const stock = decodeGrades(entry.stock);
    if (!harvest || !stock) return null;
    points.push({
      turn: entry.turn,
      month: entry.month,
      year: entry.year,
      season: entry.season as MonthHistoryPoint['season'],
      coins: entry.coins,
      income: entry.income,
      expenses: entry.expenses,
      harvest,
      stock,
    });
  }
  return points;
}

function decodeSetup(value: unknown): SetupStep | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return STARTERS.includes(value as StarterKind) ? (value as SetupStep) : undefined;
}

function decodeTotals(value: unknown): SitioTotals | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.harvestTotal !== 'number' ||
    typeof value.revenueTotal !== 'number' ||
    typeof value.builtTotal !== 'number' ||
    typeof value.arrivalsTotal !== 'number' ||
    typeof value.departuresTotal !== 'number'
  ) {
    return null;
  }
  return {
    harvestTotal: value.harvestTotal,
    revenueTotal: value.revenueTotal,
    builtTotal: value.builtTotal,
    arrivalsTotal: value.arrivalsTotal,
    departuresTotal: value.departuresTotal,
  };
}

function decodeReport(value: unknown): SeasonReport | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (
    typeof value.turn !== 'number' ||
    typeof value.month !== 'number' ||
    typeof value.year !== 'number' ||
    typeof value.season !== 'string' ||
    typeof value.harvest !== 'number' ||
    typeof value.lost !== 'number' ||
    typeof value.sold !== 'number' ||
    typeof value.stock !== 'number' ||
    typeof value.dried !== 'number' ||
    typeof value.spoiled !== 'number' ||
    typeof value.roasted !== 'number' ||
    typeof value.roastWood !== 'number' ||
    typeof value.dryingStock !== 'number' ||
    typeof value.dryStock !== 'number' ||
    typeof value.roastedStock !== 'number' ||
    typeof value.revenue !== 'number' ||
    typeof value.price !== 'number' ||
    typeof value.foodProduced !== 'number' ||
    typeof value.foodConsumed !== 'number' ||
    typeof value.foodBought !== 'number' ||
    typeof value.foodSold !== 'number' ||
    typeof value.foodWasted !== 'number' ||
    typeof value.restBonus !== 'number' ||
    typeof value.planted !== 'number' ||
    typeof value.cleared !== 'number' ||
    typeof value.studied !== 'number' ||
    typeof value.educated !== 'number' ||
    typeof value.roads !== 'number' ||
    typeof value.fertilized !== 'number' ||
    typeof value.limed !== 'number' ||
    !isRecord(value.harvestGrades) ||
    typeof value.harvestGrades.bad !== 'number' ||
    typeof value.harvestGrades.medium !== 'number' ||
    typeof value.harvestGrades.good !== 'number' ||
    typeof value.arrivals !== 'number' ||
    typeof value.departures !== 'number' ||
    typeof value.stalledCoffee !== 'number' ||
    !Array.isArray(value.completed) ||
    !Array.isArray(value.morale) ||
    typeof value.hunger !== 'boolean'
  ) {
    return undefined;
  }
  if (value.season !== 'spring' && value.season !== 'summer' && value.season !== 'autumn' && value.season !== 'winter') {
    return undefined;
  }
  const event = typeof value.event === 'string' ? value.event : 'none';
  if (!EVENTS.includes(event as YearEvent)) return undefined;
  return value as unknown as SeasonReport;
}

function invalid(detail: string): { ok: false; errors: SaveError[] } {
  return { ok: false, errors: [{ code: 'INVALID', detail }] };
}

export function decodeSitioSave(text: string): SitioDecodeResult {
  const decoded = decodeEnvelope(text, {
    format: SITIO_SAVE_FORMAT,
    currentVersion: SITIO_SAVE_VERSION,

  });
  if (!decoded.ok) return decoded;
  const raw = decoded.file.state;
  if (!isRecord(raw)) return invalid('state');
  if (
    typeof raw.name !== 'string' ||
    typeof raw.seed !== 'string' ||
    typeof raw.turn !== 'number' ||
    !Number.isInteger(raw.turn) ||
    raw.turn < 0 ||
    raw.turn > FINAL_TURN ||
    typeof raw.coins !== 'number' ||
    typeof raw.food !== 'number' ||
    typeof raw.wood !== 'number' ||
    !isRecord(raw.inputStock) ||
    typeof raw.inputStock.fertilizer !== 'number' ||
    typeof raw.inputStock.limestone !== 'number' ||
    typeof raw.seedlings !== 'number' ||
    !Array.isArray(raw.coffeeBatches) ||
    typeof raw.coffeePrice !== 'number' ||
    typeof raw.status !== 'string' ||
    !STATUSES.includes(raw.status as SitioStatus) ||
    (raw.setup !== null && typeof raw.setup !== 'string') ||
    typeof raw.yearEvent !== 'string' ||
    !EVENTS.includes(raw.yearEvent as YearEvent) ||
    !Array.isArray(raw.rng) ||
    raw.rng.length !== 4 ||
    raw.rng.some((value) => typeof value !== 'number') ||
    typeof raw.terrain !== 'string' ||
    typeof raw.buildings !== 'string' ||
    typeof raw.coffee !== 'string' ||
    !Array.isArray(raw.families) ||
    !Array.isArray(raw.people) ||
    !Array.isArray(raw.sites) ||
    !Array.isArray(raw.structures) ||
    !Array.isArray(raw.coffeeLots) ||
    !Array.isArray(raw.plantOrders) ||
    !Array.isArray(raw.roadPlan) ||
    !isRecord(raw.marketCart) ||
    !Array.isArray(raw.history) ||
    typeof raw.monthSold !== 'number' ||
    typeof raw.monthRevenue !== 'number' ||
    typeof raw.monthExpense !== 'number'
  ) {
    return invalid('state: header');
  }

  const setup = decodeSetup(raw.setup);
  if (setup === undefined) return invalid('state.setup');

  const cells = SITIO_SIZE * SITIO_SIZE;
  let terrain: Uint8Array;
  let buildings: Uint8Array;
  let coffee: Uint8Array;
  try {
    terrain = base64ToBytes(raw.terrain);
    buildings = base64ToBytes(raw.buildings);
    coffee = base64ToBytes(raw.coffee);
  } catch {
    return invalid('state: tiles: invalid base64');
  }
  if (terrain.length !== cells || buildings.length !== cells || coffee.length !== cells) {
    return invalid('state: tiles: length');
  }

  const families: Family[] = [];
  for (const entry of raw.families) {
    const family = decodeFamily(entry);
    if (!family) return invalid('state.families');
    families.push(family);
  }
  const people: Person[] = [];
  for (const entry of raw.people) {
    const person = decodePerson(entry);
    if (!person) return invalid('state.people');
    people.push(person);
  }
  const sites: Site[] = [];
  for (const entry of raw.sites) {
    const site = decodeSite(entry);
    if (!site) return invalid('state.sites');
    sites.push(site);
  }
  const structures: Structure[] = [];
  for (const entry of raw.structures) {
    const structure = decodeStructure(entry);
    if (!structure) return invalid('state.structures');
    structures.push(structure);
  }
  const coffeeLots: CoffeeLot[] = [];
  for (const entry of raw.coffeeLots) {
    const lot = decodeCoffeeLot(entry);
    if (!lot) return invalid('state.coffeeLots');
    coffeeLots.push(lot);
  }
  const plantOrders: CoffeePlantOrder[] = [];
  for (const entry of raw.plantOrders) {
    const order = decodePlantOrder(entry);
    if (!order) return invalid('state.plantOrders');
    plantOrders.push(order);
  }
  const coffeeBatches: CoffeeBatch[] = [];
  for (const entry of raw.coffeeBatches) {
    const batch = decodeCoffeeBatch(entry);
    if (!batch) return invalid('state.coffeeBatches');
    coffeeBatches.push(batch);
  }
  const history = decodeHistory(raw.history);
  if (!history) return invalid('state.history');
  const totals = decodeTotals(raw.totals);
  if (!totals) return invalid('state.totals');
  const inputStock = decodeInputs(raw.inputStock);
  if (!inputStock) return invalid('state.inputStock');
  const roadPlan = decodeRoadPlan(raw.roadPlan);
  if (!roadPlan) return invalid('state.roadPlan');
  const marketCart = decodeMarketCart(raw.marketCart);
  if (!marketCart) return invalid('state.marketCart');
  const lastReport = decodeReport(raw.lastReport);
  if (lastReport === undefined) return invalid('state.lastReport');

  const snapshot: SitioSnapshot = {
    name: raw.name,
    seed: raw.seed,
    turn: raw.turn,
    coins: raw.coins,
    food: raw.food,
    wood: raw.wood,
    inputStock,
    seedlings: raw.seedlings,
    coffeeBatches,
    coffeePrice: raw.coffeePrice,
    status: raw.status as SitioStatus,
    yearEvent: raw.yearEvent as YearEvent,
    setup,
    rng: raw.rng.map((value) => (typeof value === 'number' ? value : 0)) as [
      number,
      number,
      number,
      number,
    ],
    terrain,
    buildings,
    coffee,
    families,
    people,
    sites,
    structures,
    coffeeLots,
    plantOrders,
    roadPlan,
    marketCart,
    history,
    totals,
    lastReport,
    monthSold: raw.monthSold,
    monthRevenue: raw.monthRevenue,
    monthExpense: raw.monthExpense,
  };
  const envelopeMeta = isRecord(decoded.file.meta) ? decoded.file.meta : {};
  const meta: SitioMeta = {
    name: snapshot.name,
    seed: snapshot.seed,
    turn: snapshot.turn,
    year: yearOf(snapshot.turn),
    season: seasonOf(snapshot.turn),
    families: snapshot.families.length,
    coins: snapshot.coins,
    savedAt: typeof envelopeMeta.savedAt === 'string' ? envelopeMeta.savedAt : '',
  };
  return { ok: true, snapshot, meta, migratedFrom: decoded.migratedFrom };
}
