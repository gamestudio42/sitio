import { useEffect, useState, type CSSProperties } from 'react';
import type { Person } from '@sitio/simulation';
import { personSpriteName, spriteName } from './appearance';
import { readSlices, type SliceRect } from './atlas';

interface PortraitAtlas {
  image: string;
  width: number;
  height: number;
  slices: Map<string, SliceRect>;
}

let atlasPromise: Promise<PortraitAtlas | null> | null = null;

function loadAtlas(): Promise<PortraitAtlas | null> {
  if (atlasPromise) return atlasPromise;
  atlasPromise = (async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const response = await fetch(`${base}art/sitio.json`);
      if (!response.ok) return null;
      const json: unknown = await response.json();
      if (typeof json !== 'object' || json === null) return null;
      const meta = (json as { meta?: unknown }).meta;
      if (typeof meta !== 'object' || meta === null) return null;
      const size = (meta as { size?: unknown }).size;
      if (typeof size !== 'object' || size === null) return null;
      const width = (size as { w?: unknown }).w;
      const height = (size as { h?: unknown }).h;
      if (typeof width !== 'number' || typeof height !== 'number') return null;
      const slices = readSlices(json);
      return { image: `${base}art/sitio.png`, width, height, slices };
    } catch {
      return null;
    }
  })();
  return atlasPromise;
}

function usePortraitAtlas(): PortraitAtlas | null {
  const [atlas, setAtlas] = useState<PortraitAtlas | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadAtlas().then((next) => {
      if (!cancelled) setAtlas(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return atlas;
}

export function PersonPortrait({ person }: { person: Person }) {
  const atlas = usePortraitAtlas();
  const frame0 = atlas?.slices.get(personSpriteName(person, 0));
  const frame1 = atlas?.slices.get(personSpriteName(person, 1));
  if (!atlas || !frame0 || !frame1) return <span className="portrait portrait-missing" />;
  const style = {
    backgroundImage: `url("${atlas.image}")`,
    backgroundSize: `${atlas.width}px ${atlas.height}px`,
    '--frame0': `-${frame0.x}px -${frame0.y}px`,
    '--frame1': `-${frame1.x}px -${frame1.y}px`,
  } as CSSProperties & { '--frame0': string; '--frame1': string };
  return <span className="portrait" style={style} title={person.name} />;
}

export function AtlasSprite({
  name,
  size,
  label,
  className = '',
}: {
  name: string;
  size: number;
  label: string;
  className?: string;
}) {
  const atlas = usePortraitAtlas();
  const frame = atlas?.slices.get(name);
  if (!atlas || !frame) {
    return (
      <span
        className={`hud-sprite hud-sprite-missing ${className}`.trim()}
        style={{ width: size, height: size }}
        title={label}
        aria-label={label}
        role="img"
      />
    );
  }
  const scale = size / frame.w;
  const style = {
    width: frame.w * scale,
    height: frame.h * scale,
    backgroundImage: `url("${atlas.image}")`,
    backgroundSize: `${atlas.width * scale}px ${atlas.height * scale}px`,
    backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
  } as CSSProperties;
  return (
    <span
      className={`hud-sprite ${className}`.trim()}
      style={style}
      title={label}
      aria-label={label}
      role="img"
    />
  );
}

export function GuidePortrait({ label }: { label: string }) {
  const atlas = usePortraitAtlas();
  const frame0 = atlas?.slices.get(spriteName('man', '0', 0));
  const frame1 = atlas?.slices.get(spriteName('man', '0', 1));
  if (!atlas || !frame0 || !frame1) {
    return <span className="portrait portrait-missing" title={label} />;
  }
  const style = {
    backgroundImage: `url("${atlas.image}")`,
    backgroundSize: `${atlas.width}px ${atlas.height}px`,
    '--frame0': `-${frame0.x}px -${frame0.y}px`,
    '--frame1': `-${frame1.x}px -${frame1.y}px`,
  } as CSSProperties & { '--frame0': string; '--frame1': string };
  return (
    <span
      className="portrait guide-portrait"
      style={style}
      title={label}
      role="img"
      aria-label={label}
    />
  );
}

export function FamilyPortraits({ people }: { people: Person[] }) {
  return (
    <span className="family-portraits">
      {people.map((person) => (
        <PersonPortrait key={person.id} person={person} />
      ))}
    </span>
  );
}
