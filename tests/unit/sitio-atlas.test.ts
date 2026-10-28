import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSlices } from '../../apps/web/src/atlas';

describe('readSlices', () => {
  it('reads named slice bounds from an Aseprite sheet', () => {
    const slices = readSlices({
      meta: {
        slices: [
          { name: 'tile_terra', keys: [{ frame: 0, bounds: { x: 0, y: 0, w: 32, h: 16 } }] },
          { name: 'house', keys: [{ frame: 0, bounds: { x: 0, y: 64, w: 64, h: 64 } }] },
        ],
      },
    });
    expect(slices.get('tile_terra')).toEqual({ x: 0, y: 0, w: 32, h: 16 });
    expect(slices.get('house')).toEqual({ x: 0, y: 64, w: 64, h: 64 });
  });

  it('ignores malformed entries instead of throwing', () => {
    const slices = readSlices({
      meta: { slices: [{ name: 'bad' }, null, { name: 'ok', keys: [{ bounds: { x: 1, y: 2, w: 3, h: 4 } }] }] },
    });
    expect(slices.size).toBe(1);
    expect(slices.get('ok')).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it('exports every sprite the renderer asks for', () => {
    const raw = readFileSync(
      join(process.cwd(), 'apps/web/public/art/sitio.json'),
      'utf8',
    );
    const slices = readSlices(JSON.parse(raw));
    for (const role of ['man', 'woman', 'boy', 'girl']) {
      for (let outfit = 0; outfit < 6; outfit++) {
        for (let frame = 0; frame < 2; frame++) {
          expect(slices.has(`person_${role}_${outfit}_${frame}`), role).toBe(true);
        }
      }
    }    for (const name of [
      'tile_terra',
      'tile_terra_alt',
      'tile_mata',
      'tile_mata_alt',
      'road_0',
      'road_1',
      'road_2',
      'road_3',
      'road_4',
      'road_5',
      'road_6',
      'road_7',
      'road_8',
      'road_9',
      'road_10',
      'road_11',
      'road_12',
      'road_13',
      'road_14',
      'road_15',
      'coffee_0',
      'coffee_1',
      'coffee_2',
      'coffee_3',
      'coffee_lot_0',
      'coffee_lot_1',
      'coffee_lot_2',
      'coffee_lot_3',
      'tree',
      'house',
      'sede',
      'terreiro',
      'tulha',
      'capela',
      'venda',
      'escola',
      'forno',
      'family',
      'icon_fertilizer',
      'icon_limestone',
      'icon_clock',
      'hud_season_spring',
      'hud_season_summer',
      'hud_season_autumn',
      'hud_season_winter',
      'hud_coffee',
      'hud_supplies',
      'hud_reputation',
      'hud_book',
      'hud_stamp',
      'hud_seal',
    ]) {
      expect(slices.has(name), name).toBe(true);
    }
    expect(slices.get('sede')).toEqual({ x: 160, y: 16, w: 112, h: 88 });
    expect(slices.get('house')).toEqual({ x: 0, y: 160, w: 96, h: 80 });
    expect(slices.get('terreiro')).toEqual({ x: 112, y: 160, w: 96, h: 80 });
    expect(slices.get('tulha')).toEqual({ x: 0, y: 368, w: 128, h: 104 });
    expect(slices.get('venda')).toEqual({ x: 128, y: 368, w: 96, h: 64 });
    expect(slices.get('escola')).toEqual({ x: 224, y: 368, w: 96, h: 88 });
    expect(slices.get('forno')).toEqual({ x: 256, y: 480, w: 128, h: 104 });
    expect(slices.get('hud_season_spring')).toEqual({ x: 392, y: 480, w: 24, h: 24 });
    expect(slices.get('hud_stamp')).toEqual({ x: 456, y: 480, w: 48, h: 48 });
    expect(slices.get('coffee_lot_0')).toEqual({ x: 0, y: 256, w: 128, h: 96 });
    expect(slices.get('road_0')).toEqual({ x: 0, y: 352, w: 32, h: 16 });
    expect(slices.get('road_15')).toEqual({ x: 480, y: 352, w: 32, h: 16 });
  });
});
