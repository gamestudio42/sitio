import {
  COFFEE_CELLS_PER_PERIOD,
  COFFEE_FORMING,
  COFFEE_MATURE,
  COFFEE_MUDA,
  COFFEE_NONE,
  FINAL_TURN,
  PERIODS_PER_MONTH_TASK,
  SITIO_SIZE,
  seasonOf,
  type CoffeeLot,
  type Person,
  type SitioFullState,
} from './types';

export interface CoffeeHarvestForecast {
  lotId: number;
  firstHarvestMonth: number | null;
  completeHarvestMonth: number | null;
}

type ForecastState = Pick<
  SitioFullState,
  'turn' | 'coffee' | 'coffeeLots' | 'people'
>;

export function coffeeWorkUnits(people: Person[]): number {
  let units = 0;
  for (const person of people) {
    if (person.age < 16) continue;
    if (person.task.kind === 'coffee') {
      units += (person.education ? 2 : 1) * PERIODS_PER_MONTH_TASK;
    }
  }
  return units;
}

export function coffeeWorkingLotIds(state: ForecastState): number[] {
  const units = coffeeWorkUnits(state.people);
  if (units <= 0) return [];
  const perMonth = units * COFFEE_CELLS_PER_PERIOD;
  const lotByCell = new Map<number, number>();
  for (const lot of state.coffeeLots) {
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) {
        const index = y * SITIO_SIZE + x;
        if ((state.coffee[index] ?? COFFEE_NONE) !== COFFEE_NONE) {
          lotByCell.set(index, lot.id);
        }
      }
    }
  }

  const targets: number[] = [];
  if (seasonOf(state.turn) === 'autumn') {
    for (let index = 0; index < state.coffee.length; index++) {
      if (state.coffee[index] === COFFEE_MATURE) targets.push(index);
    }
  } else {
    for (let index = 0; index < state.coffee.length; index++) {
      const stage = state.coffee[index] ?? COFFEE_NONE;
      if (stage >= COFFEE_MUDA && stage < COFFEE_MATURE) targets.push(index);
    }
  }

  const take = Math.min(targets.length, perMonth);
  const lots = new Set<number>();
  for (let index = 0; index < take; index++) {
    const cell = targets[index];
    if (cell === undefined) continue;
    const lotId = lotByCell.get(cell);
    if (lotId !== undefined) lots.add(lotId);
  }
  return [...lots];
}

function emptyForecast(lots: CoffeeLot[]): CoffeeHarvestForecast[] {
  return lots.map((lot) => ({
    lotId: lot.id,
    firstHarvestMonth: null,
    completeHarvestMonth: null,
  }));
}

export function coffeeHarvestForecast(state: ForecastState): CoffeeHarvestForecast[] {
  const lots = state.coffeeLots;
  if (lots.length === 0) return [];
  const units = coffeeWorkUnits(state.people);
  if (units <= 0 || state.turn >= FINAL_TURN) return emptyForecast(lots);

  const cellLot = new Map<number, number>();
  const lotCells = new Map<number, number[]>();
  for (const lot of lots) {
    const cells: number[] = [];
    for (let y = lot.y; y < lot.y + lot.h; y++) {
      for (let x = lot.x; x < lot.x + lot.w; x++) {
        const index = y * SITIO_SIZE + x;
        if ((state.coffee[index] ?? COFFEE_NONE) === COFFEE_NONE) continue;
        cellLot.set(index, lot.id);
        cells.push(index);
      }
    }
    lotCells.set(lot.id, cells);
  }

  const coffee = state.coffee.slice();
  const firstByCell = new Map<number, number>();
  const firstByLot = new Map<number, number>();
  const harvestedByLot = new Map<number, number>();
  const months = Math.max(0, FINAL_TURN - state.turn);
  const perPeriod = Math.max(1, units * COFFEE_CELLS_PER_PERIOD);

  for (let month = 1; month <= months; month++) {
    const season = seasonOf(state.turn + month - 1);
    if (season === 'autumn') {
      const mature: number[] = [];
      for (let index = 0; index < coffee.length; index++) {
        if (coffee[index] === COFFEE_MATURE) mature.push(index);
      }
      const take = Math.min(mature.length, perPeriod);
      for (let i = 0; i < take; i++) {
        const index = mature[i];
        if (index === undefined) continue;
        const lotId = cellLot.get(index);
        if (lotId === undefined) continue;
        if (!firstByCell.has(index)) {
          firstByCell.set(index, month);
          if (!firstByLot.has(lotId)) firstByLot.set(lotId, month);
          harvestedByLot.set(lotId, (harvestedByLot.get(lotId) ?? 0) + 1);
        }
        coffee[index] = COFFEE_FORMING;
      }
    } else {
      const growing: number[] = [];
      for (let index = 0; index < coffee.length; index++) {
        const stage = coffee[index] ?? COFFEE_NONE;
        if (stage >= COFFEE_MUDA && stage < COFFEE_MATURE) growing.push(index);
      }
      const grown = Math.min(growing.length, perPeriod);
      for (let i = 0; i < grown; i++) {
        const index = growing[i];
        if (index === undefined) continue;
        coffee[index] = (coffee[index] ?? COFFEE_NONE) + 1;
      }
    }

    let complete = true;
    for (const lot of lots) {
      const cells = lotCells.get(lot.id) ?? [];
      if ((harvestedByLot.get(lot.id) ?? 0) < cells.length) {
        complete = false;
        break;
      }
    }
    if (complete) break;
  }

  return lots.map((lot) => {
    const cells = lotCells.get(lot.id) ?? [];
    const first = firstByLot.get(lot.id) ?? null;
    let complete: number | null = first;
    for (const index of cells) {
      const month = firstByCell.get(index);
      if (month === undefined) {
        complete = null;
        break;
      }
      complete = Math.max(complete ?? 0, month);
    }
    return {
      lotId: lot.id,
      firstHarvestMonth: first,
      completeHarvestMonth: complete,
    };
  });
}
