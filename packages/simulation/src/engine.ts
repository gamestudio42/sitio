import { Fnv1a, Rng, type RngState } from '@sitio/kernel';
import {
  ARRIVAL_REPUTATION,
  BUILDING_IDS,
  BUILDING_NONE,
  BUILDING_SEDE,
  BUILDING_SPECS,
  COFFEE_BASE_PRICE,
  COFFEE_CELLS_PER_PERIOD,
  COFFEE_DRY_MONTHS,
  COFFEE_FORMING,
  COFFEE_GRADES,
  COFFEE_GROWING,
  COFFEE_LOT_SEEDLINGS,
  COFFEE_MATURE,
  COFFEE_MAX_DRY_MONTHS,
  COFFEE_MUDA,
  COFFEE_NONE,
  COFFEE_PES_PER_CELL,
  COFFEE_PLANT_PERIODS,
  COFFEE_QUALITY_BASE,
  EDUCATION_PERIODS,
  FAMILY_NAMES,
  FAMILY_NEED,
  FERTILIZER_QUALITY_BONUS,
  FINAL_TURN,
  FAMILY_INVITE_COST,
  FOOD_CAP,
  FOOD_SELL_PRICE,
  FROST_LOSS,
  HARVEST_YIELD,
  INPUT_PRICES,
  LIMESTONE_QUALITY_BONUS,
  MORALE_MAX,
  MORALE_START,
  OUTFIT_COUNT,
  REST_BONUS,
  PERSON_NAMES,
  ROAD_TILES_PER_MONTH,
  SCHOOL_AGE,
  SEEDLING_BUNDLE_SIZE,
  SEEDLING_BUNDLE_PRICE,
  SITIO_SIZE,
  START_COINS,
  START_FOOD,
  START_WOOD,
  STARTER_FOOTPRINTS,
  TERRAIN_MATA,
  TERRAIN_ROAD,
  TERRAIN_TERRA,
  TERREIRO_LOT_SLOTS,
  TULHA_CAPACITY,
  TURNS_PER_YEAR,
  MONTHS_PER_SEASON,
  WIN_FAMILIES,
  WOOD_BUY_PRICE,
  WOOD_PER_CLEAR,
  PERIODS_PER_MONTH_TASK,
  YARD_FOOD_PER_PERIOD,
  coffeeBatchValue,
  demolishRecovery,
  footprintOfBuilding,
  seasonOf,
  monthOfSeason,
  monthOfYear,
  yearOf,
  type BuildingKind,
  type CoffeeBatch,
  type CoffeeGrade,
  type CoffeeGrades,
  type CoffeeLot,
  type CoffeeSale,
  type CoffeePlantOrder,
  type Family,
  type InputKind,
  type InputStock,
  type MarketCart,
  type NewSitioOptions,
  type Person,
  type PersonSex,
  type Season,
  type SeasonReport,
  type SetupStep,
  type Site,
  type SitioCommand,
  type SitioCommandReason,
  type SitioCommandResult,
  type SitioFullState,
  type SitioMeta,
  type SitioSnapshot,
  type SitioStats,
  type SitioStatus,
  type SitioTotals,
  type StarterKind,
  type StarterPreviewResult,
  type Structure,
  type WorkTask,
  type MonthHistoryPoint,
  type YearEvent,
} from './types';

const START_ROADS: [number, number][] = [];
for (let x = 0; x < SITIO_SIZE; x++) START_ROADS.push([x, 12]);
for (let y = 4; y < 12; y++) START_ROADS.push([12, y]);
for (let y = 8; y < 12; y++) START_ROADS.push([18, y]);

const MATA_PATCH: [number, number][] = [];
for (let y = 18; y <= 22; y++) {
  for (let x = 18; x <= 22; x++) MATA_PATCH.push([x, y]);
  for (let x = 1; x <= 4; x++) MATA_PATCH.push([x, y]);
}
for (let y = 2; y <= 4; y++) {
  for (let x = 15; x <= 17; x++) MATA_PATCH.push([x, y]);
}

function cloneTask(task: WorkTask): WorkTask {
  switch (task.kind) {
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
      return { kind: 'plantLot', orderId: task.orderId };
    case 'fertilize':
      return { kind: 'fertilize' };
    case 'limestone':
      return { kind: 'limestone' };
    case 'build':
      return { kind: 'build', siteId: task.siteId };
    case 'plant':
      return { kind: 'plant', x: task.x, y: task.y };
    case 'clear':
      return { kind: 'clear', x: task.x, y: task.y };
  }
}

function cloneFamily(family: Family): Family {
  return { ...family };
}

function clonePerson(person: Person): Person {
  return {
    ...person,
    task: cloneTask(person.task),
  };
}

function cloneSite(site: Site): Site {
  return { ...site };
}

function cloneStructure(structure: Structure): Structure {
  return { ...structure };
}

function cloneCoffeeLot(lot: CoffeeLot): CoffeeLot {
  return { ...lot };
}

function cloneCoffeeBatch(batch: CoffeeBatch): CoffeeBatch {
  return { ...batch };
}

function cloneCoffeeSale(sale: CoffeeSale): CoffeeSale {
  return { ...sale };
}

function cloneReport(report: SeasonReport | null): SeasonReport | null {
  if (!report) return null;
  return {
    ...report,
    completed: [...report.completed],
    morale: report.morale.map((entry) => ({ ...entry })),
    harvestGrades: cloneGrades(report.harvestGrades),
  };
}

function emptyGrades(): CoffeeGrades {
  return { bad: 0, medium: 0, good: 0 };
}

function cloneGrades(grades: CoffeeGrades): CoffeeGrades {
  return { bad: grades.bad, medium: grades.medium, good: grades.good };
}

const FEMALE_NAMES = new Set([
  'Maria',
  'Ana',
  'Rita',
  'Clara',
  'Lúcia',
  'Helena',
  'Teresa',
  'Inês',
  'Beatriz',
  'Sofia',
]);

function sexFromName(name: string): PersonSex {
  return FEMALE_NAMES.has(name) ? 'female' : 'male';
}
function emptyInputs(): InputStock {
  return { fertilizer: 0, limestone: 0 };
}

function emptyMarketCart(): MarketCart {
  return {
    wood: 0,
    fertilizer: 0,
    limestone: 0,
    seedlings: 0,
    food: 0,
    coffee: [],
  };
}

function emptyTotals(): SitioTotals {
  return {
    harvestTotal: 0,
    revenueTotal: 0,
    builtTotal: 0,
    arrivalsTotal: 0,
    departuresTotal: 0,
  };
}

function isStarterKind(value: string): value is StarterKind {
  return value === 'sede' || value === 'house' || value === 'terreiro' || value === 'coffee';
}

function landscape(): Uint8Array {
  const cells = SITIO_SIZE * SITIO_SIZE;
  const terrain = new Uint8Array(cells);
  for (let x = 0; x < SITIO_SIZE; x++) terrain[x] = TERRAIN_MATA;
  for (let y = 0; y < SITIO_SIZE; y++) terrain[y * SITIO_SIZE + SITIO_SIZE - 1] = TERRAIN_MATA;
  for (const [x, y] of MATA_PATCH) terrain[y * SITIO_SIZE + x] = TERRAIN_MATA;
  for (const [x, y] of START_ROADS) terrain[y * SITIO_SIZE + x] = TERRAIN_ROAD;
  return terrain;
}

export class SitioEngine {
  name: string;
  seed: string;
  turn = 0;
  coins = START_COINS;
  food = START_FOOD;
  wood = START_WOOD;
  inputStock: InputStock = emptyInputs();
  seedlings = 0;
  coffeeBatches: CoffeeBatch[] = [];
  coffeePrice = COFFEE_BASE_PRICE;
  status: SitioStatus = 'playing';
  setup: SetupStep | null = 'sede';
  yearEvent: YearEvent = 'none';
  terrain: Uint8Array = new Uint8Array(0);
  buildings: Uint8Array = new Uint8Array(0);
  coffee: Uint8Array = new Uint8Array(0);
  families: Family[] = [];
  people: Person[] = [];
  sites: Site[] = [];
  structures: Structure[] = [];
  coffeeLots: CoffeeLot[] = [];
  plantOrders: CoffeePlantOrder[] = [];
  roadPlan: { x: number; y: number }[] = [];
  marketCart: MarketCart = emptyMarketCart();
  history: MonthHistoryPoint[] = [];
  totals: SitioTotals = emptyTotals();
  lastReport: SeasonReport | null = null;
  monthSold = 0;
  monthRevenue = 0;
  monthExpense = 0;
  readonly rng: Rng;
  private nextFamilyId = 1;
  private nextPersonId = 1;
  private nextSiteId = 1;
  private nextStructureId = 1;
  private nextCoffeeLotId = 1;
  private nextCoffeeBatchId = 1;
  private nextPlantOrderId = 1;

  private constructor(name: string, seed: string, rng: Rng) {
    this.name = name;
    this.seed = seed;
    this.rng = rng;
  }

  static create(options: NewSitioOptions): SitioEngine {
    const engine = new SitioEngine(
      options.name || 'Sítio',
      options.seed || 'sitio',
      Rng.fromSeed(options.seed || 'sitio'),
    );
    engine.terrain = landscape();
    engine.buildings = new Uint8Array(SITIO_SIZE * SITIO_SIZE);
    engine.coffee = new Uint8Array(SITIO_SIZE * SITIO_SIZE);
    engine.coins = START_COINS;
    engine.food = START_FOOD;
    engine.setup = 'sede';
    if (options.preset === 'test') engine.setupTestFarm();
    return engine;
  }

  private addTestStructure(
    kind: BuildingKind | 'sede',
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const id = kind === 'sede' ? BUILDING_SEDE : BUILDING_IDS[kind];
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.buildings[this.index(xx, yy)] = id;
      }
    }
    this.structures.push({ id: this.nextStructureId++, kind, x, y, w, h });
  }

  private addTestLot(x: number, y: number, stage: number): CoffeeLot {
    const lot: CoffeeLot = {
      id: this.nextCoffeeLotId++,
      x,
      y,
      w: 4,
      h: 2,
      fertilized: false,
      limed: false,
    };
    this.coffeeLots.push(lot);
    for (let yy = y; yy < y + lot.h; yy++) {
      for (let xx = x; xx < x + lot.w; xx++) {
        this.coffee[this.index(xx, yy)] = stage;
      }
    }
    return lot;
  }

  private setupTestFarm(): void {
    this.setup = null;
    this.turn = 8;
    this.coins = 60;
    this.food = 40;
    this.wood = 40;
    this.inputStock = { fertilizer: 20, limestone: 20 };
    this.seedlings = 64;
    this.coffeePrice = 3;
    this.yearEvent = 'none';
    this.status = 'playing';
    this.lastReport = null;
    this.history = [];
    this.marketCart = emptyMarketCart();
    this.sites = [];
    this.roadPlan = [
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
    ];

    this.addTestStructure('sede', 6, 2, 3, 2);
    const houses: [number, number][] = [
      [3, 5],
      [1, 5],
      [2, 8],
      [5, 9],
      [8, 9],
      [10, 5],
    ];
    for (const [x, y] of houses) this.addTestStructure('house', x, y, 2, 2);
    this.addTestStructure('terreiro', 10, 9, 2, 2);
    this.addTestStructure('tulha', 12, 1, 3, 3);
    this.addTestStructure('forno', 16, 5, 2, 2);
    this.addTestStructure('venda', 4, 8, 2, 1);
    this.addTestStructure('escola', 20, 5, 2, 2);
    this.addTestStructure('capela', 20, 8, 1, 2);

    const lots = [
      this.addTestLot(6, 6, COFFEE_MATURE),
      this.addTestLot(1, 14, COFFEE_GROWING),
      this.addTestLot(14, 14, COFFEE_MUDA),
    ];
    if (lots[0]) lots[0].fertilized = true;
    if (lots[1]) lots[1].limed = true;

    const first = houses[0];
    if (first) this.createInitialFamily(first[0], first[1]);
    for (let index = 1; index < houses.length; index++) {
      const house = houses[index];
      if (house) this.createFamilyAt(house[0], house[1]);
    }

    const work: WorkTask[] = [
      { kind: 'roast' },
      { kind: 'coffee' },
      { kind: 'yard' },
      { kind: 'rest' },
      { kind: 'road' },
      { kind: 'coffee' },
      { kind: 'yard' },
      { kind: 'idle' },
      { kind: 'coffee' },
      { kind: 'yard' },
      { kind: 'rest' },
      { kind: 'yard' },
    ];
    let index = 0;
    for (const person of this.people) {
      if (person.age < 16) continue;
      person.task = cloneTask(work[index] ?? { kind: 'yard' });
      index++;
    }
    const student = this.people.find((person) => person.age < 16);
    if (student) student.task = { kind: 'study' };

    const lot = lots[0];
    if (!lot) return;
    this.coffeeBatches.push(
      {
        id: this.nextCoffeeBatchId++,
        lotId: lot.id,
        grade: 'medium',
        amount: 12,
        stage: 'drying',
        storage: 'terreiro',
        ageMonths: 0,
      },
      {
        id: this.nextCoffeeBatchId++,
        lotId: lot.id,
        grade: 'medium',
        amount: 10,
        stage: 'dry',
        storage: 'terreiro',
        ageMonths: 1,
      },
      {
        id: this.nextCoffeeBatchId++,
        lotId: lots[1]?.id ?? lot.id,
        grade: 'good',
        amount: 8,
        stage: 'dry',
        storage: 'tulha',
        ageMonths: 0,
      },
      {
        id: this.nextCoffeeBatchId++,
        lotId: lot.id,
        grade: 'good',
        amount: 6,
        stage: 'roasted',
        storage: 'forno',
        ageMonths: 0,
      },
    );
  }

  static fromSnapshot(snapshot: SitioSnapshot): SitioEngine {
    const engine = new SitioEngine(snapshot.name, snapshot.seed, new Rng(snapshot.rng));
    engine.turn = snapshot.turn;
    engine.coins = snapshot.coins;
    engine.food = snapshot.food;
    engine.wood = snapshot.wood;
    engine.inputStock = { ...snapshot.inputStock };
    engine.seedlings = snapshot.seedlings;
    engine.coffeeBatches = (snapshot.coffeeBatches ?? []).map(cloneCoffeeBatch);
    engine.coffeePrice = snapshot.coffeePrice;
    engine.status = snapshot.status;
    engine.setup = snapshot.setup ?? null;
    engine.yearEvent = snapshot.yearEvent;
    engine.terrain = snapshot.terrain.slice();
    engine.buildings = snapshot.buildings.slice();
    engine.coffee = snapshot.coffee.slice();
    engine.families = snapshot.families.map(cloneFamily);
    engine.people = (snapshot.people ?? []).map(clonePerson);
    engine.sites = snapshot.sites.map(cloneSite);
    engine.structures = (snapshot.structures ?? []).map(cloneStructure);
    engine.coffeeLots = (snapshot.coffeeLots ?? []).map(cloneCoffeeLot);
    engine.plantOrders = (snapshot.plantOrders ?? []).map((order) => ({ ...order }));
    engine.roadPlan = (snapshot.roadPlan ?? []).map((tile) => ({ ...tile }));
    engine.marketCart = {
      ...emptyMarketCart(),
      ...(snapshot.marketCart ?? {}),
      coffee: (snapshot.marketCart?.coffee ?? []).map(cloneCoffeeSale),
    };
    engine.history = (snapshot.history ?? []).map((point) => ({
      ...point,
      harvest: cloneGrades(point.harvest),
      stock: cloneGrades(point.stock),
    }));
    engine.monthExpense = snapshot.monthExpense ?? 0;
    engine.totals = { ...snapshot.totals };
    engine.lastReport = cloneReport(snapshot.lastReport);
    engine.monthSold = snapshot.monthSold ?? 0;
    engine.monthRevenue = snapshot.monthRevenue ?? 0;
    let maxFamily = 0;
    for (const family of engine.families) maxFamily = Math.max(maxFamily, family.id);
    engine.nextFamilyId = maxFamily + 1;
    let maxPerson = 0;
    for (const person of engine.people) maxPerson = Math.max(maxPerson, person.id);
    engine.nextPersonId = maxPerson + 1;
    let maxSite = 0;
    for (const site of engine.sites) maxSite = Math.max(maxSite, site.id);
    engine.nextSiteId = maxSite + 1;
    let maxStructure = 0;
    for (const structure of engine.structures) {
      maxStructure = Math.max(maxStructure, structure.id);
    }
    engine.nextStructureId = maxStructure + 1;
    let maxLot = 0;
    for (const lot of engine.coffeeLots) maxLot = Math.max(maxLot, lot.id);
    engine.nextCoffeeLotId = maxLot + 1;
    let maxBatch = 0;
    for (const batch of engine.coffeeBatches) maxBatch = Math.max(maxBatch, batch.id);
    engine.nextCoffeeBatchId = maxBatch + 1;
    let maxOrder = 0;
    for (const order of engine.plantOrders) maxOrder = Math.max(maxOrder, order.id);
    engine.nextPlantOrderId = maxOrder + 1;
    return engine;
  }

  get season(): Season {
    return seasonOf(this.turn);
  }

  get year(): number {
    return yearOf(this.turn);
  }

  get month(): number {
    return this.turn + 1;
  }

  get monthOfSeason(): number {
    return monthOfSeason(this.turn);
  }

  get monthOfYear(): number {
    return monthOfYear(this.turn);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < SITIO_SIZE && y < SITIO_SIZE;
  }

  index(x: number, y: number): number {
    return y * SITIO_SIZE + x;
  }

  buildingAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) return BUILDING_NONE;
    return this.buildings[this.index(x, y)] ?? BUILDING_NONE;
  }

  coffeeAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) return COFFEE_NONE;
    return this.coffee[this.index(x, y)] ?? COFFEE_NONE;
  }

  familyById(id: number): Family | null {
    return this.families.find((family) => family.id === id) ?? null;
  }

  personById(id: number): Person | null {
    return this.people.find((person) => person.id === id) ?? null;
  }

  familyMembers(familyId: number): Person[] {
    return this.people.filter((person) => person.familyId === familyId);
  }

  siteById(id: number): Site | null {
    return this.sites.find((site) => site.id === id) ?? null;
  }

  siteAt(x: number, y: number): Site | null {
    return this.sites.find((site) => this.siteCovers(site, x, y)) ?? null;
  }

  structureById(id: number): Structure | null {
    return this.structures.find((structure) => structure.id === id) ?? null;
  }

  structureAt(x: number, y: number): Structure | null {
    return (
      this.structures.find(
        (structure) =>
          x >= structure.x &&
          y >= structure.y &&
          x < structure.x + structure.w &&
          y < structure.y + structure.h,
      ) ?? null
    );
  }

  private siteCovers(site: Site, x: number, y: number): boolean {
    return (
      x >= site.x &&
      y >= site.y &&
      x < site.x + site.w &&
      y < site.y + site.h
    );
  }

  reputation(): number {
    let value = 1;
    if (this.hasBuilding('capela')) value++;
    if (this.hasBuilding('escola')) value++;
    if (this.hasBuilding('venda')) value++;
    return value;
  }

  salePrice(): number {
    return this.coffeePrice + (this.hasBuilding('venda') ? 1 : 0);
  }

  priceForGrade(grade: CoffeeGrade): number {
    const base = this.salePrice();
    if (grade === 'bad') return Math.max(1, base - 1);
    if (grade === 'good') return base + 1;
    return base;
  }

  coffeePriceForBatch(batch: Pick<CoffeeBatch, 'grade' | 'stage' | 'ageMonths'>): number {
    return coffeeBatchValue(batch, this.salePrice());
  }

  coffeeSaleAvailable(batchId: number): number {
    const batch = this.coffeeBatches.find((entry) => entry.id === batchId);
    if (!batch) return 0;
    const reserved = this.marketCart.coffee
      .filter((sale) => sale.batchId === batchId)
      .reduce((sum, sale) => sum + sale.amount, 0);
    return Math.max(0, batch.amount - reserved);
  }

  oldestDryBatch(): CoffeeBatch | null {
    let oldest: CoffeeBatch | null = null;
    for (const batch of this.coffeeBatches) {
      if (batch.stage !== 'dry') continue;
      if (
        !oldest ||
        batch.ageMonths > oldest.ageMonths ||
        (batch.ageMonths === oldest.ageMonths && batch.id < oldest.id)
      ) {
        oldest = batch;
      }
    }
    return oldest;
  }

  terreiroSlots(): number {
    return (
      this.structures.filter((structure) => structure.kind === 'terreiro').length *
      TERREIRO_LOT_SLOTS
    );
  }

  terreiroUsed(): number {
    return this.coffeeBatches.filter((batch) => batch.storage === 'terreiro').length;
  }

  tulhaCapacity(): number {
    return TULHA_CAPACITY;
  }

  tulhaUsed(): number {
    return this.coffeeBatches
      .filter((batch) => batch.storage === 'tulha')
      .reduce((sum, batch) => sum + batch.amount, 0);
  }

  coffeeDrying(): number {
    return this.coffeeBatches
      .filter((batch) => batch.stage === 'drying')
      .reduce((sum, batch) => sum + batch.amount, 0);
  }

  coffeeDry(): number {
    return this.coffeeBatches
      .filter((batch) => batch.stage === 'dry')
      .reduce((sum, batch) => sum + batch.amount, 0);
  }

  coffeeRoasted(): number {
    return this.coffeeBatches
      .filter((batch) => batch.stage === 'roasted')
      .reduce((sum, batch) => sum + batch.amount, 0);
  }

  coffeeStock(): number {
    return this.coffeeBatches
      .filter((batch) => batch.stage === 'dry' || batch.stage === 'roasted')
      .reduce((sum, batch) => sum + batch.amount, 0);
  }

  coffeeGrades(): CoffeeGrades {
    const grades = emptyGrades();
    for (const batch of this.coffeeBatches) {
      if (batch.stage !== 'dry' && batch.stage !== 'roasted') continue;
      grades[batch.grade] += batch.amount;
    }
    return grades;
  }

  lotQuality(lot: CoffeeLot): number {
    return (
      COFFEE_QUALITY_BASE +
      (lot.fertilized ? FERTILIZER_QUALITY_BONUS : 0) +
      (lot.limed ? LIMESTONE_QUALITY_BONUS : 0)
    );
  }

  gradeForQuality(quality: number): CoffeeGrade {
    if (quality < 50) return 'bad';
    if (quality < 70) return 'medium';
    return 'good';
  }

  lotAt(x: number, y: number): CoffeeLot | null {
    return (
      this.coffeeLots.find(
        (lot) => x >= lot.x && y >= lot.y && x < lot.x + lot.w && y < lot.y + lot.h,
      ) ?? null
    );
  }

  canPlanRoad(x: number, y: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    if (!this.inBounds(x, y)) return { ok: false, reason: 'oob' };
    if (this.terrain[this.index(x, y)] === TERRAIN_ROAD) {
      return { ok: false, reason: 'road' };
    }
    if (this.terrain[this.index(x, y)] !== TERRAIN_TERRA) {
      return { ok: false, reason: 'mata' };
    }
    if (this.buildingAt(x, y) !== BUILDING_NONE) {
      return { ok: false, reason: 'occupied' };
    }
    if (this.coffeeAt(x, y) !== COFFEE_NONE) {
      return { ok: false, reason: 'occupied' };
    }
    if (this.siteAt(x, y)) return { ok: false, reason: 'occupied' };
    if (this.roadPlan.some((tile) => tile.x === x && tile.y === y)) {
      return { ok: false, reason: 'occupied' };
    }
    return { ok: true };
  }

  planRoad(x: number, y: number): SitioCommandResult {
    const check = this.canPlanRoad(x, y);
    if (!check.ok) return check;
    this.roadPlan.push({ x, y });
    return { ok: true };
  }

  clearRoadPlan(): SitioCommandResult {
    this.roadPlan = [];
    return { ok: true };
  }

  private marketCost(): number {
    return (
      this.marketCart.wood * WOOD_BUY_PRICE +
      this.marketCart.fertilizer * INPUT_PRICES.fertilizer +
      this.marketCart.limestone * INPUT_PRICES.limestone +
      (this.marketCart.seedlings / SEEDLING_BUNDLE_SIZE) * SEEDLING_BUNDLE_PRICE
    );
  }

  private marketRevenue(): number {
    let revenue = this.marketCart.food * FOOD_SELL_PRICE;
    for (const sale of this.marketCart.coffee) {
      const batch = this.coffeeBatches.find((entry) => entry.id === sale.batchId);
      if (!batch) continue;
      revenue += sale.amount * this.coffeePriceForBatch(batch);
    }
    return revenue;
  }

  private availableCoins(): number {
    return this.coins + this.marketRevenue() - this.marketCost();
  }

  private canQueueCost(cost: number): boolean {
    return this.availableCoins() >= cost;
  }

  buyInput(kind: InputKind, amount: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid-amount' };
    }
    const price = INPUT_PRICES[kind];
    if (!price || !this.canQueueCost(price * amount)) {
      return { ok: false, reason: price ? 'no-coins' : 'invalid-task' };
    }
    this.marketCart[kind] += amount;
    return { ok: true };
  }

  buySeedlings(amount: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    if (!Number.isInteger(amount) || amount <= 0 || amount % SEEDLING_BUNDLE_SIZE !== 0) {
      return { ok: false, reason: 'invalid-amount' };
    }
    const cost = (amount / SEEDLING_BUNDLE_SIZE) * SEEDLING_BUNDLE_PRICE;
    if (!this.canQueueCost(cost)) return { ok: false, reason: 'no-coins' };
    this.marketCart.seedlings += amount;
    return { ok: true };
  }

  clearMarketCart(): SitioCommandResult {
    this.marketCart = emptyMarketCart();
    return { ok: true };
  }

  canPlantCoffeeLot(x: number, y: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    for (let yy = y; yy < y + 2; yy++) {
      for (let xx = x; xx < x + 4; xx++) {
        if (!this.inBounds(xx, yy)) return { ok: false, reason: 'oob' };
        if (this.terrain[this.index(xx, yy)] === TERRAIN_ROAD) {
          return { ok: false, reason: 'road' };
        }
        if (this.terrain[this.index(xx, yy)] !== TERRAIN_TERRA) {
          return { ok: false, reason: 'mata' };
        }
        if (this.buildingAt(xx, yy) !== BUILDING_NONE) {
          return { ok: false, reason: 'occupied' };
        }
        if (this.coffeeAt(xx, yy) !== COFFEE_NONE) {
          return { ok: false, reason: 'occupied' };
        }
        if (this.siteAt(xx, yy)) return { ok: false, reason: 'occupied' };
        if (this.roadPlan.some((tile) => tile.x === xx && tile.y === yy)) {
          return { ok: false, reason: 'occupied' };
        }
        if (
          this.plantOrders.some(
            (order) =>
              xx >= order.x &&
              yy >= order.y &&
              xx < order.x + order.w &&
              yy < order.y + order.h,
          )
        ) {
          return { ok: false, reason: 'occupied' };
        }
      }
    }
    if (this.seedlings < COFFEE_LOT_SEEDLINGS) {
      return { ok: false, reason: 'no-seedlings' };
    }
    return { ok: true };
  }

  plantCoffeeLot(x: number, y: number): SitioCommandResult {
    const check = this.canPlantCoffeeLot(x, y);
    if (!check.ok) return check;
    this.seedlings -= COFFEE_LOT_SEEDLINGS;
    const order: CoffeePlantOrder = {
      id: this.nextPlantOrderId++,
      x,
      y,
      w: 4,
      h: 2,
      progress: 0,
      required: COFFEE_PLANT_PERIODS,
    };
    this.plantOrders.push(order);
    return { ok: true };
  }

  foodCapacity(): number {
    return Math.max(0, this.families.length * FOOD_CAP);
  }

  hasBuildingOrSite(kind: BuildingKind): boolean {
    return (
      this.hasBuilding(kind) || this.sites.some((site) => site.kind === kind)
    );
  }

  hasBuilding(kind: BuildingKind): boolean {
    return this.structures.some((structure) => structure.kind === kind);
  }

  countHouses(): number {
    return this.structures.filter((structure) => structure.kind === 'house').length;
  }

  emptyHouseCount(): number {
    const houses = this.structures.filter((structure) => structure.kind === 'house');
    const occupied = new Set(
      this.families.map((family) => `${family.houseX},${family.houseY}`),
    );
    return houses.filter((house) => !occupied.has(`${house.x},${house.y}`)).length;
  }

  inviteFamily(): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    const empty = this.findEmptyHouse();
    if (!empty) return { ok: false, reason: 'no-house' };
    if (this.availableCoins() < FAMILY_INVITE_COST) return { ok: false, reason: 'no-coins' };
    this.coins -= FAMILY_INVITE_COST;
    this.monthExpense += FAMILY_INVITE_COST;
    this.createFamilyAt(empty.x, empty.y);
    return { ok: true };
  }

  execute(command: SitioCommand): SitioCommandResult {
    if (this.status !== 'playing') return { ok: false, reason: 'game-over' };
    switch (command.type) {
      case 'assign':
        return this.assign(command.personId, command.task);
      case 'build':
        return this.placeBuilding(command.kind, command.x, command.y);
      case 'placeStarter':
        return this.placeStarter(command.kind, command.x, command.y);
      case 'sellCoffee':
        return this.sellCoffee(command.batchId, command.amount);
      case 'sellFood':
        return this.sellFood(command.amount);
      case 'buyWood':
        return this.buyWood(command.amount);
      case 'buyInput':
        return this.buyInput(command.kind, command.amount);
      case 'buySeedlings':
        return this.buySeedlings(command.amount);
      case 'plantCoffeeLot':
        return this.plantCoffeeLot(command.x, command.y);
      case 'planRoad':
        return this.planRoad(command.x, command.y);
      case 'clearRoadPlan':
        return this.clearRoadPlan();
      case 'clearMarketCart':
        return this.clearMarketCart();
      case 'inviteFamily':
        return this.inviteFamily();
      case 'demolish':
        return this.demolish(command.structureId);
      case 'endMonth':
        if (this.setup) return { ok: false, reason: 'setup' };
        this.endMonth();
        return { ok: true };
    }
    return { ok: false, reason: 'nothing' };
  }

  private footprintBlockReason(
    x: number,
    y: number,
    w: number,
    h: number,
  ): SitioCommandReason | null {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!this.inBounds(xx, yy)) return 'oob';
        const terrain = this.terrain[this.index(xx, yy)];
        if (terrain === TERRAIN_ROAD) return 'road';
        if (terrain !== TERRAIN_TERRA) return 'mata';
        if (this.buildingAt(xx, yy) !== BUILDING_NONE) return 'occupied';
        if (this.coffeeAt(xx, yy) !== COFFEE_NONE) return 'occupied';
        if (this.siteAt(xx, yy)) return 'occupied';
        if (this.roadPlan.some((tile) => tile.x === xx && tile.y === yy)) {
          return 'occupied';
        }
        if (
          this.plantOrders.some(
            (order) =>
              xx >= order.x &&
              yy >= order.y &&
              xx < order.x + order.w &&
              yy < order.y + order.h,
          )
        ) {
          return 'occupied';
        }
      }
    }
    return null;
  }

  canPlaceStarter(kind: StarterKind, x: number, y: number): StarterPreviewResult {
    if (!isStarterKind(kind)) return { ok: false, reason: 'invalid-task' };
    if (this.setup === null || this.setup !== kind) return { ok: false, reason: 'setup' };
    const footprint = STARTER_FOOTPRINTS[kind];
    const blocked = this.footprintBlockReason(x, y, footprint.w, footprint.h);
    if (blocked) return { ok: false, reason: blocked };
    return { ok: true };
  }

  private placeStarter(kind: StarterKind, x: number, y: number): SitioCommandResult {
    const preview = this.canPlaceStarter(kind, x, y);
    if (!preview.ok) return preview;
    const footprint = STARTER_FOOTPRINTS[kind];
    if (kind === 'coffee') {
      this.coffeeLots.push({
        id: this.nextCoffeeLotId++,
        x,
        y,
        w: footprint.w,
        h: footprint.h,
        fertilized: false,
        limed: false,
      });
      for (let yy = y; yy < y + footprint.h; yy++) {
        for (let xx = x; xx < x + footprint.w; xx++) {
          this.coffee[this.index(xx, yy)] = COFFEE_FORMING;
        }
      }
    } else {
      const id =
        kind === 'sede'
          ? BUILDING_SEDE
          : BUILDING_IDS[kind as Exclude<StarterKind, 'sede' | 'coffee'>];
      for (let yy = y; yy < y + footprint.h; yy++) {
        for (let xx = x; xx < x + footprint.w; xx++) {
          this.buildings[this.index(xx, yy)] = id;
        }
      }
      this.structures.push({
        id: this.nextStructureId++,
        kind,
        x,
        y,
        w: footprint.w,
        h: footprint.h,
      });
      if (kind === 'house') this.createInitialFamily(x, y);
    }
    this.setup =
      kind === 'sede'
        ? 'house'
        : kind === 'house'
          ? 'terreiro'
          : kind === 'terreiro'
            ? 'coffee'
            : null;
    return { ok: true };
  }

  serialize(): SitioSnapshot {
    return {
      name: this.name,
      seed: this.seed,
      turn: this.turn,
      coins: this.coins,
      food: this.food,
      wood: this.wood,
      inputStock: { ...this.inputStock },
      seedlings: this.seedlings,
      coffeeBatches: this.coffeeBatches.map(cloneCoffeeBatch),
      coffeePrice: this.coffeePrice,
      status: this.status,
      setup: this.setup,
      yearEvent: this.yearEvent,
      rng: this.rng.getState() as RngState,
      terrain: this.terrain.slice(),
      buildings: this.buildings.slice(),
      coffee: this.coffee.slice(),
      families: this.families.map(cloneFamily),
      people: this.people.map(clonePerson),
      sites: this.sites.map(cloneSite),
      structures: this.structures.map(cloneStructure),
      coffeeLots: this.coffeeLots.map(cloneCoffeeLot),
      plantOrders: this.plantOrders.map((order) => ({ ...order })),
      roadPlan: this.roadPlan.map((tile) => ({ ...tile })),
      marketCart: {
        ...this.marketCart,
        coffee: this.marketCart.coffee.map(cloneCoffeeSale),
      },
      totals: { ...this.totals },
      lastReport: cloneReport(this.lastReport),
      history: this.history.map((point) => ({
        ...point,
        harvest: cloneGrades(point.harvest),
        stock: cloneGrades(point.stock),
      })),
      monthSold: this.monthSold,
      monthRevenue: this.monthRevenue,
      monthExpense: this.monthExpense,
    };
  }

  fullState(): SitioFullState {
    const grades = this.coffeeGrades();
    return {
      name: this.name,
      seed: this.seed,
      turn: this.turn,
      month: this.month,
      monthOfSeason: this.monthOfSeason,
      monthOfYear: this.monthOfYear,
      year: this.year,
      season: this.season,
      coins: this.coins,
      availableCoins: this.availableCoins(),
      food: this.food,
      wood: this.wood,
      inputStock: { ...this.inputStock },
      seedlings: this.seedlings,
      coffeeBatches: this.coffeeBatches.map(cloneCoffeeBatch),
      coffeeDrying: this.coffeeDrying(),
      coffeeDry: this.coffeeDry(),
      coffeeRoasted: this.coffeeRoasted(),
      coffeeStock: this.coffeeStock(),
      coffeeGrades: grades,
      terreiroSlots: this.terreiroSlots(),
      terreiroUsed: this.terreiroUsed(),
      tulhaCapacity: this.tulhaCapacity(),
      tulhaUsed: this.tulhaUsed(),
      foodCapacity: this.foodCapacity(),
      coffeePrice: this.coffeePrice,
      reputation: this.reputation(),
      status: this.status,
      setup: this.setup,
      terrain: this.terrain.slice(),
      buildings: this.buildings.slice(),
      coffee: this.coffee.slice(),
      families: this.families.map(cloneFamily),
      people: this.people.map(clonePerson),
      sites: this.sites.map(cloneSite),
      structures: this.structures.map(cloneStructure),
      coffeeLots: this.coffeeLots.map(cloneCoffeeLot),
      plantOrders: this.plantOrders.map((order) => ({ ...order })),
      roadPlan: this.roadPlan.map((tile) => ({ ...tile })),
      marketCart: {
        ...this.marketCart,
        coffee: this.marketCart.coffee.map(cloneCoffeeSale),
      },
      yearEvent: this.yearEvent,
      lastReport: cloneReport(this.lastReport),
      history: this.history.map((point) => ({
        ...point,
        harvest: cloneGrades(point.harvest),
        stock: cloneGrades(point.stock),
      })),
      stats: this.stats(),
    };
  }

  stats(): SitioStats {
    const grades = this.coffeeGrades();
    return {
      name: this.name,
      seed: this.seed,
      turn: this.turn,
      year: this.year,
      season: this.season,
      families: this.families.length,
      coins: this.coins,
      food: this.food,
      wood: this.wood,
      inputStock: { ...this.inputStock },
      seedlings: this.seedlings,
      coffeeBatches: this.coffeeBatches.map(cloneCoffeeBatch),
      coffeeDrying: this.coffeeDrying(),
      coffeeDry: this.coffeeDry(),
      coffeeRoasted: this.coffeeRoasted(),
      coffeeStock: this.coffeeStock(),
      coffeeGrades: grades,
      terreiroSlots: this.terreiroSlots(),
      terreiroUsed: this.terreiroUsed(),
      tulhaCapacity: this.tulhaCapacity(),
      tulhaUsed: this.tulhaUsed(),
      coffeePrice: this.coffeePrice,
      roadQueue: this.roadPlan.length,
      reputation: this.reputation(),
      status: this.status,
      ...this.totals,
    };
  }

  meta(savedAt: string): SitioMeta {
    return {
      name: this.name,
      seed: this.seed,
      turn: this.turn,
      year: this.year,
      season: this.season,
      families: this.families.length,
      coins: this.coins,
      savedAt,
    };
  }

  hash(): string {
    const hash = new Fnv1a()
      .string(this.name)
      .string(this.seed)
      .string(this.status)
      .string(this.setup ?? '')
      .string(this.yearEvent)
      .int32s([
        this.turn,
        this.coins,
        this.food,
        this.wood,
        this.inputStock.fertilizer,
        this.inputStock.limestone,
        this.seedlings,
        this.coffeePrice,
        this.monthSold,
        this.monthRevenue,
        this.monthExpense,
      ])
      .bytes(this.terrain)
      .bytes(this.buildings)
      .bytes(this.coffee)
      .int32s([
        this.totals.harvestTotal,
        this.totals.revenueTotal,
        this.totals.builtTotal,
        this.totals.arrivalsTotal,
        this.totals.departuresTotal,
      ]);
    for (const family of this.families) {
      hash.string(family.name).int32s([family.id, family.houseX, family.houseY, family.morale]);
    }
    for (const person of this.people) {
      hash
        .string(person.name)
        .int32s([
          person.id,
          person.age,
          person.familyId,
          person.education ? 1 : 0,
          person.educationProgress,
          person.sex === 'female' ? 1 : 0,
          person.outfit,
        ]);
      this.hashTask(hash, person.task);
    }
    for (const site of this.sites) {
      hash
        .string(site.kind)
        .int32s([site.id, site.x, site.y, site.w, site.h, site.progress, site.required]);
    }
    for (const structure of this.structures) {
      hash
        .string(structure.kind)
        .int32s([structure.id, structure.x, structure.y, structure.w, structure.h]);
    }
    for (const lot of this.coffeeLots) {
      hash.int32s([
        lot.id,
        lot.x,
        lot.y,
        lot.w,
        lot.h,
        lot.fertilized ? 1 : 0,
        lot.limed ? 1 : 0,
      ]);
    }
    for (const tile of this.roadPlan) {
      hash.int32s([tile.x, tile.y]);
    }
    const cart = this.marketCart;
    hash.int32s([
      cart.wood,
      cart.fertilizer,
      cart.limestone,
      cart.seedlings,
      cart.food,
    ]);
    for (const sale of cart.coffee) {
      hash.int32s([sale.batchId, sale.amount]);
    }
    for (const batch of this.coffeeBatches) {
      hash
        .string(batch.grade)
        .string(batch.stage)
        .string(batch.storage)
        .int32s([
          batch.id,
          batch.lotId ?? -1,
          batch.amount,
          batch.ageMonths,
        ]);
    }
    for (const order of this.plantOrders) {
      hash.int32s([order.id, order.x, order.y, order.progress, order.required]);
    }
    for (const point of this.history) {
      hash
        .string(point.season)
        .int32s([
          point.turn,
          point.month,
          point.year,
          point.coins,
          point.income,
          point.expenses,
          point.harvest.bad,
          point.harvest.medium,
          point.harvest.good,
          point.stock.bad,
          point.stock.medium,
          point.stock.good,
        ]);
    }
    if (this.lastReport) {
      hash.int32s([
        this.lastReport.dried,
        this.lastReport.spoiled,
        this.lastReport.roasted,
        this.lastReport.roastWood,
        this.lastReport.dryingStock,
        this.lastReport.dryStock,
        this.lastReport.roastedStock,
      ]);
    }
    return hash.hex();
  }

  private hashTask(hash: Fnv1a, task: WorkTask): void {
    hash.string(task.kind);
    if (task.kind === 'build') hash.int32s([task.siteId]);
    if (task.kind === 'plantLot') hash.int32s([task.orderId]);
    if (task.kind === 'plant' || task.kind === 'clear') {
      hash.int32s([task.x, task.y]);
    }
  }

  private assign(personId: number, task: WorkTask): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    const person = this.personById(personId);
    if (!person) return { ok: false, reason: 'no-person' };
    if (person.age < 16) {
      if (task.kind === 'study') {
        if (person.age < SCHOOL_AGE) return { ok: false, reason: 'invalid-task' };
        if (!this.hasBuilding('escola')) return { ok: false, reason: 'no-school' };
        if (person.education) return { ok: false, reason: 'invalid-task' };
      } else if (task.kind !== 'idle' && task.kind !== 'rest' && task.kind !== 'yard') {
        return { ok: false, reason: 'not-adult' };
      }
      person.task = cloneTask(task);
      return { ok: true };
    }
    if (task.kind === 'study') return { ok: false, reason: 'invalid-task' };
    const invalid = this.validateTask(person, task);
    if (invalid) return { ok: false, reason: invalid };
    person.task = cloneTask(task);
    return { ok: true };
  }

  private validateTask(person: Person, task: WorkTask): SitioCommandReason | null {
    if (task.kind === 'idle' || task.kind === 'rest' || task.kind === 'yard' || task.kind === 'coffee') {
      return null;
    }
    if (task.kind === 'build') {
      if (!this.siteById(task.siteId)) return 'no-site';
      return null;
    }
    if (task.kind === 'plantLot') {
      if (!this.plantOrders.some((order) => order.id === task.orderId)) {
        return 'no-site';
      }
      return null;
    }
    if (task.kind === 'road') return null;
    if (task.kind === 'study') return 'invalid-task';
    if (task.kind === 'roast') {
      if (!this.hasBuilding('forno')) return 'prereq';
      if (this.coffeeDry() < 1 || !this.oldestDryBatch()) return 'no-stock';
      if (this.wood + this.marketCart.wood < 1) return 'no-wood';
      if (this.people.some((entry) => entry.id !== person.id && entry.task.kind === 'roast')) {
        return 'reserved';
      }
      return null;
    }
    if (task.kind === 'fertilize') {
      if (!this.coffeeLots.some((lot) => !lot.fertilized)) return 'invalid-task';
      if (this.inputStock.fertilizer + this.marketCart.fertilizer < 1) return 'no-input';
      return null;
    }
    if (task.kind === 'limestone') {
      if (!this.coffeeLots.some((lot) => !lot.limed)) return 'invalid-task';
      if (this.inputStock.limestone + this.marketCart.limestone < 1) return 'no-input';
      return null;
    }
    if (!this.inBounds(task.x, task.y)) return 'oob';
    if (task.kind === 'plant') {
      const terrain = this.terrain[this.index(task.x, task.y)];
      if (terrain === TERRAIN_ROAD) return 'road';
      if (terrain !== TERRAIN_TERRA) return 'mata';
      if (this.buildingAt(task.x, task.y) !== BUILDING_NONE) return 'occupied';
      if (this.coffeeAt(task.x, task.y) !== COFFEE_NONE) return 'occupied';
      if (this.siteAt(task.x, task.y)) return 'occupied';
      if (this.otherTaskAt('plant', task.x, task.y, person.id)) return 'reserved';
      if (this.coins < 1) return 'no-coins';
      return null;
    }
    const terrain = this.terrain[this.index(task.x, task.y)];
    if (terrain === TERRAIN_ROAD) return 'road';
    if (terrain !== TERRAIN_MATA) return 'invalid-task';
    if (this.buildingAt(task.x, task.y) !== BUILDING_NONE) return 'occupied';
    if (this.coffeeAt(task.x, task.y) !== COFFEE_NONE) return 'occupied';
    if (this.siteAt(task.x, task.y)) return 'occupied';
    if (this.otherTaskAt('clear', task.x, task.y, person.id)) return 'reserved';
    return null;
  }

  private otherTaskAt(kind: 'plant' | 'clear', x: number, y: number, personId: number): boolean {
    for (const person of this.people) {
      if (person.id === personId) continue;
      if (person.task.kind === kind && person.task.x === x && person.task.y === y) return true;
    }
    return false;
  }

  canPlaceBuilding(kind: BuildingKind, x: number, y: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    const spec = BUILDING_SPECS[kind];
    if (!spec) return { ok: false, reason: 'invalid-task' };
    if (spec.unique && this.hasBuildingOrSite(kind)) {
      return { ok: false, reason: 'unique' };
    }
    for (const required of spec.prereq ?? []) {
      if (!this.hasBuilding(required)) return { ok: false, reason: 'prereq' };
    }
    const footprint = footprintOfBuilding(BUILDING_IDS[kind]);
    const blocked = this.footprintBlockReason(x, y, footprint.w, footprint.h);
    if (blocked) return { ok: false, reason: blocked };
    if (this.availableCoins() < spec.coins) return { ok: false, reason: 'no-coins' };
    if (this.wood < spec.wood) return { ok: false, reason: 'no-wood' };
    return { ok: true };
  }

  private placeBuilding(kind: BuildingKind, x: number, y: number): SitioCommandResult {
    const check = this.canPlaceBuilding(kind, x, y);
    if (!check.ok) return check;
    const spec = BUILDING_SPECS[kind];
    const footprint = footprintOfBuilding(BUILDING_IDS[kind]);
    this.coins -= spec.coins;
    this.monthExpense += spec.coins;
    this.wood -= spec.wood;
    const site: Site = {
      id: this.nextSiteId++,
      kind,
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      progress: 0,
      required: spec.days,
    };
    this.sites.push(site);
    return { ok: true, siteId: site.id };
  }

  private demolitionBlockReason(structure: Structure): SitioCommandReason | null {
    if (structure.kind === 'sede') return 'in-use';
    if (structure.kind === 'house') {
      const occupied = this.families.some(
        (family) => family.houseX === structure.x && family.houseY === structure.y,
      );
      if (occupied) return 'in-use';
    }
    if (structure.kind === 'terreiro') {
      const remaining = this.terreiroSlots() - TERREIRO_LOT_SLOTS;
      if (this.terreiroUsed() > remaining) return 'in-use';
    }
    if (structure.kind === 'tulha' && this.tulhaUsed() > 0) return 'in-use';
    if (structure.kind === 'forno' && this.coffeeRoasted() > 0) return 'in-use';
    return null;
  }

  private demolish(structureId: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    const structure = this.structureById(structureId);
    if (!structure) return { ok: false, reason: 'no-structure' };
    const blocked = this.demolitionBlockReason(structure);
    if (blocked) return { ok: false, reason: blocked };
    const kind = structure.kind;
    if (kind === 'sede') return { ok: false, reason: 'in-use' };
    for (let y = structure.y; y < structure.y + structure.h; y++) {
      for (let x = structure.x; x < structure.x + structure.w; x++) {
        this.buildings[this.index(x, y)] = BUILDING_NONE;
      }
    }
    this.structures = this.structures.filter((entry) => entry.id !== structure.id);
    this.wood += demolishRecovery(kind);
    if (kind === 'escola') {
      for (const person of this.people) {
        if (person.task.kind === 'study') person.task = { kind: 'yard' };
      }
    }
    if (kind === 'forno') {
      for (const person of this.people) {
        if (person.task.kind === 'roast') person.task = { kind: 'yard' };
      }
    }
    return { ok: true };
  }

  private sellCoffee(batchId: number, amount: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    const batch = this.coffeeBatches.find((entry) => entry.id === batchId);
    if (!batch || (batch.stage !== 'dry' && batch.stage !== 'roasted')) {
      return { ok: false, reason: 'no-stock' };
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid-amount' };
    }
    if (amount > this.coffeeSaleAvailable(batchId)) {
      return { ok: false, reason: 'no-stock' };
    }
    const reservation = this.marketCart.coffee.find((sale) => sale.batchId === batchId);
    if (reservation) reservation.amount += amount;
    else this.marketCart.coffee.push({ batchId, amount });
    return { ok: true };
  }

  private sellFood(amount: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid-amount' };
    }
    const need = this.families.length * FAMILY_NEED;
    const available = Math.max(0, this.food - need - this.marketCart.food);
    if (amount > available) return { ok: false, reason: 'no-stock' };
    this.marketCart.food += amount;
    return { ok: true };
  }
  private buyWood(amount: number): SitioCommandResult {
    if (this.setup) return { ok: false, reason: 'setup' };
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid-amount' };
    }
    const cost = amount * WOOD_BUY_PRICE;
    if (!this.canQueueCost(cost)) return { ok: false, reason: 'no-coins' };
    this.marketCart.wood += amount;
    return { ok: true };
  }

  private applyMarketOrders(): void {
    for (const sale of this.marketCart.coffee) {
      const batch = this.coffeeBatches.find((entry) => entry.id === sale.batchId);
      if (!batch || (batch.stage !== 'dry' && batch.stage !== 'roasted')) continue;
      const amount = Math.min(sale.amount, batch.amount);
      if (amount <= 0) continue;
      const revenue = amount * this.coffeePriceForBatch(batch);
      batch.amount -= amount;
      this.coins += revenue;
      this.monthSold += amount;
      this.monthRevenue += revenue;
      this.totals.revenueTotal += revenue;
    }
    this.coffeeBatches = this.coffeeBatches.filter((batch) => batch.amount > 0);
    const cost = this.marketCost();
    if (cost > 0 && this.coins >= cost) {
      this.coins -= cost;
      this.monthExpense += cost;
      this.wood += this.marketCart.wood;
      this.inputStock.fertilizer += this.marketCart.fertilizer;
      this.inputStock.limestone += this.marketCart.limestone;
      this.seedlings += this.marketCart.seedlings;
    }
    this.marketCart = emptyMarketCart();
  }

  private applyFoodSales(report: SeasonReport): void {
    const amount = this.marketCart.food;
    if (amount > 0) {
      const sold = Math.min(amount, this.food);
      if (sold > 0) {
        const revenue = sold * FOOD_SELL_PRICE;
        this.food -= sold;
        this.coins += revenue;
        report.foodSold = sold;
        this.totals.revenueTotal += revenue;
      }
    }
    this.marketCart.food = 0;
  }

  private capFood(report: SeasonReport): void {
    const capacity = this.foodCapacity();
    const surplus = Math.max(0, this.food - capacity);
    this.food -= surplus;
    report.foodWasted += surplus;
  }

  private endMonth(): void {
    const season = this.season;
    const year = this.year;
    const report: SeasonReport = {
      turn: this.turn,
      month: this.turn + 1,
      year,
      season,
      harvest: 0,
      lost: 0,
      sold: 0,
      stock: 0,
      dried: 0,
      spoiled: 0,
      roasted: 0,
      roastWood: 0,
      dryingStock: 0,
      dryStock: 0,
      roastedStock: 0,
      revenue: 0,
      price: this.salePrice(),
      foodProduced: 0,
      foodConsumed: 0,
      foodBought: 0,
      foodSold: 0,
      foodWasted: 0,
      restBonus: 0,
      planted: 0,
      cleared: 0,
      studied: 0,
      educated: 0,
      roads: 0,
      fertilized: 0,
      limed: 0,
      harvestGrades: emptyGrades(),
      arrivals: 0,
      departures: 0,
      stalledCoffee: 0,
      completed: [],
      event: 'none',
      hunger: false,
      morale: [],
    };

    this.applyFoodSales(report);
    this.applyMarketOrders();

    const lastMonthOfSeason = this.monthOfSeason === MONTHS_PER_SEASON;
    let eventThisSeason: YearEvent = 'none';
    if (lastMonthOfSeason) {
      if (season === 'summer' && this.yearEvent === 'drought') {
        eventThisSeason = 'drought';
        this.yearEvent = 'none';
      } else if (season === 'winter' && this.yearEvent === 'frost') {
        eventThisSeason = 'frost';
        this.yearEvent = 'none';
        this.applyFrost();
      }
    }
    report.event = eventThisSeason;

    const yardYield = YARD_FOOD_PER_PERIOD - (eventThisSeason === 'drought' ? 1 : 0);
    let coffeeUnits = 0;
    let childFoodProduced = 0;

    this.runRoast(report);

    for (const person of this.people) {
      const task = person.task;
      if (person.age < 16) {
        if (task.kind === 'yard') {
          const childYield =
            Math.floor(Math.max(0, yardYield) / 2) * PERIODS_PER_MONTH_TASK;
          report.foodProduced += childYield;
          childFoodProduced += childYield;
        } else if (task.kind === 'study' && !person.education && this.hasBuilding('escola')) {
          person.educationProgress = Math.min(
            EDUCATION_PERIODS,
            person.educationProgress + PERIODS_PER_MONTH_TASK,
          );
          report.studied++;
          if (person.educationProgress >= EDUCATION_PERIODS) {
            person.education = true;
            report.educated++;
          }
        }
        continue;
      }
      if (task.kind === 'study') continue;
      const units = (person.education ? 2 : 1) * PERIODS_PER_MONTH_TASK;
      switch (task.kind) {
        case 'yard':
          report.foodProduced +=
            (Math.max(0, yardYield) + (person.education ? 1 : 0)) *
            PERIODS_PER_MONTH_TASK;
          break;
        case 'coffee':
          coffeeUnits += units;
          break;
        case 'build': {
          const site = this.siteById(task.siteId);
          if (!site) break;
          site.progress += person.education ? 2 : 1;
          if (site.progress >= site.required) this.completeSite(site, report);
          break;
        }
        case 'plantLot': {
          const order = this.plantOrders.find((entry) => entry.id === task.orderId);
          if (!order) break;
          order.progress += units;
          if (order.progress >= order.required) this.completePlantOrder(order, report);
          break;
        }
        case 'plant':
          if (this.plantCoffee(task.x, task.y)) {
            this.coins -= 1;
            report.planted++;
          }
          break;
        case 'clear':
          if (this.clearMata(task.x, task.y)) {
            this.wood += WOOD_PER_CLEAR;
            report.cleared++;
          }
          break;
        case 'fertilize':
        case 'limestone':
          this.applyGlobalInput(task.kind, report);
          break;
        case 'road':
        case 'roast':
        case 'idle':
        case 'rest':
          break;
      }
    }
    for (const person of this.people) {
      if (person.age >= 16 && person.task.kind === 'rest') {
        this.coins += REST_BONUS;
        report.restBonus += REST_BONUS;
        this.totals.revenueTotal += REST_BONUS;
      }
    }

    for (const person of this.people) {
      const task = person.task;
      if (task.kind === 'build' && !this.siteById(task.siteId)) {
        person.task = { kind: 'rest' };
      }
      if (
        task.kind === 'plantLot' &&
        !this.plantOrders.some((order) => order.id === task.orderId)
      ) {
        person.task = { kind: 'rest' };
      }
    }
    this.buildPlannedRoads(report);

    this.moveDryCoffeeToTulha();
    this.ageCoffeeBatches(report);
    this.advanceCoffeeDrying(report);
    if (season !== 'autumn') this.growCoffee(report, coffeeUnits);
    else this.harvest(report, coffeeUnits);

    report.sold = this.monthSold;
    report.revenue = this.monthRevenue;
    report.price = this.salePrice();
    report.stock = this.coffeeStock();
    report.dryingStock = this.coffeeDrying();
    report.dryStock = this.coffeeDry();
    report.roastedStock = this.coffeeRoasted();

    this.feedFamilies(report, childFoodProduced);
    this.capFood(report);

    const leaving = this.families.filter((family) => family.morale <= 0);
    if (leaving.length > 0) {
      const leavingIds = new Set(leaving.map((family) => family.id));
      this.families = this.families.filter((family) => !leavingIds.has(family.id));
      this.people = this.people.filter((person) => !leavingIds.has(person.familyId));
      report.departures = leaving.length;
    }

    if (lastMonthOfSeason) this.arriveFamily(report);

    this.totals.harvestTotal += report.harvest;
    this.totals.builtTotal += report.completed.length;
    this.totals.arrivalsTotal += report.arrivals;
    this.totals.departuresTotal += report.departures;
    this.lastReport = report;
    this.history.push({
      turn: report.turn,
      month: report.month,
      year: report.year,
      season: report.season,
      coins: this.coins,
      income: report.revenue + report.foodSold * FOOD_SELL_PRICE + report.restBonus,
      expenses: this.monthExpense,
      harvest: cloneGrades(report.harvestGrades),
      stock: this.coffeeGrades(),
    });
    if (this.history.length > 48) this.history = this.history.slice(-48);
    this.monthSold = 0;
    this.monthRevenue = 0;
    this.monthExpense = 0;

    if (this.families.length < 1) {
      this.status = 'lost';
      return;
    }

    if (this.turn >= FINAL_TURN - 1) {
      this.status = this.isVillage() ? 'won' : 'ended';
      return;
    }

    this.turn++;
    if (this.turn % TURNS_PER_YEAR === 0) {
      this.agePeople();
      this.coffeePrice = COFFEE_BASE_PRICE + this.rng.int(3);
      this.yearEvent = this.turn >= TURNS_PER_YEAR ? this.rollYearEvent() : 'none';
    }
  }

  private agePeople(): void {
    for (const person of this.people) {
      person.age++;
      if (person.age === 16) {
        if (person.task.kind === 'study' || person.task.kind === 'idle' || person.task.kind === 'rest') {
          person.task = { kind: 'yard' };
        }
      }
    }
  }

  private rollYearEvent(): YearEvent {
    const roll = this.rng.int(3);
    if (roll === 1) return 'frost';
    if (roll === 2) return 'drought';
    return 'none';
  }

  private applyFrost(): void {
    const mature: number[] = [];
    for (let i = 0; i < this.coffee.length; i++) {
      if (this.coffee[i] === COFFEE_MATURE) mature.push(i);
    }
    const losses = Math.min(FROST_LOSS, mature.length);
    for (let i = 0; i < losses; i++) {
      const pick = this.rng.int(mature.length);
      const index = mature.splice(pick, 1)[0];
      if (index !== undefined) this.coffee[index] = COFFEE_MUDA;
    }
  }

  private applyGlobalInput(
    kind: 'fertilize' | 'limestone',
    report: SeasonReport,
  ): void {
    const stock = kind === 'fertilize' ? 'fertilizer' : 'limestone';
    if (this.inputStock[stock] < 1) return;
    const lot = this.coffeeLots.find((entry) =>
      kind === 'fertilize' ? !entry.fertilized : !entry.limed,
    );
    if (!lot) return;
    if (kind === 'fertilize') {
      lot.fertilized = true;
      report.fertilized++;
    } else {
      lot.limed = true;
      report.limed++;
    }
    this.inputStock[stock]--;
  }

  private buildPlannedRoads(report: SeasonReport): void {
    const workers = this.people.filter(
      (person) =>
        person.age >= 16 && person.task.kind === 'road',
    );
    for (let worker = 0; worker < workers.length; worker++) {
      for (let built = 0; built < ROAD_TILES_PER_MONTH; built++) {
        const tile = this.roadPlan.shift();
        if (!tile) return;
        if (!this.inBounds(tile.x, tile.y)) continue;
        const index = this.index(tile.x, tile.y);
        if (this.terrain[index] !== TERRAIN_TERRA) continue;
        if (this.buildingAt(tile.x, tile.y) !== BUILDING_NONE) continue;
        if (this.coffeeAt(tile.x, tile.y) !== COFFEE_NONE) continue;
        if (this.siteAt(tile.x, tile.y)) continue;
        this.terrain[index] = TERRAIN_ROAD;
        report.roads++;
      }
    }
  }

  private runRoast(report: SeasonReport): void {
    const worker = this.people.find(
      (person) => person.age >= 16 && person.task.kind === 'roast',
    );
    if (!worker) return;
    if (!this.hasBuilding('forno')) return;
    const batch = this.oldestDryBatch();
    if (!batch) return;
    if (this.wood < 1) return;
    this.wood--;
    batch.stage = 'roasted';
    batch.storage = 'forno';
    batch.ageMonths = 0;
    report.roasted += batch.amount;
    report.roastWood += 1;
  }

  private moveDryCoffeeToTulha(): void {
    if (!this.hasBuilding('tulha')) return;
    let used = this.tulhaUsed();
    for (const batch of this.coffeeBatches) {
      if (batch.stage !== 'dry' || batch.storage !== 'terreiro') continue;
      if (used + batch.amount > TULHA_CAPACITY) continue;
      batch.storage = 'tulha';
      used += batch.amount;
    }
  }

  private ageCoffeeBatches(report: SeasonReport): void {
    for (const batch of this.coffeeBatches) {
      if (batch.stage !== 'dry' || batch.storage !== 'terreiro') continue;
      batch.ageMonths += 1;
      if (batch.ageMonths >= COFFEE_MAX_DRY_MONTHS) {
        report.spoiled += batch.amount;
        batch.amount = 0;
      }
    }
    this.coffeeBatches = this.coffeeBatches.filter((batch) => batch.amount > 0);
  }

  private advanceCoffeeDrying(report: SeasonReport): void {
    const tulha = this.hasBuilding('tulha');
    let used = this.tulhaUsed();
    for (const batch of this.coffeeBatches) {
      if (batch.stage !== 'drying') continue;
      batch.ageMonths += 1;
      if (batch.ageMonths < COFFEE_DRY_MONTHS) continue;
      batch.stage = 'dry';
      batch.ageMonths = 0;
      report.dried += batch.amount;
      if (tulha && used + batch.amount <= TULHA_CAPACITY) {
        batch.storage = 'tulha';
        used += batch.amount;
      } else {
        batch.storage = 'terreiro';
      }
    }
  }

  private harvest(report: SeasonReport, periods: number): void {
    if (periods <= 0) return;
    const mature: number[] = [];
    for (let i = 0; i < this.coffee.length; i++) {
      if (this.coffee[i] === COFFEE_MATURE) mature.push(i);
    }
    const take = Math.min(mature.length, periods * COFFEE_CELLS_PER_PERIOD);
    const harvestedLots = new Set<number>();
    const lotAmounts = new Map<number, number>();
    const strayAmounts = emptyGrades();
    for (let i = 0; i < take; i++) {
      const index = mature[i];
      if (index === undefined) continue;
      const x = index % SITIO_SIZE;
      const y = Math.floor(index / SITIO_SIZE);
      const lot = this.lotAt(x, y);
      const yieldAmount = HARVEST_YIELD + (lot?.fertilized ? 1 : 0);
      const grade = this.gradeForQuality(
        lot ? this.lotQuality(lot) : COFFEE_QUALITY_BASE,
      );
      this.coffee[index] = COFFEE_FORMING;
      report.harvest += yieldAmount;
      report.harvestGrades[grade] += yieldAmount;
      if (lot) {
        harvestedLots.add(lot.id);
        lotAmounts.set(lot.id, (lotAmounts.get(lot.id) ?? 0) + yieldAmount);
      } else {
        strayAmounts[grade] += yieldAmount;
      }
    }
    const candidates: { lotId: number | null; grade: CoffeeGrade; amount: number }[] = [];
    for (const lot of this.coffeeLots) {
      const amount = lotAmounts.get(lot.id) ?? 0;
      if (amount <= 0) continue;
      candidates.push({
        lotId: lot.id,
        grade: this.gradeForQuality(this.lotQuality(lot)),
        amount,
      });
    }
    for (const grade of COFFEE_GRADES) {
      const amount = strayAmounts[grade];
      if (amount <= 0) continue;
      candidates.push({ lotId: null, grade, amount });
    }

    for (const lot of this.coffeeLots) {
      if (harvestedLots.has(lot.id)) {
        lot.fertilized = false;
        lot.limed = false;
      }
    }

    for (const candidate of candidates) {
      if (this.terreiroUsed() >= this.terreiroSlots()) {
        report.lost += candidate.amount;
        continue;
      }
      this.coffeeBatches.push({
        id: this.nextCoffeeBatchId++,
        lotId: candidate.lotId,
        grade: candidate.grade,
        amount: candidate.amount,
        stage: 'drying',
        storage: 'terreiro',
        ageMonths: 0,
      });
    }
  }

  private growCoffee(report: SeasonReport, periods: number): void {
    const growing: number[] = [];
    for (let i = 0; i < this.coffee.length; i++) {
      const stage = this.coffee[i] ?? COFFEE_NONE;
      if (stage >= COFFEE_MUDA && stage < COFFEE_MATURE) growing.push(i);
    }
    const grown = Math.min(growing.length, Math.max(0, periods) * COFFEE_CELLS_PER_PERIOD);
    report.stalledCoffee = (growing.length - grown) * COFFEE_PES_PER_CELL;
    for (let i = 0; i < grown; i++) {
      const index = growing[i];
      if (index === undefined) continue;
      this.coffee[index] = (this.coffee[index] ?? COFFEE_NONE) + 1;
    }
  }

  private plantCoffee(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    if (this.terrain[this.index(x, y)] !== TERRAIN_TERRA) return false;
    if (this.buildingAt(x, y) !== BUILDING_NONE) return false;
    if (this.coffeeAt(x, y) !== COFFEE_NONE) return false;
    if (this.siteAt(x, y)) return false;
    if (this.coins < 1) return false;
    this.coffee[this.index(x, y)] = COFFEE_MUDA;
    return true;
  }

  private clearMata(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    if (this.terrain[this.index(x, y)] !== TERRAIN_MATA) return false;
    if (this.buildingAt(x, y) !== BUILDING_NONE) return false;
    if (this.coffeeAt(x, y) !== COFFEE_NONE) return false;
    if (this.siteAt(x, y)) return false;
    this.terrain[this.index(x, y)] = TERRAIN_TERRA;
    return true;
  }

  private completePlantOrder(order: CoffeePlantOrder, report: SeasonReport): void {
    this.coffeeLots.push({
      id: this.nextCoffeeLotId++,
      x: order.x,
      y: order.y,
      w: order.w,
      h: order.h,
      fertilized: false,
      limed: false,
    });
    for (let y = order.y; y < order.y + order.h; y++) {
      for (let x = order.x; x < order.x + order.w; x++) {
        this.coffee[this.index(x, y)] = COFFEE_MUDA;
      }
    }
    this.plantOrders = this.plantOrders.filter((entry) => entry.id !== order.id);
    report.planted += order.w * order.h;
  }

  private completeSite(site: Site, report: SeasonReport): void {
    const id = BUILDING_IDS[site.kind];
    for (let y = site.y; y < site.y + site.h; y++) {
      for (let x = site.x; x < site.x + site.w; x++) {
        this.buildings[this.index(x, y)] = id;
      }
    }
    this.structures.push({
      id: this.nextStructureId++,
      kind: site.kind,
      x: site.x,
      y: site.y,
      w: site.w,
      h: site.h,
    });
    this.sites = this.sites.filter((candidate) => candidate.id !== site.id);
    report.completed.push(site.kind);
    if (site.kind === 'capela') {
      for (const family of this.families) {
        const from = family.morale;
        family.morale = Math.min(MORALE_MAX, family.morale + 1);
        if (family.morale !== from) {
          report.morale.push({ id: family.id, from, to: family.morale });
        }
      }
    }
  }

  private feedFamilies(report: SeasonReport, childFoodProduced = 0): void {
    const need = this.families.length * FAMILY_NEED;
    const total = this.food + report.foodProduced;
    const childFood = Math.min(Math.max(0, childFoodProduced), total);
    const childForNeed = Math.min(childFood, need);
    const otherFood = total - childFood;
    const otherConsumed = Math.min(otherFood, Math.max(0, need - childForNeed));
    const consumed = childForNeed + otherConsumed;
    const food = otherFood - otherConsumed;
    report.foodConsumed = consumed;
    let short = need - consumed;
    if (short > 0) {
      const bought = Math.min(short, this.coins);
      this.coins -= bought;
      this.monthExpense += bought;
      report.foodBought = bought;
      short -= bought;
    }
    if (short > 0) {
      report.hunger = true;
      for (const family of this.families) {
        const from = family.morale;
        family.morale = Math.max(0, family.morale - 1);
        if (family.morale !== from) {
          report.morale.push({ id: family.id, from, to: family.morale });
        }
      }
    }
    this.food = Math.max(0, food);
  }

  private createInitialFamily(houseX: number, houseY: number): void {
    const family: Family = {
      id: this.nextFamilyId++,
      name: FAMILY_NAMES[0] ?? 'Família 1',
      houseX,
      houseY,
      morale: MORALE_START,
    };
    this.families.push(family);
    this.addPerson(family, PERSON_NAMES[0] ?? 'João', 34, true);
    this.addPerson(family, PERSON_NAMES[1] ?? 'Maria', 32, true);
    this.addPerson(family, PERSON_NAMES[2] ?? 'Ana', 15, false);
    this.addPerson(family, PERSON_NAMES[3] ?? 'Pedro', 13, false);
  }

  private addPerson(family: Family, given: string, age: number, adult: boolean): void {
    const sex: PersonSex = adult ? sexFromName(given) : this.rng.int(2) === 0 ? 'female' : 'male';
    this.people.push({
      id: this.nextPersonId++,
      name: `${given} ${family.name}`,
      age,
      familyId: family.id,
      education: false,
      educationProgress: 0,
      sex,
      outfit: this.rng.int(OUTFIT_COUNT),
      task: adult ? { kind: 'yard' } : { kind: 'idle' },
    });
  }
  private createFamilyAt(houseX: number, houseY: number): Family {
    const id = this.nextFamilyId++;
    const family: Family = {
      id,
      name: FAMILY_NAMES[(id - 1) % FAMILY_NAMES.length] ?? `Família ${id}`,
      houseX,
      houseY,
      morale: MORALE_START,
    };
    this.families.push(family);
    const offset = ((id - 1) * 4) % PERSON_NAMES.length;
    this.addPerson(family, PERSON_NAMES[offset] ?? 'João', 30, true);
    this.addPerson(family, PERSON_NAMES[(offset + 1) % PERSON_NAMES.length] ?? 'Maria', 28, true);
    this.addPerson(family, PERSON_NAMES[(offset + 2) % PERSON_NAMES.length] ?? 'Ana', 14, false);
    this.addPerson(family, PERSON_NAMES[(offset + 3) % PERSON_NAMES.length] ?? 'Pedro', 12, false);
    return family;
  }

  private arriveFamily(report: SeasonReport): void {
    if (this.reputation() < ARRIVAL_REPUTATION) return;
    const empty = this.findEmptyHouse();
    if (!empty) return;
    this.createFamilyAt(empty.x, empty.y);
    report.arrivals = 1;
  }

  private findEmptyHouse(): { x: number; y: number } | null {
    for (const structure of this.structures) {
      if (structure.kind !== 'house') continue;
      const occupied = this.families.some(
        (family) => family.houseX === structure.x && family.houseY === structure.y,
      );
      if (!occupied) return { x: structure.x, y: structure.y };
    }
    return null;
  }

  private isVillage(): boolean {
    return (
      this.families.length >= WIN_FAMILIES &&
      this.hasBuilding('capela') &&
      this.hasBuilding('escola') &&
      this.hasBuilding('venda') &&
      this.families.every((family) => family.morale >= 2)
    );
  }
}
