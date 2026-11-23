/** Touch gestures on the map. A mouse never goes through this path. */

export const TAP_SLOP_PX = 10;

export interface PointerSample {
  id: number;
  x: number;
  y: number;
}

export interface GestureState {
  pointers: PointerSample[];
  mode: 'pending' | 'pan' | 'pinch';
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  pinchDistance: number;
  /** A pinch must not place a building when the last finger lifts. */
  suppressTap: boolean;
}

export type GestureEffect =
  | { type: 'none' }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'pinch'; factor: number; x: number; y: number }
  | { type: 'tap'; x: number; y: number };

export interface GestureStep {
  state: GestureState | null;
  effect: GestureEffect;
}

function pair(pointers: PointerSample[]): [PointerSample, PointerSample] | null {
  const first = pointers[0];
  const second = pointers[1];
  if (!first || !second) return null;
  return [first, second];
}

function distance(a: PointerSample, b: PointerSample): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: PointerSample, b: PointerSample): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function movedPastSlop(state: GestureState, x: number, y: number): boolean {
  const dx = x - state.originX;
  const dy = y - state.originY;
  return dx * dx + dy * dy >= TAP_SLOP_PX * TAP_SLOP_PX;
}

export function gesturePointerDown(state: GestureState | null, sample: PointerSample): GestureStep {
  const pointers = [
    ...(state?.pointers ?? []).filter((pointer) => pointer.id !== sample.id),
    sample,
  ];
  const ends = pair(pointers);
  if (ends) {
    return {
      state: {
        pointers,
        mode: 'pinch',
        originX: sample.x,
        originY: sample.y,
        lastX: sample.x,
        lastY: sample.y,
        pinchDistance: distance(ends[0], ends[1]),
        suppressTap: true,
      },
      effect: { type: 'none' },
    };
  }
  return {
    state: {
      pointers,
      mode: 'pending',
      originX: sample.x,
      originY: sample.y,
      lastX: sample.x,
      lastY: sample.y,
      pinchDistance: 0,
      suppressTap: state?.suppressTap ?? false,
    },
    effect: { type: 'none' },
  };
}

export function gesturePointerMove(state: GestureState | null, sample: PointerSample): GestureStep {
  if (!state) return { state, effect: { type: 'none' } };
  const index = state.pointers.findIndex((pointer) => pointer.id === sample.id);
  if (index < 0) return { state, effect: { type: 'none' } };
  const pointers = state.pointers.map((pointer, pointerIndex) =>
    pointerIndex === index ? sample : pointer,
  );
  const ends = pair(pointers);
  if (state.mode === 'pinch' && ends) {
    const next = distance(ends[0], ends[1]);
    const center = midpoint(ends[0], ends[1]);
    const factor = state.pinchDistance > 0 && next > 0 ? next / state.pinchDistance : null;
    return {
      state: { ...state, pointers, pinchDistance: next, suppressTap: true },
      effect:
        factor === null ? { type: 'none' } : { type: 'pinch', factor, x: center.x, y: center.y },
    };
  }
  const mode =
    state.mode === 'pending' && movedPastSlop(state, sample.x, sample.y) ? 'pan' : state.mode;
  if (mode === 'pan') {
    const dx = sample.x - state.lastX;
    const dy = sample.y - state.lastY;
    return {
      state: { ...state, pointers, mode, lastX: sample.x, lastY: sample.y },
      effect: dx === 0 && dy === 0 ? { type: 'none' } : { type: 'pan', dx, dy },
    };
  }
  return {
    state: { ...state, pointers, lastX: sample.x, lastY: sample.y },
    effect: { type: 'none' },
  };
}

export function gesturePointerUp(
  state: GestureState | null,
  id: number,
  commitTap = true,
): GestureStep {
  if (!state) return { state: null, effect: { type: 'none' } };
  const lifted = state.pointers.find((pointer) => pointer.id === id);
  const pointers = state.pointers.filter((pointer) => pointer.id !== id);
  if (!lifted) return { state, effect: { type: 'none' } };
  const ends = pair(pointers);
  if (ends) {
    return {
      state: {
        ...state,
        pointers,
        mode: 'pinch',
        pinchDistance: distance(ends[0], ends[1]),
        suppressTap: true,
      },
      effect: { type: 'none' },
    };
  }
  const remaining = pointers[0];
  if (remaining) {
    return {
      state: {
        ...state,
        pointers,
        mode: 'pending',
        originX: remaining.x,
        originY: remaining.y,
        lastX: remaining.x,
        lastY: remaining.y,
        pinchDistance: 0,
        suppressTap: true,
      },
      effect: { type: 'none' },
    };
  }
  const tap =
    commitTap &&
    state.mode === 'pending' &&
    !state.suppressTap &&
    !movedPastSlop(state, lifted.x, lifted.y);
  return {
    state: null,
    effect: tap ? { type: 'tap', x: lifted.x, y: lifted.y } : { type: 'none' },
  };
}
