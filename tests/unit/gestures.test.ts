import { describe, expect, it } from 'vitest';
import {
  TAP_SLOP_PX,
  gesturePointerDown,
  gesturePointerMove,
  gesturePointerUp,
  type GestureState,
} from '../../apps/web/src/gestures';

function down(state: GestureState | null, id: number, x: number, y: number) {
  return gesturePointerDown(state, { id, x, y });
}

describe('map touch gestures', () => {
  it('treats a short press as a tap', () => {
    const started = down(null, 1, 40, 50);
    expect(started.effect).toEqual({ type: 'none' });
    const moved = gesturePointerMove(started.state, { id: 1, x: 44, y: 53 });
    expect(moved.effect).toEqual({ type: 'none' });
    const ended = gesturePointerUp(moved.state, 1);
    expect(ended.state).toBeNull();
    expect(ended.effect).toEqual({ type: 'tap', x: 44, y: 53 });
  });

  it('pans after the finger passes the slop and does not tap', () => {
    const started = down(null, 1, 10, 10);
    const nudged = gesturePointerMove(started.state, {
      id: 1,
      x: 10 + TAP_SLOP_PX,
      y: 10,
    });
    expect(nudged.effect).toEqual({ type: 'pan', dx: TAP_SLOP_PX, dy: 0 });
    const dragged = gesturePointerMove(nudged.state, { id: 1, x: 36, y: 18 });
    expect(dragged.effect).toEqual({ type: 'pan', dx: 16, dy: 8 });
    expect(gesturePointerUp(dragged.state, 1).effect).toEqual({ type: 'none' });
  });

  it('pinches between two fingers and does not place when they lift', () => {
    const first = down(null, 1, 0, 0);
    const second = down(first.state, 2, 100, 0);
    expect(second.state?.mode).toBe('pinch');
    expect(second.state?.suppressTap).toBe(true);
    const spread = gesturePointerMove(second.state, { id: 2, x: 150, y: 0 });
    expect(spread.effect).toEqual({ type: 'pinch', factor: 1.5, x: 75, y: 0 });
    const oneLeft = gesturePointerUp(spread.state, 2);
    expect(oneLeft.effect).toEqual({ type: 'none' });
    expect(oneLeft.state?.suppressTap).toBe(true);
    expect(gesturePointerUp(oneLeft.state, 1).effect).toEqual({ type: 'none' });
  });

  it('drops a cancelled press instead of placing', () => {
    const started = down(null, 1, 8, 8);
    expect(gesturePointerUp(started.state, 1, false).effect).toEqual({ type: 'none' });
  });
});
