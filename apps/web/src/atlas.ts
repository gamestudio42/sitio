export interface SliceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Aseprite writes one sheet frame and a `meta.slices` array. Each slice names
 * a rectangle inside that frame, which is what the game's sprites need.
 */
export function readSlices(data: unknown): Map<string, SliceRect> {
  const slices = new Map<string, SliceRect>();
  if (!isRecord(data) || !isRecord(data.meta) || !Array.isArray(data.meta.slices)) {
    return slices;
  }
  for (const slice of data.meta.slices) {
    if (!isRecord(slice) || typeof slice.name !== 'string' || !Array.isArray(slice.keys)) continue;
    const key = slice.keys[0];
    if (!isRecord(key) || !isRecord(key.bounds)) continue;
    const bounds = key.bounds;
    if (
      typeof bounds.x !== 'number' ||
      typeof bounds.y !== 'number' ||
      typeof bounds.w !== 'number' ||
      typeof bounds.h !== 'number'
    ) {
      continue;
    }
    slices.set(slice.name, { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h });
  }
  return slices;
}
