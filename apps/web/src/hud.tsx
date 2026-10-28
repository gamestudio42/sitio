import { Logo, useStore } from '@sitio/chrome';
import type { SitioFullState } from '@sitio/simulation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LOCALES, LOCALE_LABELS, type Locale, type Strings } from './i18n';
import { AtlasSprite } from './portrait';
import type { SitioSession } from './session';

const MARK = `${import.meta.env.BASE_URL}favicon.svg`;

type PixelIconName =
  | 'families'
  | 'coins'
  | 'food'
  | 'wood'
  | 'fertilizer'
  | 'limestone'
  | 'clock'
  | 'price';

const PIXEL_ICONS: Record<PixelIconName, ReactNode> = {
  families: (
    <>
      <rect x="3" y="2" width="4" height="4" />
      <rect x="9" y="2" width="4" height="4" />
      <rect x="2" y="7" width="6" height="2" />
      <rect x="8" y="7" width="6" height="2" />
      <rect x="2" y="9" width="2" height="5" />
      <rect x="6" y="9" width="2" height="5" />
      <rect x="8" y="9" width="2" height="5" />
      <rect x="12" y="9" width="2" height="5" />
    </>
  ),
  coins: (
    <>
      <path d="M6 1h4v1h2v1h1v1h1v2h1v4h-1v2h-1v1h-1v1h-2v1H6v-1H4v-1H3v-1H2v-2H1V6h1V4h1V3h1V2h2Z" opacity=".28" />
      <path d="M7 2h2v1h1v1h1v1h1v2h1v2h-1v2h-1v1h-1v1h-1v1H7v-1H5v-1H4v-1H3v-2H2V7h1V5h1V4h1V3h2Z" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="5" y="9" width="6" height="2" />
    </>
  ),
  food: (
    <>
      <rect x="7" y="2" width="2" height="13" />
      <rect x="4" y="4" width="3" height="2" />
      <rect x="9" y="6" width="3" height="2" />
      <rect x="5" y="8" width="3" height="2" />
      <rect x="9" y="10" width="3" height="2" />
      <rect x="5" y="14" width="6" height="2" />
    </>
  ),
  wood: (
    <>
      <path d="M2 8h12l2 4-2 4H2Z" opacity=".35" />
      <path d="M3 9h10l1 3-1 3H3Z" />
      <rect x="6" y="9" width="2" height="6" opacity=".35" />
      <rect x="10" y="9" width="2" height="6" opacity=".35" />
      <rect x="13" y="10" width="2" height="4" />
    </>
  ),
  fertilizer: (
    <>
      <path d="M5 5h8l1 3v7H4V8Z" />
      <rect x="7" y="2" width="4" height="3" />
      <rect x="7" y="9" width="4" height="2" opacity=".35" />
      <rect x="8" y="12" width="2" height="2" opacity=".35" />
    </>
  ),
  limestone: (
    <>
      <path d="m3 8 4-5h6l4 5-3 6H6Z" />
      <path d="M7 3 9 8l-3 6M13 3l-2 5 3 6" opacity=".35" />
    </>
  ),
  clock: (
    <>
      <path d="M5 2h6v2h2v2h2v6h-2v2h-2v2H5v-2H3v-2H1V6h2V4h2Z" opacity=".28" />
      <path d="M6 3h4v2h2v2h1v4h-2v2H6v-1H5V5h1Z" />
      <rect x="7" y="5" width="2" height="4" />
      <rect x="8" y="8" width="3" height="2" />
    </>
  ),
  price: (
    <>
      <path d="M2 7V2h6l7 7-5 5-7-7Z" />
      <rect x="4" y="4" width="2" height="2" opacity=".35" />
    </>
  ),
};

function PixelIcon({ name }: { name: PixelIconName }) {
  return (
    <svg
      className="pixel-icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {PIXEL_ICONS[name]}
    </svg>
  );
}

function HudSlot({
  icon,
  label,
  value,
  testId,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  testId: string;
}) {
  return (
    <div
      className="hud-slot"
      data-testid={testId}
      title={label}
      aria-label={label}
    >
      <span className="hud-slot-icon">{icon}</span>
      <span className="hud-slot-value">{value}</span>
      <span className="hud-slot-label">{label}</span>
    </div>
  );
}

function HudSupplies({
  fertilizer,
  limestone,
  t,
}: {
  fertilizer: number;
  limestone: number;
  t: Strings;
}) {
  return (
    <div
      className="hud-slot hud-slot-double"
      data-testid="sitio-resource-supplies"
      title={`${t.fertilizer}: ${fertilizer} · ${t.limestone}: ${limestone}`}
      aria-label={`${t.fertilizer} ${fertilizer}, ${t.limestone} ${limestone}`}
    >
      <span className="hud-slot-icon hud-slot-icon-stack">
        <PixelIcon name="fertilizer" />
        <PixelIcon name="limestone" />
      </span>
      <span className="hud-slot-value hud-slot-value-pair">
        <strong>{fertilizer}</strong>
        <em>/</em>
        <strong>{limestone}</strong>
      </span>
      <span className="hud-slot-label">{t.supplies}</span>
    </div>
  );
}

function HudCoffee({
  stock,
  drying,
  t,
}: {
  stock: number;
  drying: number;
  t: Strings;
}) {
  return (
    <div
      className="hud-slot hud-slot-coffee"
      data-testid="sitio-resource-coffee"
      title={`${t.stock}: ${stock} · ${t.drying}: ${drying}`}
      aria-label={`${t.stock} ${stock}, ${t.drying} ${drying}`}
    >
      <span className="hud-slot-icon">
        <AtlasSprite name="hud_coffee" size={22} label={t.stock} />
      </span>
      <span className="hud-slot-value hud-slot-value-pair">
        <strong>{stock}</strong>
        <em className="hud-drying">
          <PixelIcon name="clock" />
          {drying}
        </em>
      </span>
      <span className="hud-slot-label">{t.stock}</span>
    </div>
  );
}

export function HudBar({
  session,
  state,
  t,
  salePrice,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
  salePrice: number;
}) {
  return (
    <header className="hud" data-testid="sitio-hud">
      <div className="hud-plaque">
        <div className="hud-brand">
          <Logo size={34} title={t.title} markUrl={MARK} />
          <div className="hud-brand-copy">
            <strong>{state.name || t.title}</strong>
            {state.name && state.name !== t.title ? <span>{t.title}</span> : null}
          </div>
        </div>
        <div className="hud-season">
          <AtlasSprite
            name={`hud_season_${state.season}`}
            size={26}
            label={t.season[state.season]}
          />
          <div>
            <strong>{t.season[state.season]}</strong>
            <span>
              {t.month} {state.monthOfSeason} · {t.year} {state.year}
            </span>
          </div>
        </div>
        <span className={`hud-status hud-status-${state.status}`}>
          <AtlasSprite name="hud_seal" size={18} label={t.status[state.status]} />
          <span>{t.status[state.status]}</span>
        </span>
      </div>

      <div className="hud-tally" data-testid="sitio-hud-tally">
        <HudSlot
          icon={<PixelIcon name="families" />}
          label={t.families}
          value={state.families.length}
          testId="sitio-resource-families"
        />
        <HudSlot
          icon={<PixelIcon name="coins" />}
          label={t.coins}
          value={state.coins}
          testId="sitio-resource-coins"
        />
        <HudSlot
          icon={<PixelIcon name="food" />}
          label={t.food}
          value={`${state.food}/${state.foodCapacity}`}
          testId="sitio-resource-food"
        />
        <HudSlot
          icon={<PixelIcon name="wood" />}
          label={t.wood}
          value={state.wood}
          testId="sitio-resource-wood"
        />
        <HudSupplies
          fertilizer={state.inputStock.fertilizer}
          limestone={state.inputStock.limestone}
          t={t}
        />
        <HudCoffee
          stock={state.coffeeDry + state.coffeeRoasted}
          drying={state.coffeeDrying}
          t={t}
        />
        <HudSlot
          icon={<PixelIcon name="price" />}
          label={t.price}
          value={salePrice}
          testId="sitio-resource-price"
        />
        <HudSlot
          icon={<AtlasSprite name="hud_reputation" size={22} label={t.reputation} />}
          label={t.reputation}
          value={state.reputation}
          testId="sitio-resource-reputation"
        />
      </div>

      <div className="hud-actions">
        <TopMenu session={session} t={t} />
      </div>
    </header>
  );
}

function TopMenu({ session, t }: { session: SitioSession; t: Strings }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const locale = useStore(session.ui, (state) => state.locale);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="hud-menu" ref={rootRef}>
      <button
        type="button"
        className="hud-menu-trigger"
        data-testid="sitio-top-menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <AtlasSprite name="hud_book" size={22} label={t.menu} />
        <span>{t.menu}</span>
        <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {open ? (
        <div className="hud-menu-panel" role="menu" aria-label={t.menu}>
          <button
            type="button"
            role="menuitem"
            className="hud-menu-item"
            data-testid="sitio-menu-save"
            onClick={() => {
              setOpen(false);
              void session.save();
            }}
          >
            {t.save}
          </button>
          <button
            type="button"
            role="menuitem"
            className="hud-menu-item"
            data-testid="sitio-menu-export"
            onClick={() => {
              setOpen(false);
              session.exportFile();
            }}
          >
            {t.export}
          </button>
          <label className="hud-menu-item file-button">
            {t.import}
            <input
              type="file"
              accept=".json"
              hidden
              data-testid="sitio-menu-import"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then((text) => session.loadFile(text));
                event.target.value = '';
                setOpen(false);
              }}
            />
          </label>
          <div className="hud-menu-divider" />
          <label className="hud-menu-locale">
            <span>{t.language}</span>
            <select
              value={locale}
              data-testid="sitio-menu-locale"
              onChange={(event) => {
                session.setLocale(event.target.value as Locale);
                setOpen(false);
              }}
            >
              {LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <div className="hud-menu-divider" />
          <button
            type="button"
            role="menuitem"
            className="hud-menu-item"
            data-testid="sitio-menu-back"
            onClick={() => {
              setOpen(false);
              session.backToMenu();
            }}
          >
            {t.backToMenu}
          </button>
        </div>
      ) : null}
    </div>
  );
}
