import {
  SITIO_SIZE,
  TERRAIN_ROAD,
  type Family,
  type Person,
  type SitioFullState,
  type Structure,
  type WorkTask,
} from '@sitio/simulation';
import { outfitOf, roleOf, type PersonRole } from './appearance';

export type ActorVariant = PersonRole;

export interface ActorPlan {
  key: string;
  personId: number;
  personName: string;
  task: WorkTask;
  variant: ActorVariant;
  outfit: string;
  anchorX: number;
  anchorY: number;
  groupKey: string;
  slot: number;
}

export interface FieldMarker {
  lotId: number;
  fertilizer: boolean;
  limestone: boolean;
}

export interface RestingHouse {
  familyId: number;
  x: number;
  y: number;
  count: number;
}

type ActorState = Pick<
  SitioFullState,
  'people' | 'families' | 'coffeeLots' | 'sites' | 'plantOrders' | 'structures' | 'roadPlan' | 'terrain'
>;

function familyOf(state: ActorState, person: Person): Family | null {
  return state.families.find((family) => family.id === person.familyId) ?? null;
}

function houseAnchor(
  family: Family,
  kind: 'yard' | 'rest',
): { x: number; y: number } {
  if (kind === 'rest') return { x: family.houseX + 0.85, y: family.houseY + 2.25 };
  return { x: family.houseX + 1.55, y: family.houseY + 1.85 };
}

function structureAnchor(structure: Structure): { x: number; y: number } {
  return {
    x: structure.x + structure.w / 2,
    y: structure.y + structure.h + 0.25,
  };
}

function footprintAnchor(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return { x: x + w / 2, y: y + h + 0.25 };
}

function structureOf(
  state: ActorState,
  kind: Structure['kind'],
): Structure | null {
  return state.structures.find((structure) => structure.kind === kind) ?? null;
}

function firstRoad(state: ActorState): { x: number; y: number } {
  const planned = state.roadPlan[0];
  if (planned) return { x: planned.x + 0.5, y: planned.y + 0.5 };
  for (let y = 0; y < SITIO_SIZE; y++) {
    for (let x = 0; x < SITIO_SIZE; x++) {
      if (state.terrain[y * SITIO_SIZE + x] === TERRAIN_ROAD) {
        return { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  return { x: 0.5, y: 0.5 };
}

interface ResolvedTask {
  x: number;
  y: number;
  groupKey: string;
  targetKey: string;
}

function resolveTask(
  state: ActorState,
  person: Person,
  family: Family | null,
  task: WorkTask,
): ResolvedTask {
  if (task.kind === 'idle' || task.kind === 'rest') {
    const anchor = family ? houseAnchor(family, 'rest') : { x: 0.5, y: 0.5 };
    const key = family ? `house:${family.id}` : 'house:none';
    return { ...anchor, groupKey: key, targetKey: `rest:${key}` };
  }
  if (task.kind === 'yard') {
    const anchor = family ? houseAnchor(family, 'yard') : { x: 0.5, y: 0.5 };
    const key = family ? `house:${family.id}` : 'house:none';
    return { ...anchor, groupKey: key, targetKey: `yard:${key}` };
  }
  if (task.kind === 'study') {
    const school = structureOf(state, 'escola');
    const anchor = school ? structureAnchor(school) : family ? houseAnchor(family, 'rest') : { x: 0.5, y: 0.5 };
    const key = school ? `structure:${school.id}` : family ? `house:${family.id}` : 'house:none';
    return { ...anchor, groupKey: key, targetKey: `study:${key}` };
  }
  if (task.kind === 'build') {
    const site = state.sites.find((entry) => entry.id === task.siteId);
    if (!site) {
      const anchor = family ? houseAnchor(family, 'rest') : { x: 0.5, y: 0.5 };
      const key = family ? `house:${family.id}` : 'house:none';
      return { ...anchor, groupKey: key, targetKey: `build:${key}` };
    }
    const anchor = footprintAnchor(site.x, site.y, site.w, site.h);
    const key = `site:${site.id}`;
    return { ...anchor, groupKey: key, targetKey: `build:${key}` };
  }
  if (task.kind === 'plantLot') {
    const order = state.plantOrders.find((entry) => entry.id === task.orderId);
    if (!order) {
      const anchor = family ? houseAnchor(family, 'rest') : { x: 0.5, y: 0.5 };
      const key = family ? `house:${family.id}` : 'house:none';
      return { ...anchor, groupKey: key, targetKey: `plantLot:${key}` };
    }
    const anchor = footprintAnchor(order.x, order.y, order.w, order.h);
    const key = `order:${order.id}`;
    return { ...anchor, groupKey: key, targetKey: `plantLot:${key}` };
  }
  if (task.kind === 'fertilize' || task.kind === 'limestone') {
    const lot = state.coffeeLots.find(
      (entry) =>
        task.x >= entry.x &&
        task.y >= entry.y &&
        task.x < entry.x + entry.w &&
        task.y < entry.y + entry.h,
    );
    if (!lot) {
      return {
        x: task.x + 0.5,
        y: task.y + 0.5,
        groupKey: `tile:${task.x},${task.y}`,
        targetKey: `${task.kind}:${task.x},${task.y}`,
        };
    }
    return {
      x: task.x + 0.5,
      y: task.y + 0.5,
      groupKey: `lot:${lot.id}`,
      targetKey: `${task.kind}:${task.x},${task.y}`,
    };
  }
  if (task.kind === 'plant' || task.kind === 'clear') {
    return {
      x: task.x + 0.5,
      y: task.y + 0.5,
      groupKey: `tile:${task.x},${task.y}`,
      targetKey: `${task.kind}:${task.x},${task.y}`,
    };
  }
  if (task.kind === 'road') {
    const anchor = firstRoad(state);
    return {
      ...anchor,
      groupKey: 'road',
      targetKey: 'road',
    };
  }
  const lot = state.coffeeLots[person.id % state.coffeeLots.length];
  if (lot) {
    const anchor = { x: lot.x + lot.w / 2, y: lot.y + lot.h / 2 };
    const key = `lot:${lot.id}`;
    return { ...anchor, groupKey: key, targetKey: `coffee:${key}` };
  }
  const anchor = family ? houseAnchor(family, 'rest') : { x: 0.5, y: 0.5 };
  const key = family ? `house:${family.id}` : 'house:none';
  return { ...anchor, groupKey: key, targetKey: `coffee:${key}` };
}

function isRestTask(task: WorkTask): boolean {
  return task.kind === 'idle' || task.kind === 'rest';
}

export function planActors(state: ActorState): ActorPlan[] {
  const plans: ActorPlan[] = [];
  const groupIndex = new Map<string, number>();
  for (const person of state.people) {
    const task = person.task;
    if (isRestTask(task)) continue;
    const family = familyOf(state, person);
    const resolved = resolveTask(state, person, family, task);
    const slot = groupIndex.get(resolved.groupKey) ?? 0;
    groupIndex.set(resolved.groupKey, slot + 1);
    plans.push({
      key: `${person.id}:${task.kind}:${resolved.targetKey}`,
      personId: person.id,
      personName: person.name,
      task,
      variant: roleOf(person),
      outfit: outfitOf(person),
      anchorX: resolved.x,
      anchorY: resolved.y,
      groupKey: resolved.groupKey,
      slot,
    });
  }
  return plans;
}
export function fieldMarkers(state: ActorState): FieldMarker[] {
  const markers = new Map<number, FieldMarker>();
  for (const lot of state.coffeeLots) {
    markers.set(lot.id, { lotId: lot.id, fertilizer: false, limestone: false });
  }
  for (const person of state.people) {
    const task = person.task;
    if (task.kind !== 'fertilize' && task.kind !== 'limestone') continue;
    const lot = state.coffeeLots.find(
      (entry) =>
        task.x >= entry.x &&
        task.y >= entry.y &&
        task.x < entry.x + entry.w &&
        task.y < entry.y + entry.h,
    );
    if (!lot) continue;
    const marker = markers.get(lot.id);
    if (!marker) continue;
    if (task.kind === 'fertilize') marker.fertilizer = true;
    else marker.limestone = true;
  }
  return [...markers.values()].filter((marker) => marker.fertilizer || marker.limestone);
}

export function restingHouses(state: ActorState): RestingHouse[] {
  const houses: RestingHouse[] = [];
  for (const family of state.families) {
    let count = 0;
    for (const person of state.people) {
      if (person.familyId !== family.id) continue;
      if (isRestTask(person.task)) count++;
    }
    if (count > 0) {
      houses.push({
        familyId: family.id,
        x: family.houseX + 1,
        y: family.houseY + 1,
        count,
      });
    }
  }
  return houses;
}
