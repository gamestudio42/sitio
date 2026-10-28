import { useEffect, useState, type CSSProperties } from 'react';
import { readSlices, type SliceRect } from './atlas';
import './art-preview.css';

interface Sheet {
  image: string;
  width: number;
  height: number;
  items: { name: string; bounds: SliceRect }[];
}

interface Target {
  footprint: string;
  scale: number;
  note?: string;
}

const TARGETS: Record<string, Target> = {
  sede: { footprint: '3×2', scale: 2, note: 'Single-storey casa grande, 112×88 art' },
  house: { footprint: '2×2', scale: 2, note: 'House + horta + galinheiro + varal, 96×80 art' },
  terreiro: { footprint: '2×2', scale: 2, note: 'Drying patio, 96×80 art' },
  tulha: { footprint: '3×3', scale: 2, note: '2×2 storehouse + 5-tile yard, 128×104 art' },
  capela: { footprint: '1×2', scale: 2, note: 'Church with bell tower and cross, 80×112 art' },
  venda: { footprint: '2×1', scale: 2, note: 'Shop with striped awning, 96×64 art' },
  escola: { footprint: '2×2', scale: 2, note: 'Schoolhouse with flagpole, 96×88 art' },
  family: { footprint: '1×1', scale: 1 },
};

function targetFor(name: string): Target {
  if (TARGETS[name]) return TARGETS[name];
  if (name.startsWith('person_')) {
    return { footprint: '1x1', scale: 2, note: 'Actor frame; anchor bottom center' };
  }
  if (name.startsWith('icon_')) {
    return { footprint: '1x1', scale: 2, note: 'Map status icon' };
  }
  if (name.startsWith('coffee_lot_')) {
    return { footprint: '4×2', scale: 2, note: '16 pés, 4 fileiras de 4; arte no jogo, mecânica pendente' };
  }
  if (name.startsWith('road_')) {
    return { footprint: '1×1', scale: 2, note: 'Autotile: N=1, E=2, S=4, W=8' };
  }
  if (name.startsWith('tile_')) return { footprint: '1×1', scale: 2 };
  if (name.startsWith('coffee_')) return { footprint: '1×1', scale: 2 };
  if (name === 'tree') return { footprint: '1×1', scale: 2 };
  return { footprint: '—', scale: 2 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ArtPreview() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const base = import.meta.env.BASE_URL;
        const response = await fetch(`${base}art/sitio.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json: unknown = await response.json();
        const slices = readSlices(json);
        const meta = isRecord(json) && isRecord(json.meta) ? json.meta : {};
        const size = isRecord(meta.size) ? meta.size : {};
        const width = typeof size.w === 'number' ? size.w : 0;
        const height = typeof size.h === 'number' ? size.h : 0;
        const items = [...slices.entries()]
          .map(([name, bounds]) => ({ name, bounds }))
          .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
        if (!cancelled) {
          setSheet({ image: `${base}art/sitio.png`, width, height, items });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="art-preview">
      <header className="art-header">
        <div>
          <p className="eyebrow">Sítio · art preview</p>
          <h1>Sprite sheet</h1>
          <p className="muted">
            `pnpm art` exports the current `.aseprite`. This page reads the same
            `sitio.json` the game loads.
          </p>
        </div>
        <nav>
          <a className="button" href="./">
            Back to the game
          </a>
        </nav>
      </header>

      {error ? <p className="warning">Could not load the atlas: {error}</p> : null}
      {!sheet && !error ? <p className="muted">Loading atlas…</p> : null}

      {sheet ? (
        <>
          <p className="muted small">
            {sheet.width}×{sheet.height} px · {sheet.items.length} slices
          </p>
          <div className="art-grid">
            {sheet.items.map(({ name, bounds }) => {
              const target = targetFor(name);
              return (
                <article className="art-card" id={name} key={name}>
                  <header>
                    <h2>{name}</h2>
                    <p className="muted small">
                      {bounds.w}×{bounds.h} px · footprint {target.footprint} · render{' '}
                      {target.scale}×
                    </p>
                  </header>
                  <div className="art-scales">
                    <figure>
                      <figcaption>2×</figcaption>
                      <Sample sheet={sheet} name={name} bounds={bounds} scale={2} />
                    </figure>
                    <figure>
                      <figcaption>4×</figcaption>
                      <div className="art-sample-scroll">
                        <Sample sheet={sheet} name={name} bounds={bounds} scale={4} />
                      </div>
                    </figure>
                  </div>
                  {target.note ? <p className="muted small">{target.note}</p> : null}
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Sample({
  sheet,
  name,
  bounds,
  scale,
}: {
  sheet: Sheet;
  name: string;
  bounds: SliceRect;
  scale: number;
}) {
  const style: CSSProperties = {
    width: bounds.w * scale,
    height: bounds.h * scale,
    backgroundImage: `url("${sheet.image}")`,
    backgroundSize: `${sheet.width * scale}px ${sheet.height * scale}px`,
    backgroundPosition: `-${bounds.x * scale}px -${bounds.y * scale}px`,
    imageRendering: 'pixelated',
  };
  return <div className="art-sample" style={style} title={`${name} at ${scale}×`} />;
}
