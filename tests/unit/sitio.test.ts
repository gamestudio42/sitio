import {
  BUILDING_HOUSE,
  BUILDING_IDS,
  BUILDING_SEDE,
  BUILDING_TERREIRO,
  COFFEE_FORMING,
  COFFEE_MATURE,
  COFFEE_MUDA,
  COFFEE_PES_PER_CELL,
  FOOD_CAP,
  OUTFIT_COUNT,
  SITIO_SAVE_VERSION,
  SITIO_SIZE,
  SitioEngine,
  TERRAIN_TERRA,
  coffeeHarvestForecast,
  decodeSitioSave,
  encodeSitioSave,
  type BuildingKind,
  type Family,
  type SeasonReport,
  type WorkTask,
} from '@sitio/simulation';
import { stringifySave } from '@sitio/kernel';
import { fieldMarkers, planActors, restingHouses } from '../../apps/web/src/actors';
import { describe, expect, it } from 'vitest';

function create(seed = 'sitio'): SitioEngine {
  return SitioEngine.create({ name: 'Sítio', seed });
}

function place(engine: SitioEngine, kind: 'sede' | 'house' | 'terreiro' | 'coffee', x: number, y: number): void {
  expect(engine.execute({ type: 'placeStarter', kind, x, y }).ok).toBe(true);
}

function setup(engine: SitioEngine): SitioEngine {
  place(engine, 'sede', 6, 2);
  place(engine, 'house', 3, 5);
  place(engine, 'terreiro', 9, 9);
  place(engine, 'coffee', 6, 6);
  return engine;
}

function adults(engine: SitioEngine) {
  return engine.people.filter((person) => person.age >= 16);
}

function assignAll(engine: SitioEngine, task: WorkTask): void {
  for (const person of adults(engine)) {
    expect(engine.execute({ type: 'assign', personId: person.id, task }).ok).toBe(true);
  }
}

function endMonth(engine: SitioEngine): SeasonReport {
  expect(engine.execute({ type: 'endMonth' }).ok).toBe(true);
  expect(engine.lastReport).not.toBeNull();
  return engine.lastReport as SeasonReport;
}

function addBuilding(
  engine: SitioEngine,
  kind: BuildingKind,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const id = BUILDING_IDS[kind];
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      engine.buildings[engine.index(xx, yy)] = id;
    }
  }
  engine.structures.push({ id: 500 + engine.structures.length, kind, x, y, w, h });
}

describe('SitioEngine', () => {
  it('starts in setup and creates the first family after placing the house', () => {
    const engine = create();
    expect(engine.setup).toBe('sede');
    expect(engine.families).toHaveLength(0);
    expect(engine.people).toHaveLength(0);
    expect(engine.coffeeLots).toHaveLength(0);
    expect(engine.coins).toBe(12);
    expect(engine.food).toBe(4);
    expect(engine.wood).toBe(4);
    expect(engine.execute({ type: 'endMonth' })).toEqual({ ok: false, reason: 'setup' });
    expect(engine.execute({ type: 'placeStarter', kind: 'house', x: 3, y: 5 })).toEqual({
      ok: false,
      reason: 'setup',
    });
    expect(engine.execute({ type: 'placeStarter', kind: 'sede', x: 0, y: 12 })).toEqual({
      ok: false,
      reason: 'road',
    });

    place(engine, 'sede', 6, 2);
    expect(engine.setup).toBe('house');
    place(engine, 'house', 3, 5);
    expect(engine.setup).toBe('terreiro');
    expect(engine.families).toHaveLength(1);
    expect(engine.people).toHaveLength(4);
    expect(adults(engine)).toHaveLength(2);
    expect(engine.people.filter((person) => person.age < 16)).toHaveLength(2);
    const family = engine.families[0] as Family;
    expect(family).toMatchObject({ houseX: 3, houseY: 5, morale: 3 });
    expect(adults(engine).every((person) => person.task.kind === 'yard')).toBe(true);

    place(engine, 'terreiro', 9, 9);
    expect(engine.setup).toBe('coffee');
    place(engine, 'coffee', 6, 6);
    expect(engine.setup).toBeNull();
    expect(engine.coffeeLots).toHaveLength(1);
    expect(engine.coffeeLots[0]).toMatchObject({ x: 6, y: 6, w: 4, h: 2 });
    expect(engine.coffee.filter((stage) => stage === COFFEE_FORMING)).toHaveLength(8);
    expect(engine.coffee.filter((stage) => stage === COFFEE_FORMING).length * COFFEE_PES_PER_CELL).toBe(
      16,
    );
    expect(engine.buildingAt(6, 2)).toBe(BUILDING_SEDE);
    expect(engine.buildingAt(3, 5)).toBe(BUILDING_HOUSE);
    expect(engine.buildingAt(9, 9)).toBe(BUILDING_TERREIRO);
    expect(engine.structures).toHaveLength(3);
    expect(engine.execute({ type: 'endMonth' }).ok).toBe(true);
  });

  it('runs the first monthly task and persists routines', () => {
    const engine = setup(create());
    const report = endMonth(engine);
    expect(report).toMatchObject({
      turn: 0,
      month: 1,
      year: 1,
      season: 'spring',
      foodProduced: 8,
      foodConsumed: 2,
      foodSold: 0,
      foodWasted: 2,
      hunger: false,
    });
    expect(engine.turn).toBe(1);
    expect(engine.month).toBe(2);
    expect(engine.monthOfSeason).toBe(2);
    expect(engine.coins).toBe(12);
    expect(engine.food).toBe(8);
    expect(engine.coffee.filter((stage) => stage === COFFEE_FORMING)).toHaveLength(8);
    expect(adults(engine).every((person) => person.task.kind === 'yard')).toBe(true);
  });

  it('accumulates food in the house stock and sells it only through the market', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'yard' });
    let report = endMonth(engine);
    expect(report.foodProduced).toBe(8);
    expect(report.foodSold).toBe(0);
    expect(report.foodWasted).toBe(2);
    expect(engine.food).toBe(FOOD_CAP);
    expect(engine.coins).toBe(12);

    const coins = engine.coins;
    expect(engine.execute({ type: 'sellFood', amount: 4 })).toEqual({ ok: true });
    expect(engine.marketCart.food).toBe(4);
    assignAll(engine, { kind: 'idle' });
    report = endMonth(engine);
    expect(report.foodSold).toBe(4);
    expect(engine.food).toBe(2);
    expect(engine.coins).toBe(coins + 4);
    expect(engine.history.at(-1)?.income).toBe(4);
  });

  it('pays one coin for each adult on vacation', () => {
    const engine = setup(create());
    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    engine.execute({ type: 'assign', personId: first.id, task: { kind: 'rest' } });
    engine.execute({ type: 'assign', personId: second.id, task: { kind: 'idle' } });
    const coins = engine.coins;
    const report = endMonth(engine);
    expect(report.restBonus).toBe(1);
    expect(engine.coins).toBe(coins + 1);
    expect(planActors(engine).some((plan) => plan.personId === first.id)).toBe(false);
    expect(restingHouses(engine)).toHaveLength(1);
  });

  it('sends builders home on vacation when the site is completed', () => {
    const engine = setup(create());
    const built = engine.execute({ type: 'build', kind: 'house', x: 12, y: 1 });
    if (!built.ok) throw new Error(built.reason);
    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    for (const person of [first, second]) {
      expect(
        engine.execute({
          type: 'assign',
          personId: person.id,
          task: { kind: 'build', siteId: built.siteId ?? 0 },
        }).ok,
      ).toBe(true);
    }
    endMonth(engine);
    expect(engine.sites).toHaveLength(0);
    expect(first.task.kind).toBe('rest');
    expect(second.task.kind).toBe('rest');
    expect(planActors(engine).some((plan) => plan.personId === first.id)).toBe(false);
    const coins = engine.coins;
    const report = endMonth(engine);
    expect(report.restBonus).toBe(2);
    expect(engine.coins).toBe(coins + 2);
  });

  it('creates adults and children with sex and outfit colors', () => {
    const engine = setup(create());
    expect(engine.people.every((person) => person.sex === 'male' || person.sex === 'female')).toBe(true);
    expect(engine.people.every((person) => person.outfit >= 0 && person.outfit < OUTFIT_COUNT)).toBe(true);
    expect(engine.people.find((person) => person.age < 16)?.sex).toMatch(/male|female/);
  });
  it('grows and harvests the full 16-pé lot with two workers', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'coffee' });
    endMonth(engine);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MATURE)).toHaveLength(8);

    for (let month = 0; month < 7; month++) {
      assignAll(engine, { kind: 'yard' });
      endMonth(engine);
    }
    assignAll(engine, { kind: 'coffee' });
    const report = endMonth(engine);
    expect(report.harvest).toBe(16);
    expect(report.lost).toBe(0);
    expect(report.sold).toBe(0);
    expect(report.stock).toBe(16);
    expect(report.revenue).toBe(0);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MATURE)).toHaveLength(0);

    const coins = engine.coins;
    expect(engine.execute({ type: 'sellCoffee', grade: 'bad', amount: 16 })).toEqual({ ok: true });
    expect(engine.marketCart.bad).toBe(16);
    endMonth(engine);
    expect(engine.coffeeStock).toBe(0);
    expect(engine.coins).toBe(coins + 16);
  });

  it('lets one adult task harvest the full lot', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'coffee' });
    endMonth(engine);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MATURE)).toHaveLength(8);

    for (let month = 0; month < 7; month++) {
      assignAll(engine, { kind: 'yard' });
      endMonth(engine);
    }
    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    engine.execute({ type: 'assign', personId: first.id, task: { kind: 'coffee' } });
    engine.execute({ type: 'assign', personId: second.id, task: { kind: 'yard' } });
    const report = endMonth(engine);
    expect(report.harvest).toBe(16);
    expect(report.lost).toBe(0);
    expect(report.stock).toBe(16);
    expect(report.revenue).toBe(0);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MATURE)).toHaveLength(0);

    const coins = engine.coins;
    expect(engine.execute({ type: 'sellCoffee', grade: 'bad', amount: 16 })).toEqual({ ok: true });
    expect(engine.marketCart.bad).toBe(16);
    assignAll(engine, { kind: 'idle' });
    endMonth(engine);
    expect(engine.coffeeStock).toBe(0);
    expect(engine.coins).toBe(coins + 16);
  });

  it('keeps a two-adult farm progressing through a coffee cycle', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'coffee' });
    endMonth(engine);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MATURE)).toHaveLength(8);

    for (let month = 0; month < 7; month++) {
      assignAll(engine, { kind: 'yard' });
      endMonth(engine);
    }
    assignAll(engine, { kind: 'coffee' });
    const harvest = endMonth(engine);
    expect(harvest.harvest).toBe(16);
    expect(engine.status).toBe('playing');
    expect(engine.families).toHaveLength(1);
    expect(engine.people.filter((person) => person.age >= 16)).toHaveLength(2);
  });
  it('sells coffee only from stock and rejects invalid amounts', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 1 })).toEqual({
      ok: false,
      reason: 'no-stock',
    });
    engine.coffeeStock = 5;
    engine.coffeeGrades.medium = 5;
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 0 })).toEqual({
      ok: false,
      reason: 'invalid-amount',
    });
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 1.5 })).toEqual({
      ok: false,
      reason: 'invalid-amount',
    });
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 6 })).toEqual({
      ok: false,
      reason: 'no-stock',
    });
    const coins = engine.coins;
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 2 })).toEqual({ ok: true });
    expect(engine.marketCart.medium).toBe(2);
    assignAll(engine, { kind: 'idle' });
    const report = endMonth(engine);
    expect(engine.coffeeStock).toBe(3);
    expect(engine.coins).toBe(coins + 4);
    expect(report.sold).toBe(2);
    expect(report.revenue).toBe(4);
    expect(engine.totals.revenueTotal).toBe(4);
  });

  it('caps coffee at the terreiro and tulha capacity', () => {
    const engine = setup(create());
    engine.coffeeStock = 14;
    engine.coffeeGrades.bad = 14;
    engine.turn = 8;
    for (let x = 6; x < 10; x++) {
      for (let y = 6; y < 8; y++) engine.coffee[engine.index(x, y)] = COFFEE_MATURE;
    }
    assignAll(engine, { kind: 'coffee' });
    const report = endMonth(engine);
    expect(report.harvest).toBe(16);
    expect(report.lost).toBe(14);
    expect(report.stock).toBe(16);
    expect(engine.coffeeStock).toBe(16);

    addBuilding(engine, 'tulha', 12, 10, 3, 3);
    expect(engine.coffeeCapacity()).toBe(22);
  });

  it('adds the venda bonus to the coffee price', () => {
    const engine = setup(create());
    addBuilding(engine, 'venda', 1, 9, 2, 1);
    assignAll(engine, { kind: 'coffee' });
    endMonth(engine);
    for (let month = 0; month < 7; month++) {
      assignAll(engine, { kind: 'yard' });
      endMonth(engine);
    }
    const lot = engine.coffeeLots[0];
    if (lot) lot.limed = true;
    assignAll(engine, { kind: 'coffee' });
    const report = endMonth(engine);
    expect(report.price).toBe(3);
    expect(report.stock).toBe(16);
    expect(report.revenue).toBe(0);
    expect(engine.execute({ type: 'sellCoffee', grade: 'medium', amount: 16 })).toEqual({ ok: true });
    expect(engine.marketCart.medium).toBe(16);
    const next = endMonth(engine);
    expect(engine.coffeeStock).toBe(0);
    expect(next.sold).toBe(16);
    expect(next.revenue).toBe(48);
    expect(next.price).toBe(3);
  });

  it('uses a 24x24 farm', () => {
    const engine = create();
    expect(SITIO_SIZE).toBe(24);
    expect(engine.terrain).toHaveLength(SITIO_SIZE * SITIO_SIZE);
    expect(engine.index(SITIO_SIZE - 1, SITIO_SIZE - 1)).toBe(SITIO_SIZE * SITIO_SIZE - 1);
  });

  it('builds a house with one monthly task', () => {
    const engine = setup(create());
    const built = engine.execute({ type: 'build', kind: 'house', x: 12, y: 1 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(engine.coins).toBe(8);
    expect(engine.wood).toBe(2);
    expect(engine.sites).toHaveLength(1);
    expect(engine.sites[0]?.required).toBe(2);

    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    engine.execute({
      type: 'assign',
      personId: first.id,
      task: { kind: 'build', siteId: built.siteId ?? 0 },
    });
    engine.execute({
      type: 'assign',
      personId: second.id,
      task: { kind: 'build', siteId: built.siteId ?? 0 },
    });
    const report = endMonth(engine);

    expect(engine.sites).toHaveLength(0);
    expect(engine.buildingAt(12, 1)).toBe(BUILDING_HOUSE);
    expect(engine.buildingAt(13, 1)).toBe(BUILDING_HOUSE);
    expect(engine.buildingAt(12, 2)).toBe(BUILDING_HOUSE);
    expect(engine.buildingAt(13, 2)).toBe(BUILDING_HOUSE);
    expect(engine.countHouses()).toBe(2);
    expect(report.completed).toEqual(['house']);
    expect(engine.coins).toBe(8);
  });

  it('takes two months for one adult to finish a house', () => {
    const engine = setup(create());
    const built = engine.execute({ type: 'build', kind: 'house', x: 12, y: 1 });
    if (!built.ok) throw new Error(built.reason);
    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    engine.execute({
      type: 'assign',
      personId: first.id,
      task: { kind: 'build', siteId: built.siteId ?? 0 },
    });
    engine.execute({ type: 'assign', personId: second.id, task: { kind: 'idle' } });
    endMonth(engine);
    expect(engine.sites).toHaveLength(1);
    expect(engine.sites[0]?.progress).toBe(1);
    endMonth(engine);
    expect(engine.sites).toHaveLength(0);
    expect(engine.buildingAt(12, 1)).toBe(BUILDING_HOUSE);
    expect(first.task.kind).toBe('rest');
  });
  it('lets children work only in the yard', () => {
    const engine = setup(create());
    const child = engine.people.find((person) => person.age < 16);
    expect(child).toBeDefined();
    if (!child) return;
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'coffee' },
      }),
    ).toEqual({ ok: false, reason: 'not-adult' });
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'yard' },
      }).ok,
    ).toBe(true);
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'yard' },
      }).ok,
    ).toBe(true);
  });

  it('gives children half yard output and no sellable surplus', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'idle' });
    const child = engine.people.find((person) => person.age < 16);
    if (!child) throw new Error('missing child');
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'yard' },
      }).ok,
    ).toBe(true);
    const report = endMonth(engine);
    expect(report.foodProduced).toBe(2);
    expect(report.foodConsumed).toBe(2);
    expect(report.foodSold).toBe(0);
    expect(engine.food).toBe(4);
    expect(engine.coins).toBe(12);
  });

  it('lets children study only after a school exists and graduate after two monthly tasks', () => {
    const engine = setup(create());
    const child = engine.people.find((person) => person.age < 16);
    expect(child).toBeDefined();
    if (!child) return;
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'study' },
      }),
    ).toEqual({ ok: false, reason: 'no-school' });

    addBuilding(engine, 'escola', 20, 5, 2, 2);
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'study' },
      }).ok,
    ).toBe(true);
    const first = endMonth(engine);
    expect(first.studied).toBe(1);
    expect(child.education).toBe(false);
    expect(child.educationProgress).toBe(2);

    const second = endMonth(engine);
    expect(second.studied).toBe(1);
    expect(second.educated).toBe(1);
    expect(child.education).toBe(true);
    expect(child.educationProgress).toBe(4);
  });

  it('does not let adults study', () => {
    const engine = setup(create());
    const adult = adults(engine)[0];
    if (!adult) throw new Error('missing adult');
    addBuilding(engine, 'escola', 20, 5, 2, 2);
    expect(
      engine.execute({
        type: 'assign',
        personId: adult.id,
        task: { kind: 'study' },
      }),
    ).toEqual({ ok: false, reason: 'invalid-task' });
  });

  it('gives educated workers the full monthly bonus', () => {
    const engine = setup(create());
    const people = adults(engine);
    const educated = people[0];
    const other = people[1];
    if (!educated || !other) throw new Error('missing adults');
    educated.education = true;
    engine.execute({ type: 'assign', personId: educated.id, task: { kind: 'yard' } });
    engine.execute({ type: 'assign', personId: other.id, task: { kind: 'idle' } });
    const report = endMonth(engine);
    expect(report.foodProduced).toBe(6);
  });
  it('ages people at the end of the year and turns a 16-year-old into a worker', () => {
    const engine = setup(create());
    const child = engine.people.find((person) => person.age === 15);
    expect(child).toBeDefined();
    if (!child) return;
    engine.turn = 15;
    endMonth(engine);
    const grown = engine.people.find((person) => person.id === child.id);
    expect(grown?.age).toBe(16);
    expect(grown?.task).toEqual({ kind: 'yard' });
  });

  it('collects wood when a forest tile is cleared', () => {
    const engine = setup(create());
    engine.wood = 0;
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'clear', x: 1, y: 0 },
      }).ok,
    ).toBe(true);
    const report = endMonth(engine);
    expect(report.cleared).toBe(1);
    expect(engine.wood).toBe(2);
    expect(engine.terrain[engine.index(1, 0)]).toBe(TERRAIN_TERRA);
  });

  it('lets the two starting adults clear wood for construction', () => {
    const engine = setup(create());
    engine.wood = 0;
    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    expect(
      engine.execute({
        type: 'assign',
        personId: first.id,
        task: { kind: 'clear', x: 1, y: 0 },
      }).ok,
    ).toBe(true);
    expect(
      engine.execute({
        type: 'assign',
        personId: second.id,
        task: { kind: 'clear', x: 2, y: 0 },
      }).ok,
    ).toBe(true);
    endMonth(engine);
    expect(engine.wood).toBe(4);
    expect(engine.terrain[engine.index(1, 0)]).toBe(TERRAIN_TERRA);
    expect(engine.terrain[engine.index(2, 0)]).toBe(TERRAIN_TERRA);
  });
  it('buys wood with coins and rejects invalid purchases', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'buyWood', amount: 3 })).toEqual({ ok: true });
    expect(engine.marketCart.wood).toBe(3);
    expect(engine.wood).toBe(4);
    expect(engine.coins).toBe(12);
    expect(engine.execute({ type: 'buyWood', amount: 0 })).toEqual({
      ok: false,
      reason: 'invalid-amount',
    });
    assignAll(engine, { kind: 'idle' });
    endMonth(engine);
    expect(engine.wood).toBe(7);
    expect(engine.coins).toBe(9);
    engine.coins = 0;
    expect(engine.execute({ type: 'buyWood', amount: 1 })).toEqual({
      ok: false,
      reason: 'no-coins',
    });
  });

  it('buys and applies fertilizer and limestone for a good graded harvest', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'buyInput', kind: 'fertilizer', amount: 2 })).toEqual({
      ok: true,
    });
    expect(engine.execute({ type: 'buyInput', kind: 'limestone', amount: 2 })).toEqual({
      ok: true,
    });
    expect(engine.marketCart.fertilizer).toBe(2);
    expect(engine.marketCart.limestone).toBe(2);
    expect(engine.coins).toBe(12);

    const people = adults(engine);
    const first = people[0];
    const second = people[1];
    if (!first || !second) throw new Error('missing adults');
    expect(
      engine.execute({
        type: 'assign',
        personId: first.id,
        task: { kind: 'fertilize', x: 6, y: 6 },
      }).ok,
    ).toBe(true);
    expect(
      engine.execute({
        type: 'assign',
        personId: second.id,
        task: { kind: 'limestone', x: 6, y: 6 },
      }).ok,
    ).toBe(true);
    const applied = endMonth(engine);
    expect(applied.fertilized).toBe(1);
    expect(applied.limed).toBe(1);
    expect(engine.inputStock).toEqual({ fertilizer: 1, limestone: 1 });
    expect(engine.coins).toBe(2);
    const lot = engine.coffeeLots[0];
    expect(lot?.fertilized).toBe(true);
    expect(lot?.limed).toBe(true);
    if (lot) expect(engine.lotQuality(lot)).toBe(80);

    engine.turn = 8;
    for (let x = 6; x < 10; x++) {
      for (let y = 6; y < 8; y++) engine.coffee[engine.index(x, y)] = COFFEE_MATURE;
    }
    assignAll(engine, { kind: 'coffee' });
    const harvest = endMonth(engine);
    expect(harvest.harvest).toBe(24);
    expect(harvest.harvestGrades.good).toBe(24);
    expect(harvest.lost).toBe(8);
    expect(engine.coffeeGrades.good).toBe(16);
    expect(lot?.fertilized).toBe(false);
    expect(lot?.limed).toBe(false);
  });

  it('reserves queued market purchases when paying for a building', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'buyInput', kind: 'fertilizer', amount: 2 })).toEqual({
      ok: true,
    });
    expect(engine.execute({ type: 'buyInput', kind: 'limestone', amount: 2 })).toEqual({
      ok: true,
    });
    expect(engine.coins).toBe(12);
    expect(engine.fullState().availableCoins).toBe(2);

    expect(engine.execute({ type: 'build', kind: 'house', x: 12, y: 1 })).toEqual({
      ok: false,
      reason: 'no-coins',
    });

    assignAll(engine, { kind: 'idle' });
    endMonth(engine);
    expect(engine.coins).toBe(2);
    expect(engine.inputStock).toEqual({ fertilizer: 2, limestone: 2 });
  });

  it('reserves queued market purchases when inviting a family', () => {
    const engine = setup(create());
    addBuilding(engine, 'house', 1, 9, 2, 2);
    expect(engine.execute({ type: 'buyInput', kind: 'fertilizer', amount: 2 })).toEqual({
      ok: true,
    });
    expect(engine.execute({ type: 'buyInput', kind: 'limestone', amount: 2 })).toEqual({
      ok: true,
    });

    expect(engine.execute({ type: 'inviteFamily' })).toEqual({
      ok: false,
      reason: 'no-coins',
    });
    assignAll(engine, { kind: 'idle' });
    endMonth(engine);
    expect(engine.coins).toBe(2);
    expect(engine.families).toHaveLength(1);
    expect(engine.inputStock).toEqual({ fertilizer: 2, limestone: 2 });
  });

  it('forecasts the next harvest from the current coffee crew', () => {
    const engine = setup(create());
    const lot = engine.coffeeLots[0];
    if (!lot) throw new Error('missing lot');
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) {
        engine.coffee[engine.index(x, y)] = COFFEE_MATURE;
      }
    }
    engine.turn = 4;
    assignAll(engine, { kind: 'idle' });
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    engine.execute({
      type: 'assign',
      personId: person.id,
      task: { kind: 'coffee' },
    });

    const before = Array.from(engine.coffee);
    const forecast = coffeeHarvestForecast(engine)[0];
    expect(forecast).toEqual({
      lotId: lot.id,
      firstHarvestMonth: 5,
      completeHarvestMonth: 5,
    });
    expect(Array.from(engine.coffee)).toEqual(before);
  });

  it('returns no forecast when coffee has no crew', () => {
    const engine = setup(create());
    assignAll(engine, { kind: 'idle' });
    expect(coffeeHarvestForecast(engine)).toEqual([
      {
        lotId: engine.coffeeLots[0]?.id,
        firstHarvestMonth: null,
        completeHarvestMonth: null,
      },
    ]);
  });

  it('forecasts a lot from muda to harvest with the current crew', () => {
    const engine = setup(create());
    const lot = engine.coffeeLots[0];
    if (!lot) throw new Error('missing lot');
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) {
        engine.coffee[engine.index(x, y)] = COFFEE_MUDA;
      }
    }
    assignAll(engine, { kind: 'coffee' });
    expect(coffeeHarvestForecast(engine)[0]).toEqual({
      lotId: lot.id,
      firstHarvestMonth: 9,
      completeHarvestMonth: 9,
    });
  });

  it('places one worker at the monthly coffee task', () => {
    const engine = setup(create());
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'coffee' },
      }).ok,
    ).toBe(true);

    const lot = engine.coffeeLots[0];
    const plans = planActors(engine).filter((plan) => plan.personId === person.id);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.task.kind).toBe('coffee');
    expect(plans[0]?.anchorX).toBe((lot?.x ?? 0) + (lot?.w ?? 0) / 2);
    expect(plans[0]?.anchorY).toBe((lot?.y ?? 0) + (lot?.h ?? 0) / 2);
  });

  it('replaces the monthly task without duplicating the worker', () => {
    const engine = setup(create());
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'coffee' },
      }).ok,
    ).toBe(true);
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'yard' },
      }).ok,
    ).toBe(true);
    const plans = planActors(engine).filter((plan) => plan.personId === person.id);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.task.kind).toBe('yard');
  });
  it('removes resting workers from the map and keeps only Zzz', () => {
    const engine = setup(create());
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    engine.execute({
      type: 'assign',
      personId: person.id,
      task: { kind: 'idle' },
    });
    engine.execute({
      type: 'assign',
      personId: person.id,
      task: { kind: 'rest' },
    });
    const plans = planActors(engine).filter((plan) => plan.personId === person.id);
    expect(plans).toHaveLength(0);
    expect(restingHouses(engine)).toHaveLength(1);
  });

  it('places a studying child at school and marks queued field inputs', () => {
    const engine = setup(create());
    addBuilding(engine, 'escola', 1, 9, 2, 2);
    const child = engine.people.find((person) => person.age < 16);
    const people = adults(engine);
    const fertilizerWorker = people[0];
    const limestoneWorker = people[1];
    const lot = engine.coffeeLots[0];
    if (!child || !fertilizerWorker || !limestoneWorker || !lot) throw new Error('missing fixture');
    expect(
      engine.execute({
        type: 'assign',
        personId: child.id,
        task: { kind: 'study' },
      }).ok,
    ).toBe(true);
    engine.inputStock.fertilizer = 1;
    engine.inputStock.limestone = 1;
    expect(
      engine.execute({
        type: 'assign',
        personId: fertilizerWorker.id,
        task: { kind: 'fertilize', x: lot.x, y: lot.y },
      }).ok,
    ).toBe(true);
    expect(
      engine.execute({
        type: 'assign',
        personId: limestoneWorker.id,
        task: { kind: 'limestone', x: lot.x + 1, y: lot.y },
      }).ok,
    ).toBe(true);

    const childPlan = planActors(engine).find((plan) => plan.personId === child.id);
    expect(childPlan?.task.kind).toBe('study');
    expect(['boy', 'girl']).toContain(childPlan?.variant);
    expect(fieldMarkers(engine)).toEqual([
      { lotId: lot.id, fertilizer: true, limestone: true },
    ]);
  });

  it('buys seedlings and plants a coffee lot with one adult task', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'plantCoffeeLot', x: 10, y: 2 })).toEqual({
      ok: false,
      reason: 'no-seedlings',
    });
    expect(engine.execute({ type: 'buySeedlings', amount: 16 })).toEqual({ ok: true });
    expect(engine.marketCart.seedlings).toBe(16);
    expect(engine.coins).toBe(12);
    assignAll(engine, { kind: 'idle' });
    endMonth(engine);
    expect(engine.seedlings).toBe(16);
    expect(engine.coins).toBe(8);
    expect(engine.execute({ type: 'plantCoffeeLot', x: 10, y: 2 })).toEqual({ ok: true });
    expect(engine.seedlings).toBe(0);
    expect(engine.plantOrders).toHaveLength(1);
    const order = engine.plantOrders[0];
    if (!order) throw new Error('missing order');
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'plantLot', orderId: order.id },
      }).ok,
    ).toBe(true);
    const report = endMonth(engine);
    expect(report.planted).toBe(8);
    expect(engine.plantOrders).toHaveLength(0);
    expect(engine.coffeeLots).toHaveLength(2);
    expect(engine.coffee.filter((stage) => stage === COFFEE_MUDA)).toHaveLength(8);
  });

  it('records monthly income and expenses in history', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'buySeedlings', amount: 16 })).toEqual({ ok: true });
    expect(engine.execute({ type: 'buyWood', amount: 1 })).toEqual({ ok: true });
    endMonth(engine);
    expect(engine.history).toHaveLength(1);
    expect(engine.history[0]?.expenses).toBe(5);
    expect(engine.history[0]?.coins).toBe(engine.coins);
  });

  it('builds one planned road tile per adult per month without cost', () => {
    const engine = setup(create());
    const coins = engine.coins;
    for (let x = 0; x < 5; x++) {
      expect(engine.execute({ type: 'planRoad', x, y: 1 })).toEqual({ ok: true });
    }
    expect(engine.roadPlan).toHaveLength(5);
    const person = adults(engine)[0];
    if (!person) throw new Error('missing adult');
    expect(
      engine.execute({
        type: 'assign',
        personId: person.id,
        task: { kind: 'road' },
      }).ok,
    ).toBe(true);
    const report = endMonth(engine);
    expect(report.roads).toBe(1);
    expect(engine.roadPlan).toHaveLength(4);
    expect(engine.coins).toBe(coins);
    expect(engine.terrain[engine.index(0, 1)]).toBe(2);
    expect(engine.terrain[engine.index(1, 1)]).toBe(0);
    expect(engine.terrain[engine.index(4, 1)]).toBe(0);
  });

  it('requires wood, prerequisites and unique buildings', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'build', kind: 'venda', x: 1, y: 9 })).toEqual({
      ok: false,
      reason: 'prereq',
    });
    addBuilding(engine, 'tulha', 1, 1, 3, 3);
    const venda = engine.execute({ type: 'build', kind: 'venda', x: 1, y: 9 });
    expect(venda.ok).toBe(true);
    expect(engine.wood).toBe(2);
    expect(engine.coins).toBe(8);
    expect(engine.execute({ type: 'build', kind: 'venda', x: 4, y: 9 })).toEqual({
      ok: false,
      reason: 'unique',
    });

    engine.wood = 1;
    expect(engine.execute({ type: 'build', kind: 'house', x: 12, y: 1 })).toEqual({
      ok: false,
      reason: 'no-wood',
    });
  });

  it('previews building placement without mutating the farm', () => {
    const engine = setup(create());
    const coins = engine.coins;
    const wood = engine.wood;
    expect(engine.canPlaceBuilding('house', 12, 1)).toEqual({ ok: true });
    expect(engine.coins).toBe(coins);
    expect(engine.wood).toBe(wood);
    expect(engine.sites).toHaveLength(0);
    expect(engine.canPlaceBuilding('house', 12, 12)).toEqual({
      ok: false,
      reason: 'road',
    });
  });

  it('invites an unrelated family into an empty house', () => {
    const engine = setup(create());
    expect(engine.execute({ type: 'inviteFamily' })).toEqual({
      ok: false,
      reason: 'no-house',
    });
    addBuilding(engine, 'house', 12, 1, 2, 2);
    expect(engine.emptyHouseCount()).toBe(1);
    const family = engine.execute({ type: 'inviteFamily' });
    expect(family).toEqual({ ok: true });
    expect(engine.families).toHaveLength(2);
    expect(engine.people).toHaveLength(8);
    expect(engine.coins).toBe(8);
    expect(engine.emptyHouseCount()).toBe(0);
    expect(engine.execute({ type: 'inviteFamily' })).toEqual({
      ok: false,
      reason: 'no-house',
    });
  });

  it('welcomes one family per season when a house is empty and reputation is three', () => {
    const engine = setup(create());
    addBuilding(engine, 'venda', 1, 9, 2, 1);
    addBuilding(engine, 'escola', 11, 9, 2, 2);
    addBuilding(engine, 'capela', 13, 7, 1, 2);
    addBuilding(engine, 'house', 12, 1, 2, 2);
    expect(engine.reputation()).toBe(4);

    for (let month = 0; month < 4; month++) {
      assignAll(engine, { kind: 'yard' });
      endMonth(engine);
    }

    expect(engine.families).toHaveLength(2);
    expect(engine.people).toHaveLength(8);
    const newcomer = engine.families[1] as Family;
    expect(newcomer).toMatchObject({ houseX: 12, houseY: 1 });
    expect(engine.lastReport?.arrivals).toBe(1);
  });

  it('loses the farm when the last family leaves', () => {
    const engine = setup(create());
    engine.food = 0;
    engine.coins = 0;
    for (let month = 0; month < 3; month++) {
      assignAll(engine, { kind: 'idle' });
      endMonth(engine);
    }
    expect(engine.lastReport?.hunger).toBe(true);
    expect(engine.status).toBe('lost');
    expect(engine.families).toHaveLength(0);
    expect(engine.people).toHaveLength(0);
  });

  it('wins at the end of year three with six families and institutions', () => {
    const engine = setup(create());
    engine.turn = 47;
    addBuilding(engine, 'capela', 1, 1, 1, 2);
    addBuilding(engine, 'escola', 12, 1, 2, 2);
    addBuilding(engine, 'venda', 1, 9, 2, 1);
    engine.families = Array.from({ length: 6 }, (_, index) => ({
      id: 100 + index,
      name: `Família ${index + 1}`,
      houseX: index === 0 ? 3 : index === 1 ? 11 : 100 + index,
      houseY: index === 0 ? 5 : index === 1 ? 4 : 100 + index,
      morale: 3,
    }));
    engine.food = 100;
    engine.coins = 100;
    assignAll(engine, { kind: 'yard' });
    endMonth(engine);
    expect(engine.status).toBe('won');
  });

  it('preserves the setup state in a save', () => {
    const engine = create();
    place(engine, 'sede', 6, 2);
    place(engine, 'house', 3, 5);
    expect(engine.setup).toBe('terreiro');
    const text = stringifySave(
      encodeSitioSave(engine.serialize(), '2026-01-01T00:00:00.000Z'),
    );
    const decoded = decodeSitioSave(text);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.snapshot.setup).toBe('terreiro');
    expect(decoded.snapshot.families).toHaveLength(1);
    expect(decoded.snapshot.people).toHaveLength(4);
    const restored = SitioEngine.fromSnapshot(decoded.snapshot);
    expect(restored.setup).toBe('terreiro');
    expect(restored.hash()).toBe(engine.hash());
  });

  it('round-trips the v24 save through the kernel envelope', () => {
    expect(SITIO_SAVE_VERSION).toBe(24);
    const engine = setup(create());
    assignAll(engine, { kind: 'coffee' });
    endMonth(engine);
    engine.coffeeStock = 4;
    engine.coffeeGrades.bad = 4;
    engine.wood = 7;
    engine.inputStock.fertilizer = 2;
    engine.seedlings = 8;
    const child = engine.people.find((person) => person.age < 16);
    if (child) child.educationProgress = 2;
    engine.execute({ type: 'sellCoffee', grade: 'bad', amount: 1 });
    const text = stringifySave(
      encodeSitioSave(engine.serialize(), '2026-01-01T00:00:00.000Z'),
    );
    const decoded = decodeSitioSave(text);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.meta.savedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(decoded.snapshot.setup).toBeNull();
    expect(decoded.snapshot.people).toHaveLength(4);
    expect(decoded.snapshot.people.some((person) => person.educationProgress === 2)).toBe(true);
    expect(decoded.snapshot.inputStock.fertilizer).toBe(2);
    expect(decoded.snapshot.seedlings).toBe(8);
    expect(decoded.snapshot.history).toHaveLength(1);
    expect(decoded.snapshot.coffeeStock).toBe(4);
    expect(decoded.snapshot.marketCart.bad).toBe(1);
    expect(decoded.snapshot.wood).toBe(7);
    expect(decoded.snapshot.monthSold).toBe(0);
    expect(decoded.snapshot.monthRevenue).toBe(0);
    const restored = SitioEngine.fromSnapshot(decoded.snapshot);
    expect(restored.hash()).toBe(engine.hash());
  });

  it('is deterministic for the same seed and commands', () => {
    const a = play('same');
    const b = play('same');
    expect(a.hash()).toBe(b.hash());
    expect(a.lastReport?.revenue).toBe(b.lastReport?.revenue);
  });
});

function play(seed: string): SitioEngine {
  const engine = setup(create(seed));
  assignAll(engine, { kind: 'coffee' });
  endMonth(engine);
  for (let month = 0; month < 7; month++) {
    assignAll(engine, { kind: 'yard' });
    endMonth(engine);
  }
  assignAll(engine, { kind: 'coffee' });
  endMonth(engine);
  return engine;
}
