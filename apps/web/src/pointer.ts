import { useEffect, useState } from 'react';

/** Phones and tablets: a coarse pointer, or a device that cannot hover. */
const TOUCH_QUERY = '(pointer: coarse), (hover: none)';

export function prefersTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(TOUCH_QUERY).matches;
}

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(prefersTouch);
  useEffect(() => {
    const media = window.matchMedia(TOUCH_QUERY);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return coarse;
}
