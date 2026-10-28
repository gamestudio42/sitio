import {
  BUILDING_SPECS,
  BUILDING_VENDA,
  COFFEE_LOT_SEEDLINGS,
  COFFEE_MAX_DRY_MONTHS,
  coffeeAgeMultiplier,
  coffeeBatchValue,
  coffeeHarvestForecast,
  coffeeWorkingLotIds,
  EDUCATION_PERIODS,
  FAMILY_INVITE_COST,
  FAMILY_NEED,
  FOOD_SELL_PRICE,
  INPUT_PRICES,
  SEEDLING_BUNDLE_PRICE,
  SEEDLING_BUNDLE_SIZE,
  STARTER_FOOTPRINTS,
  TULHA_CAPACITY,
  WOOD_BUY_PRICE,
  type BuildingKind,
  type CoffeeBatch,
  type CoffeePlantOrder,
  type Family,
  type InputKind,
  type Person,
  type SetupStep,
  type SitioFullState,
  type WorkTask,
} from '@sitio/simulation';
import {
  BootView,
  LocaleSelect,
  Logo,
  Toasts,
  useStore,
} from '@sitio/chrome';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fieldMarkers } from './actors';
import { HudBar } from './hud';
import { LOCALES, LOCALE_LABELS, useStrings, type Strings } from './i18n';
import { AtlasSprite, FamilyPortraits, GuidePortrait } from './portrait';
import { SitioSession, type Panel, type PendingDemolish } from './session';

const MARK = `${import.meta.env.BASE_URL}favicon.svg`;

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<SitioSession | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const next = new SitioSession();
    setSession(next);
    void next.boot(host);
    return () => next.dispose();
  }, []);

  return (
    <div className="app">
      <div ref={hostRef} className="viewport" />
      {session ? <Screens session={session} /> : null}
    </div>
  );
}

function Screens({ session }: { session: SitioSession }) {
  const screen = useStore(session.ui, (state) => state.screen);
  const toasts = useStore(session.ui, (state) => state.toasts);
  const boot = useStore(session.ui, (state) => state.boot);
  return (
    <>
      {screen === 'menu' ? <Menu session={session} /> : <Game session={session} />}
      <Toasts toasts={toasts} onDismiss={(id) => session.dismissToast(id)} />
      {boot.step !== 'done' ? <Boot session={session} /> : null}
    </>
  );
}

function Boot({ session }: { session: SitioSession }) {
  const boot = useStore(session.ui, (state) => state.boot);
  const t = useStrings(session.ui);
  return (
    <BootView
      stepLabel={t.boot[boot.step]}
      progress={boot.progress}
      leaving={boot.step === 'done'}
      step={boot.step}
    >
      <Logo size={96} title={t.title} markUrl={MARK} />
    </BootView>
  );
}

function LocalePicker({ session }: { session: SitioSession }) {
  const t = useStrings(session.ui);
  const locale = useStore(session.ui, (state) => state.locale);
  return (
    <LocaleSelect
      locales={LOCALES}
      labels={LOCALE_LABELS}
      value={locale}
      onChange={(code) => session.setLocale(code)}
      caption={t.language}
      className="locale-select"
      testId="sitio-locale"
    />
  );
}

function Menu({ session }: { session: SitioSession }) {
  const t = useStrings(session.ui);
  const name = useStore(session.ui, (state) => state.name);
  const seed = useStore(session.ui, (state) => state.seed);
  const saves = useStore(session.ui, (state) => state.saves);
  const latest = saves[0] ?? null;
  return (
    <div className="menu" data-testid="sitio-menu">
      <div className="menu-top">
        <LocalePicker session={session} />
      </div>
      <div className="menu-card">
        <h1>
          <Logo size={56} title={t.title} markUrl={MARK} />
        </h1>
        <p className="subtitle">{t.subtitle}</p>
        <p className="tagline">{t.tagline}</p>
        <label className="field">
          <span>{t.name}</span>
          <input value={name} onChange={(event) => session.setName(event.target.value)} />
        </label>
        <label className="field">
          <span>{t.seed}</span>
          <input value={seed} onChange={(event) => session.setSeed(event.target.value)} />
        </label>
        <div className="menu-actions">
          <button
            type="button"
            className="button primary"
            data-testid="sitio-new"
            onClick={() => void session.newGame()}
          >
            {t.newGame}
          </button>
          {import.meta.env.DEV ? (
            <button
              type="button"
              className="button"
              data-testid="sitio-test-farm"
              onClick={() => void session.newTestFarm()}
            >
              {t.testFarm}
            </button>
          ) : null}
          {latest ? (
            <button
              type="button"
              className="button"
              data-testid="sitio-continue"
              onClick={() => void session.continueLatest()}
            >
              {t.continue}: {latest.name}
            </button>
          ) : null}
        </div>
        <label className="button file-button">
          {t.loadFile}
          <input
            type="file"
            accept=".json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => session.loadFile(text));
              event.target.value = '';
            }}
          />
        </label>
        <section className="saves">
          <h2>{t.savedFarms}</h2>
          {saves.length === 0 ? (
            <p className="muted">{t.noSaves}</p>
          ) : (
            <ul className="save-list">
              {saves.map((slot) => (
                <li key={slot.id}>
                  <div>
                    <strong>{slot.name}</strong>
                    <span className="muted">
                      {t.year} {slot.turn === 0 ? 1 : Math.floor(slot.turn / 16) + 1} ·{' '}
                      {slot.families} {t.families.toLowerCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => void session.loadSlot(slot.id)}
                  >
                    {t.continue}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="credits">
          {t.credits} ·{' '}
          <a
            data-testid="sitio-source"
            href="https://github.com/gamestudio42/sitio"
            target="_blank"
            rel="noreferrer"
          >
            {t.source}
          </a>
        </p>
      </div>
    </div>
  );
}

function Game({ session }: { session: SitioSession }) {
  const t = useStrings(session.ui);
  const state = useStore(session.ui, (ui) => ui.state);
  const tool = useStore(session.ui, (ui) => ui.tool);
  const activePanel = useStore(session.ui, (ui) => ui.activePanel);
  const pendingLand = useStore(session.ui, (ui) => ui.pendingLand);
  const pendingDemolish = useStore(session.ui, (ui) => ui.pendingDemolish);
  const reportOpen = useStore(session.ui, (ui) => ui.reportOpen);
  const endingOpen = useStore(session.ui, (ui) => ui.endingOpen);
  if (!state) return null;

  const salePrice =
    state.coffeePrice +
    (state.buildings.includes(BUILDING_VENDA) ? 1 : 0);

  return (
    <>
      <HudBar session={session} state={state} t={t} salePrice={salePrice} />

      <aside
        className={`side-panel book-panel ${activePanel ? 'open' : ''} ${
          state.setup ? 'setup' : ''
        }`}
        data-panel={activePanel ?? 'none'}
      >
        {state.setup ? (
          <SetupPanel session={session} state={state} t={t} />
        ) : (
          <>
            <div className="book-page-head">
              <strong>{activePanel ? t.panel[activePanel] : t.title}</strong>
              <button type="button" className="button small" onClick={() => session.setPanel(null)}>
                {t.close}
              </button>
            </div>
            {state.yearEvent === 'frost' || state.yearEvent === 'drought' ? (
              <p className={`forecast forecast-${state.yearEvent}`}>
                {t.forecast[state.yearEvent]}
              </p>
            ) : null}

            {pendingLand ? (
              <p className="hint">
                {t.landHint[pendingLand.kind]}{' '}
                <button type="button" className="button small" onClick={() => session.cancelLand()}>
                  {t.cancel}
                </button>
              </p>
            ) : null}

            <div className="panel-section panel-market">
              <MarketSummary session={session} state={state} t={t} salePrice={salePrice} />
              <MarketPanel session={session} state={state} t={t} salePrice={salePrice} />
              <InputMarket session={session} state={state} t={t} />
              <FoodMarket session={session} state={state} t={t} />
              <WoodMarket session={session} state={state} t={t} />
            </div>

            <div className="panel-section panel-families">
            <FamilyGrowth session={session} state={state} t={t} />

            <section>
              <h2>
                {t.families} <span className="count">{state.families.length}</span>
              </h2>
              <div className="family-list">
                {state.families.map((family) => (
                  <FamilyCard
                    key={family.id}
                    family={family}
                    people={state.people.filter((person) => person.familyId === family.id)}
                    sites={state.sites}
                    plantOrders={state.plantOrders}
                    hasSchool={state.structures.some((structure) => structure.kind === 'escola')}
                    hasForno={state.structures.some((structure) => structure.kind === 'forno')}
                    hasDryCoffee={state.coffeeDry > 0}
                    hasRoastWood={state.wood + state.marketCart.wood >= 1}
                    roastBusy={state.people.some((person) => person.task.kind === 'roast')}
                    canFertilize={
                      state.coffeeLots.some((lot) => !lot.fertilized) &&
                      state.inputStock.fertilizer + state.marketCart.fertilizer >= 1
                    }
                    canLime={
                      state.coffeeLots.some((lot) => !lot.limed) &&
                      state.inputStock.limestone + state.marketCart.limestone >= 1
                    }
                    t={t}
                    onAssign={(personId, task) =>
                      void session.assignTask(personId, task)
                    }
                    onLand={(personId, kind) =>
                      session.beginLand(kind, personId)
                    }
                    onCancelLand={() => session.cancelLand()}
                  />
                ))}
                {state.families.length === 0 ? <p className="muted">{t.noFamilies}</p> : null}
              </div>
            </section>
            </div>

            <div className="panel-section panel-works">
            <section>
              <h2>
                <Icon name="canteiro" />
                {t.tools.title}
              </h2>
              <div className="tool-grid">
                <button
                  type="button"
                  className={`button small ${tool === 'select' ? 'active' : ''}`}
                  onClick={() => session.setTool('select')}
                >
                  {t.tools.select}
                </button>
                <button
                  type="button"
                  className={`button small ${tool === 'road' ? 'active' : ''}`}
                  onClick={() => session.setTool('road')}
                >
                  <Icon name="road" /> {t.road}
                </button>
                <button
                  type="button"
                  className={`button small ${tool === 'demolish' ? 'active' : ''}`}
                  data-testid="sitio-tool-demolish"
                  onClick={() => session.setTool('demolish')}
                >
                  <Icon name="demolish" /> {t.tools.demolish}
                </button>
              </div>
              {state.roadPlan.length > 0 ? (
                <p className="hint">
                  {t.roadQueue}: {state.roadPlan.length}{' '}
                  <button
                    type="button"
                    className="button small"
                    onClick={() => void session.clearRoadPlan()}
                  >
                    {t.clear}
                  </button>
                </p>
              ) : null}
              <div className="build-list">
                {(Object.keys(BUILDING_SPECS) as BuildingKind[]).map((kind) => {
                  const spec = BUILDING_SPECS[kind];
                  const lock = buildLock(kind, state);
                  const requirements = [
                    (spec.prereq ?? []).length > 0
                      ? `${t.requires} ${(spec.prereq ?? [])
                          .map((entry) => t.tools[entry])
                          .join(', ')}`
                      : null,
                    spec.unique ? t.unique : null,
                  ].filter((entry): entry is string => Boolean(entry));
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={`button build ${tool === kind ? 'active' : ''} ${
                        lock ? 'locked' : ''
                      }`}
                      data-testid={`sitio-build-${kind}`}
                      disabled={lock !== null}
                      onClick={() => session.setTool(kind)}
                    >
                      <span className="build-title">
                        <Icon name={kind} />
                        {t.tools[kind]}
                      </span>
                      <small>
                        {spec.coins} {t.coins.toLowerCase()} · {spec.wood}{' '}
                        {t.wood.toLowerCase()} · {spec.days} {t.months.toLowerCase()}
                      </small>
                      {requirements.length > 0 ? (
                        <em>{requirements.join(' · ')}</em>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="hint">
                {tool === 'select'
                  ? t.hint
                  : tool === 'road'
                    ? t.hintRoad
                    : tool === 'demolish'
                      ? t.hintDemolish
                      : t.hintBuild}
              </p>
            </section>

            <section>
              <h2>
                <Icon name="canteiro" />
                {t.sites.title}
              </h2>
              {state.sites.length === 0 ? (
                <p className="muted">{t.sites.none}</p>
              ) : (
                <ul className="site-list">
                  {state.sites.map((site) => (
                    <li key={site.id}>
                      <div>
                        <strong>
                          {t.canteiro}: {t.tools[site.kind]}
                        </strong>
                        <span className="muted">
                          {site.progress}/{site.required} {t.sites.progress}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            </div>

            <CoffeePage session={session} state={state} t={t} salePrice={salePrice} />
            <ReportsPage state={state} t={t} />
          </>
        )}
      </aside>

      {!state.setup ? (
        <BookNav session={session} state={state} t={t} activePanel={activePanel} />
      ) : null}

      {reportOpen ? (
        <ReportModal session={session} state={state} t={t} />
      ) : endingOpen ? (
        <EndingModal session={session} state={state} t={t} />
      ) : null}
      {pendingDemolish ? (
        <DemolishModal session={session} pending={pendingDemolish} t={t} />
      ) : null}
    </>
  );
}

function CoffeePage({
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
  const canPlant = state.seedlings >= COFFEE_LOT_SEEDLINGS;
  const forecasts = new Map(
    coffeeHarvestForecast(state).map((forecast) => [forecast.lotId, forecast]),
  );
  const markers = new Map(fieldMarkers(state).map((marker) => [marker.lotId, marker]));
  const workingLots = new Set(coffeeWorkingLotIds(state));
  const terreiroBatches = state.coffeeBatches.filter(
    (batch) => batch.storage === 'terreiro',
  );
  const tulhaBatches = state.coffeeBatches.filter((batch) => batch.storage === 'tulha');
  const hasForno = state.structures.some((structure) => structure.kind === 'forno');
  const forno = BUILDING_SPECS.forno;
  return (
    <div className="panel-section panel-coffee">
      <section className="coffee-actions">
        <h2>
          <Icon name="stock" />
          {t.task.coffee}
        </h2>
        <p className="muted small">
          {t.seedlings}: {state.seedlings}/{COFFEE_LOT_SEEDLINGS}
        </p>
        <button
          type="button"
          className="button primary"
          disabled={!canPlant}
          onClick={() => session.setTool('coffee')}
        >
          {t.task.plantLot}
        </button>
        <p className="hint">{t.plantCoffeeHint}</p>
      </section>
      <section className="coffee-orders">
        <h2>{t.plantingOrders}</h2>
        {state.plantOrders.length === 0 ? (
          <p className="muted">{t.noPlantingOrders}</p>
        ) : (
          <ul className="site-list">
            {state.plantOrders.map((order) => (
              <li key={order.id}>
                <div>
                  <strong>
                    {order.w}×{order.h} · {order.x},{order.y}
                  </strong>
                  <span className="muted">
                    {order.progress}/{order.required} {t.sites.progress}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="coffee-lots">
        <h2>{t.coffeeLots}</h2>
        {state.coffeeLots.length === 0 ? (
          <p className="muted">{t.noCoffeeLots}</p>
        ) : (
          <ul className="coffee-lot-grid">
            {state.coffeeLots.map((lot) => {
              const forecast = forecasts.get(lot.id);
              const marker = markers.get(lot.id);
              return (
                <li key={lot.id} className="coffee-lot-card">
                  <div className="coffee-lot-head">
                    <strong>
                      {lot.w}×{lot.h} · {lot.x},{lot.y}
                    </strong>
                    <span className="lot-badges">
                      {workingLots.has(lot.id) ? (
                        <span className="lot-badge working" title={t.working}>
                          <Icon name="worker" />
                        </span>
                      ) : null}
                      {marker?.fertilizer ? (
                        <span
                          className={`lot-badge ${marker.fertilizer}`}
                          title={
                            marker.fertilizer === 'applied'
                              ? t.fertilized
                              : t.fertilizerQueued
                          }
                        >
                          <Icon name="fertilizer" />
                        </span>
                      ) : null}
                      {marker?.limestone ? (
                        <span
                          className={`lot-badge ${marker.limestone}`}
                          title={
                            marker.limestone === 'applied' ? t.limed : t.limestoneQueued
                          }
                        >
                          <Icon name="limestone" />
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="muted small lot-forecast">
                    <Icon name="clock" />
                    {forecast?.firstHarvestMonth != null
                      ? `${t.firstHarvest}: ${forecast.firstHarvestMonth} ${t.months}`
                      : t.noCoffeeWork}
                    {forecast?.firstHarvestMonth != null &&
                    forecast.completeHarvestMonth != null &&
                    forecast.completeHarvestMonth !== forecast.firstHarvestMonth
                      ? ` · ${t.completeHarvest}: ${forecast.completeHarvestMonth} ${t.months}`
                      : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {state.coffeeLots.length > 0 ? <p className="hint">{t.forecastHint}</p> : null}
      </section>
      <div className="coffee-storage-column">
      <section className="coffee-storage">
        <h2>
          <Icon name="terreiro" />
          {t.terreiroSlots}{' '}
          <span className="count">
            {state.terreiroUsed}/{state.terreiroSlots}
          </span>
        </h2>
        {terreiroBatches.length === 0 ? (
          <p className="muted">{t.report.none}</p>
        ) : (
          <ul className="coffee-batch-list">
            {terreiroBatches.map((batch) => (
              <CoffeeBatchLine
                key={batch.id}
                batch={batch}
                t={t}
                salePrice={salePrice}
                showAge
              />
            ))}
          </ul>
        )}
      </section>
      <section className="coffee-storage">
        <h2>
          <Icon name="tulha" />
          {t.tulhaCapacity}{' '}
          <span className="count">
            {state.tulhaUsed}/{TULHA_CAPACITY}
          </span>
        </h2>
        <p className="muted small">{t.tulhaStable}</p>
        {tulhaBatches.length === 0 ? (
          <p className="muted">{t.noDryCoffee}</p>
        ) : (
          <ul className="coffee-batch-list">
            {tulhaBatches.map((batch) => (
              <CoffeeBatchLine
                key={batch.id}
                batch={batch}
                t={t}
                salePrice={salePrice}
              />
            ))}
          </ul>
        )}
      </section>
      <section className="coffee-storage">
        <h2>
          <Icon name="forno" />
          {t.forno}
        </h2>
        {hasForno ? (
          <>
            <p className="muted small">
              {t.roastWood}: {state.wood + state.marketCart.wood}
            </p>
            <p className="muted small">
              {t.dryCoffee}: {state.coffeeDry} {t.sacks}
            </p>
            <p className="hint">{t.roastHint}</p>
            {state.coffeeDry < 1 ? <p className="muted small">{t.noDryCoffee}</p> : null}
            {state.people.some((person) => person.task.kind === 'roast') ? (
              <p className="muted small">{t.roastBusy}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="muted small">{t.noForno}</p>
            <p className="muted small">
              {forno.coins} {t.coins.toLowerCase()} · {forno.wood}{' '}
              {t.wood.toLowerCase()} · {forno.days} {t.months.toLowerCase()}
            </p>
            <p className="muted small">
              {t.requires} {t.tools.tulha}
            </p>
          </>
        )}
      </section>
      </div>
    </div>
  );
}

function CoffeeBatchLine({
  batch,
  t,
  salePrice,
  showAge = false,
}: {
  batch: CoffeeBatch;
  t: Strings;
  salePrice: number;
  showAge?: boolean;
}) {
  const price = coffeeBatchValue(batch, salePrice);
  const multiplier = Math.round(coffeeAgeMultiplier(batch.ageMonths) * 100);
  return (
    <li className="coffee-batch">
      <span className={`grade grade-${batch.grade}`}>{t.grade[batch.grade]}</span>
      <span className="muted small">
        {batch.amount} {t.sacks}
      </span>
      {batch.stage === 'drying' ? (
        <span className="muted small">{t.drying}</span>
      ) : (
        <>
          {showAge ? (
            <span className="muted small">
              {t.ageMonths}: {batch.ageMonths}
            </span>
          ) : null}
          <span className="muted small">{multiplier}%</span>
          <strong>
            {price} {t.coins.toLowerCase()}
          </strong>
        </>
      )}
      {showAge &&
      batch.stage === 'dry' &&
      batch.ageMonths >= COFFEE_MAX_DRY_MONTHS - 1 ? (
        <span className="warning small">
          {t.spoilsIn}: 1 {t.months}
        </span>
      ) : null}
    </li>
  );
}
function ReportsPage({ state, t }: { state: SitioFullState; t: Strings }) {
  const history = state.history;
  return (
    <div className="panel-section panel-reports">
      <section>
        <h2>
          <Icon name="chart" />
          {t.finance}
        </h2>
        {history.length === 0 ? (
          <p className="muted">{t.noHistory}</p>
        ) : (
          <LineChart
            labels={[t.balance, t.income, t.expenses]}
            colors={['#b7791f', '#4f7a3a', '#a33f2f']}
            series={[
              history.map((point) => point.coins),
              history.map((point) => point.income),
              history.map((point) => point.expenses),
            ]}
            monthLabel={t.month}
          />
        )}
      </section>
      <section>
        <h2>
          <Icon name="chart" />
          {t.production}
        </h2>
        {history.length === 0 ? (
          <p className="muted">{t.noHistory}</p>
        ) : (
          <LineChart
            labels={[t.grade.bad, t.grade.medium, t.grade.good]}
            colors={['#a33f2f', '#8a6a2a', '#4f7a3a']}
            series={[
              history.map((point) => point.harvest.bad),
              history.map((point) => point.harvest.medium),
              history.map((point) => point.harvest.good),
            ]}
            monthLabel={t.month}
          />
        )}
      </section>
    </div>
  );
}

function LineChart({
  labels,
  colors,
  series,
  monthLabel,
}: {
  labels: string[];
  colors: string[];
  series: number[][];
  monthLabel: string;
}) {
  const count = Math.max(1, series[0]?.length ?? 0);
  const maximum = Math.max(1, ...series.flat());
  const x = (index: number) => 12 + (index * 296) / Math.max(1, count - 1);
  const y = (value: number) => 132 - (value / maximum) * 112;
  return (
    <div className="line-chart">
      <svg viewBox="0 0 320 160" role="img" aria-label={labels.join(', ')}>
        <line x1="12" y1="132" x2="308" y2="132" stroke="#5a4330" />
        <line x1="12" y1="20" x2="12" y2="132" stroke="#5a4330" />
        {series.map((values, index) => (
          <polyline
            key={labels[index]}
            fill="none"
            stroke={colors[index]}
            strokeWidth="2"
            points={values.map((value, point) => `${x(point)},${y(value)}`).join(' ')}
          />
        ))}
      </svg>
      <p className="muted small">
        {monthLabel} 1–{count} · {maximum}
      </p>
      <div className="chart-legend">
        {labels.map((label, index) => (
          <span key={label}>
            <i style={{ background: colors[index] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BookNav({
  session,
  state,
  t,
  activePanel,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
  activePanel: Panel | null;
}) {
  const tabs: { key: Panel; label: string; icon: IconName }[] = [
    { key: 'families', label: t.families, icon: 'families' },
    { key: 'works', label: t.tools.title, icon: 'canteiro' },
    { key: 'coffee', label: t.task.coffee, icon: 'stock' },
    { key: 'market', label: t.market, icon: 'market' },
    { key: 'reports', label: t.reports, icon: 'chart' },
  ];
  return (
    <>
      <nav className="hud-tabs" aria-label={t.title}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`hud-tab ${activePanel === tab.key ? 'active' : ''}`}
            aria-pressed={activePanel === tab.key}
            data-testid={`sitio-hud-tab-${tab.key}`}
            onClick={() => session.setPanel(tab.key)}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="hud-end-month"
        data-testid="sitio-end-month"
        disabled={state.status !== 'playing'}
        title={t.endSeason}
        onClick={() => void session.endMonth()}
      >
        <AtlasSprite name="hud_stamp" size={42} label={t.endSeason} />
        <span>{t.endSeason}</span>
        <span className="hud-month-marks" aria-hidden="true">
          {[1, 2, 3, 4].map((mark) => (
            <i key={mark} className={mark <= state.monthOfSeason ? 'on' : ''} />
          ))}
        </span>
      </button>
    </>
  );
}

type IconName =
  | 'families'
  | 'coins'
  | 'food'
  | 'wood'
  | 'fertilizer'
  | 'limestone'
  | 'road'
  | 'demolish'
  | 'canteiro'
  | 'stock'
  | 'price'
  | 'reputation'
  | 'market'
  | 'chart'
  | 'clock'
  | 'house'
  | 'terreiro'
  | 'tulha'
  | 'forno'
  | 'capela'
  | 'venda'
  | 'escola'
  | 'worker'
  | 'idle'
  | 'rest'
  | 'yard'
  | 'coffee'
  | 'study'
  | 'roast'
  | 'build'
  | 'plantLot'
  | 'clear'
  | 'plant'
  | 'chevron';

const ICON_PATHS: Record<Exclude<IconName, 'chevron'>, ReactNode> = {
  families: (
    <>
      <circle cx="9" cy="8" r="2.6" />
      <path d="M4 19c0-3 2.2-5 5-5s5 2 5 5" />
      <circle cx="17" cy="9" r="2" />
      <path d="M15 19c0-2.2 1.5-3.8 3.5-3.8S22 16.8 22 19" />
    </>
  ),
  coins: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6M12 9v6" />
    </>
  ),
  food: (
    <>
      <path d="M12 21V8" />
      <path d="M12 13c-4 0-6-2-6-6 4 0 6 2 6 6Z" />
      <path d="M12 10c4 0 6-2 6-6-4 0-6 2-6 6Z" />
    </>
  ),
  wood: (
    <>
      <path d="M5 7h11l3 5-3 5H5Z" />
      <path d="M9 7v10M13 7v10" />
    </>
  ),
  fertilizer: (
    <>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V5h6v3M10 12h4M10 16h4" />
    </>
  ),
  limestone: (
    <>
      <path d="m4 12 4-6h8l4 6-8 8-8-8Z" />
      <path d="m8 6 4 6 4-6M12 12v8" />
    </>
  ),
  road: (
    <>
      <path d="M5 21 8 3M19 21l-3-18" />
      <path d="M12 5v3M12 12v3M12 19v2" />
    </>
  ),
  demolish: (
    <>
      <path d="m14 3 7 7-4 4-7-7z" />
      <path d="m12 5-9 9 4 4 9-9" />
      <path d="m5 16-2 5 5-2" />
    </>
  ),
  canteiro: (
    <>
      <path d="M4 20h16M6 20V9l6-4 6 4v11" />
      <path d="M9 20v-5h6v5M9 11h6" />
    </>
  ),
  stock: (
    <>
      <ellipse cx="12" cy="12" rx="6" ry="8" transform="rotate(35 12 12)" />
      <path d="M8.5 15.5c2.5-2.5 4.5-4.5 7-7" />
    </>
  ),
  price: (
    <>
      <path d="M4 12V5h7l9 9-6 6-10-8Z" />
      <circle cx="8" cy="9" r="1.2" />
    </>
  ),
  reputation: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9L12 3Z" />,
  market: (
    <>
      <path d="M4 10h16l-1 10H5L4 10Z" />
      <path d="M7 10V7l2-3h6l2 3v3" />
      <path d="M4 10c0 1.5 1 2.5 2.3 2.5S9 11.5 9 10c0 1.5 1 2.5 2.3 2.5s2.4-1 2.4-2.5c0 1.5 1 2.5 2.3 2.5S18 11.5 18 10c0 1.5 1 2.5 2 2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  house: (
    <>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  terreiro: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 12h16M12 4v16M8 4v4M16 4v4M8 16v4M16 16v4" />
    </>
  ),
  tulha: (
    <>
      <path d="M4 8h16v12H4z" />
      <path d="M4 8l4-4h8l4 4M9 12h6v8H9z" />
    </>
  ),
  forno: (
    <>
      <path d="M3 21h18v-8H3z" />
      <path d="M7 13a5 5 0 0 1 10 0" />
      <path d="M15 13V6h3v7" />
      <path d="M9 21v-4h6v4" />
    </>
  ),
  capela: (
    <>
      <path d="M5 21V10l7-5 7 5v11H5Z" />
      <path d="M12 9v6M9 12h6" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  venda: (
    <>
      <path d="M4 10h16l-1 10H5L4 10Z" />
      <path d="M7 10V7h10v3M8 10v10M16 10v10" />
    </>
  ),
  escola: (
    <>
      <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
      <path d="M8 8h1M17 8h1M8 11h1M17 11h1" />
    </>
  ),
  worker: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21c0-4 2.7-7 6-7s6 3 6 7" />
    </>
  ),
  idle: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M9 12h6" />
    </>
  ),
  rest: <path d="M20 14a8 8 0 1 1-9-9 6 6 0 0 0 9 9Z" />,
  yard: (
    <>
      <path d="M12 21V9" />
      <path d="M12 13c-4 0-6-2-6-6 4 0 6 2 6 6Z" />
      <path d="M12 10c4 0 6-2 6-6-4 0-6 2-6 6Z" />
    </>
  ),
  coffee: (
    <>
      <path d="M7 9c0-3 2-5 5-5s5 2 5 5-2 9-5 9-5-6-5-9Z" />
      <path d="M9 10c2 1 4 1 6 0" />
    </>
  ),
  study: (
    <>
      <path d="M5 5h6v14H5zM13 5h6v14h-6z" />
      <path d="M11 5v14" />
    </>
  ),
  roast: (
    <path d="M12 21c4 0 7-3 7-7 0-3-2-5-4-7 1 3-1 5-3 5 1-2 0-5-2-7 0 4-5 6-5 11 0 3 3 5 7 5Z" />
  ),
  build: (
    <>
      <path d="M4 20 15 9" />
      <path d="m13 4 7 7-3 3-7-7z" />
    </>
  ),
  plantLot: (
    <>
      <path d="M12 21v-7" />
      <path d="M8 21h8" />
      <path d="M12 14c-4 0-6-2-6-6 4 0 6 2 6 6Z" />
      <path d="M12 11c4 0 6-2 6-6-4 0-6 2-6 6Z" />
    </>
  ),
  clear: (
    <>
      <path d="M4 20 16 8" />
      <path d="m14 4 6 6-3 3-6-6z" />
    </>
  ),
  plant: (
    <>
      <path d="M12 21v-7" />
      <path d="M8 21h8" />
      <path d="M12 14c-4 0-6-2-6-6 4 0 6 2 6 6Z" />
    </>
  ),
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'chevron' ? (
        <path d="m6 9 6 6 6-6" />
      ) : (
        ICON_PATHS[name]
      )}
    </svg>
  );
}

function buildLock(kind: BuildingKind, state: SitioFullState): 'unique' | 'prereq' | null {
  const spec = BUILDING_SPECS[kind];
  if (
    spec.unique &&
    (state.structures.some((structure) => structure.kind === kind) ||
      state.sites.some((site) => site.kind === kind))
  ) {
    return 'unique';
  }
  if (
    (spec.prereq ?? []).some(
      (required) => !state.structures.some((structure) => structure.kind === required),
    )
  ) {
    return 'prereq';
  }
  return null;
}

function MarketPanel({
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
  const dry = state.coffeeBatches.filter((batch) => batch.stage === 'dry');
  const roasted = state.coffeeBatches.filter((batch) => batch.stage === 'roasted');
  const reserved = (batchId: number) =>
    state.marketCart.coffee
      .filter((sale) => sale.batchId === batchId)
      .reduce((sum, sale) => sum + sale.amount, 0);
  const row = (batch: CoffeeBatch) => {
    const already = reserved(batch.id);
    const available = batch.amount - already;
    return (
      <li key={batch.id}>
        <span className={`grade grade-${batch.grade}`}>{t.grade[batch.grade]}</span>
        <span className="muted small">
          {batch.amount} {t.sacks}
        </span>
        {batch.stage === 'dry' ? (
          <span className="muted small">
            {t.ageMonths}: {batch.ageMonths}
          </span>
        ) : null}
        {already > 0 ? (
          <span className="muted small">
            +{already} {t.monthEnd}
          </span>
        ) : null}
        <strong>
          {coffeeBatchValue(batch, salePrice)} {t.coins.toLowerCase()}
        </strong>
        <button
          type="button"
          className="button small"
          disabled={available < 1}
          onClick={() => void session.sellCoffee(batch.id, available)}
        >
          {t.sellAll}
        </button>
      </li>
    );
  };
  return (
    <section>
      <h2>
        <Icon name="stock" />
        {t.marketCoffee} <span className="count">{state.coffeeStock}</span>
      </h2>
      <p className="muted small">{t.readyToSell}</p>
      {dry.length === 0 && roasted.length === 0 ? (
        <p className="muted">{t.noCoffeeReady}</p>
      ) : (
        <>
          {dry.length > 0 ? (
            <>
              <h3>{t.dryCoffee}</h3>
              <ul className="grade-list">{dry.map(row)}</ul>
            </>
          ) : null}
          {roasted.length > 0 ? (
            <>
              <h3>{t.roastedCoffee}</h3>
              <ul className="grade-list">{roasted.map(row)}</ul>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function InputMarket({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const inputRow = (kind: InputKind) => (
    <li key={kind}>
      <span>
        <Icon name={kind} /> {kind === 'fertilizer' ? t.fertilizer : t.limestone}
      </span>
      <span className="muted small">
        {INPUT_PRICES[kind]} {t.coins.toLowerCase()}
      </span>
      <button
        type="button"
        className="button small"
        disabled={state.availableCoins < INPUT_PRICES[kind]}
        onClick={() => void session.buyInput(kind, 1)}
      >
        {t.buy}
      </button>
    </li>
  );
  return (
    <section>
      <h2>
        <Icon name="market" />
        {t.inputMarket}
      </h2>
      <ul className="input-list">
        {inputRow('fertilizer')}
        {inputRow('limestone')}
        <li>
          <span>
            <Icon name="stock" /> {t.seedlings}
          </span>
          <span className="muted small">
            {SEEDLING_BUNDLE_PRICE} {t.coins.toLowerCase()} / {SEEDLING_BUNDLE_SIZE}
          </span>
          <button
            type="button"
            className="button small"
            disabled={state.availableCoins < SEEDLING_BUNDLE_PRICE}
            onClick={() => void session.buySeedlings(SEEDLING_BUNDLE_SIZE)}
          >
            {t.buy}
          </button>
        </li>
      </ul>
    </section>
  );
}

function FoodMarket({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const reserved = state.families.length * FAMILY_NEED + state.marketCart.food;
  const available = Math.max(0, state.food - reserved);
  const [amount, setAmount] = useState(1);
  const value = Math.min(amount, Math.max(1, available));
  const disabled = available < 1;
  return (
    <section>
      <h2>
        <Icon name="food" />
        {t.houseFood} <span className="count">{state.food}/{state.foodCapacity}</span>
      </h2>
      <p className="muted small">
        {t.foodPrice}: {FOOD_SELL_PRICE} {t.coins.toLowerCase()} · {t.availableAfterFood}:{' '}
        {available}
      </p>
      <div className="market-row">
        <input
          type="number"
          min={1}
          max={Math.max(1, available)}
          value={value}
          disabled={disabled}
          aria-label={t.food}
          onChange={(event) => {
            const next = Number(event.target.value);
            setAmount(Number.isFinite(next) ? Math.max(1, Math.min(next, Math.max(1, available))) : 1);
          }}
        />
        <button
          type="button"
          className="button small"
          disabled={disabled}
          onClick={() => void session.sellFood(value)}
        >
          {t.sell}
        </button>
      </div>
    </section>
  );
}
function WoodMarket({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const [amount, setAmount] = useState(1);
  const maximum = Math.max(1, Math.floor(state.availableCoins / WOOD_BUY_PRICE));
  const value = Math.min(amount, maximum);
  const disabled = state.availableCoins < WOOD_BUY_PRICE;
  return (
    <section>
      <h2>
        <Icon name="wood" />
        {t.woodMarket} <span className="count">{state.wood}</span>
      </h2>
      <p className="muted small">
        {t.woodPrice}: {WOOD_BUY_PRICE} {t.coins.toLowerCase()} / {t.wood.toLowerCase()}
      </p>
      <div className="market-row">
        <input
          type="number"
          min={1}
          max={maximum}
          value={value}
          disabled={disabled}
          aria-label={t.wood}
          onChange={(event) => {
            const next = Number(event.target.value);
            setAmount(Number.isFinite(next) ? Math.max(1, Math.min(next, maximum)) : 1);
          }}
        />
        <button
          type="button"
          className="button small"
          disabled={disabled}
          onClick={() => void session.buyWood(value)}
        >
          {t.buy}
        </button>
      </div>
    </section>
  );
}

function MarketSummary({
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
  const cart = state.marketCart;
  const rows: { type: string; label: string; quantity: number; value: number }[] = [];
  if (cart.wood > 0) {
    rows.push({ type: t.buy, label: t.wood, quantity: cart.wood, value: -cart.wood * WOOD_BUY_PRICE });
  }
  if (cart.fertilizer > 0) {
    rows.push({
      type: t.buy,
      label: t.fertilizer,
      quantity: cart.fertilizer,
      value: -cart.fertilizer * INPUT_PRICES.fertilizer,
    });
  }
  if (cart.limestone > 0) {
    rows.push({
      type: t.buy,
      label: t.limestone,
      quantity: cart.limestone,
      value: -cart.limestone * INPUT_PRICES.limestone,
    });
  }
  if (cart.seedlings > 0) {
    rows.push({
      type: t.buy,
      label: t.seedlings,
      quantity: cart.seedlings,
      value: -(cart.seedlings / SEEDLING_BUNDLE_SIZE) * SEEDLING_BUNDLE_PRICE,
    });
  }
  if (cart.food > 0) {
    rows.push({
      type: t.sell,
      label: t.food,
      quantity: cart.food,
      value: cart.food * FOOD_SELL_PRICE,
    });
  }
  for (const sale of cart.coffee) {
    const batch = state.coffeeBatches.find((entry) => entry.id === sale.batchId);
    if (!batch) continue;
    const stage = batch.stage === 'roasted' ? t.roastedCoffee : t.dryCoffee;
    const age =
      batch.stage === 'dry' ? ` · ${batch.ageMonths} ${t.months}` : '';
    rows.push({
      type: t.sell,
      label: `${stage} · ${t.grade[batch.grade]}${age}`,
      quantity: sale.amount,
      value: sale.amount * coffeeBatchValue(batch, salePrice),
    });
  }
  const cost = rows.filter((row) => row.value < 0).reduce((sum, row) => sum - row.value, 0);
  const revenue = rows.filter((row) => row.value > 0).reduce((sum, row) => sum + row.value, 0);
  const net = revenue - cost;
  return (
    <section className="market-summary">
      <h2>{t.marketPreview}</h2>
      {rows.length === 0 ? (
        <p className="muted">{t.report.none}</p>
      ) : (
        <table className="market-cart">
          <thead>
            <tr>
              <th>{t.operation}</th>
              <th>{t.item}</th>
              <th>{t.quantity}</th>
              <th>{t.value}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td>{row.type}</td>
                <td>{row.label}</td>
                <td>{row.quantity}</td>
                <td className={row.value >= 0 ? 'positive' : 'negative'}>
                  {row.value >= 0 ? '+' : ''}
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="market-forecast">
        <span>{t.expenses}: {cost}</span>
        <span>{t.income}: {revenue}</span>
        <strong className={net >= 0 ? 'positive' : 'negative'}>
          {t.net}: {net >= 0 ? '+' : ''}{net} {t.coins.toLowerCase()}
        </strong>
        <span>
          {t.balance}: {state.coins} → {state.coins + net}
        </span>
      </div>
      <p className="hint">{t.marketAtMonthEnd}</p>
      <button
        type="button"
        className="button small"
        disabled={rows.length === 0}
        onClick={() => void session.clearMarketCart()}
      >
        {t.clearCart}
      </button>
    </section>
  );
}

function FamilyGrowth({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const houses = state.structures.filter((structure) => structure.kind === 'house').length;
  const emptyHouses = Math.max(0, houses - state.families.length);
  return (
    <section>
      <h2>
        <Icon name="families" />
        {t.familyGrowth}
      </h2>
      {emptyHouses > 0 ? (
        <>
          <p className="muted small">
            {t.emptyHouse}: {emptyHouses}
          </p>
          <button
            type="button"
            className="button small"
            disabled={state.availableCoins < FAMILY_INVITE_COST}
            onClick={() => void session.inviteFamily()}
          >
            {t.inviteFamily} · {FAMILY_INVITE_COST} {t.coins.toLowerCase()}
          </button>
        </>
      ) : (
        <p className="muted small">{t.needHouse}</p>
      )}
    </section>
  );
}

interface TaskOption {
  key: string;
  label: string;
  icon: IconName;
  task: WorkTask;
  disabled: boolean;
  active: boolean;
  badge?: string;
  land?: 'clear';
}

function taskKey(task: WorkTask): string {
  if (task.kind === 'build') return `build:${task.siteId}`;
  if (task.kind === 'plantLot') return `plantLot:${task.orderId}`;
  if (task.kind === 'clear') return `clear:${task.x},${task.y}`;
  if (task.kind === 'plant') return `plant:${task.x},${task.y}`;
  return task.kind;
}

function monthlyTaskOptions(
  person: Person,
  context: {
    sites: { id: number; kind: BuildingKind; progress: number; required: number }[];
    plantOrders: CoffeePlantOrder[];
    hasSchool: boolean;
    hasForno: boolean;
    hasDryCoffee: boolean;
    hasRoastWood: boolean;
    roastBusy: boolean;
    canFertilize: boolean;
    canLime: boolean;
    t: Strings;
  },
): { options: TaskOption[]; activeLabel: string | null } {
  const {
    sites,
    plantOrders,
    hasSchool,
    hasForno,
    hasDryCoffee,
    hasRoastWood,
    roastBusy,
    canFertilize,
    canLime,
    t,
  } = context;
  const currentKey = taskKey(person.task);
  const options: TaskOption[] = [];
  const add = (
    key: string,
    label: string,
    icon: IconName,
    task: WorkTask,
    disabled = false,
    badge?: string,
    land?: 'clear',
  ) => {
    options.push({
      key,
      label,
      icon,
      task,
      disabled,
      active: currentKey === key,
      badge,
      land,
    });
  };

  add('idle', t.task.idle, 'idle', { kind: 'idle' });
  if (person.age >= 16) {
    add('rest', `${t.task.rest} (+1)`, 'rest', { kind: 'rest' });
    add('yard', t.task.quintal, 'yard', { kind: 'yard' });
    add('coffee', t.task.coffee, 'coffee', { kind: 'coffee' });
    add(
      'fertilize',
      t.task.fertilize,
      'fertilizer',
      { kind: 'fertilize' },
      !canFertilize,
    );
    add(
      'limestone',
      t.task.limestone,
      'limestone',
      { kind: 'limestone' },
      !canLime,
    );
    add('road', t.task.road, 'road', { kind: 'road' });
    add(
      'roast',
      t.task.roast,
      'roast',
      { kind: 'roast' },
      !hasForno || !hasDryCoffee || !hasRoastWood || (roastBusy && currentKey !== 'roast'),
    );
    const clearTask = person.task.kind === 'clear' ? person.task : null;
    add(
      'clear',
      clearTask
        ? `${t.task.clear} (${clearTask.x},${clearTask.y})`
        : t.task.clear,
      'clear',
      clearTask ?? { kind: 'clear', x: 0, y: 0 },
      false,
      undefined,
      'clear',
    );
    const clearOption = options.find((option) => option.key === 'clear');
    if (clearOption) clearOption.active = person.task.kind === 'clear';
    for (const order of plantOrders) {
      add(
        `plantLot:${order.id}`,
        `${t.task.plantLot} (${order.progress}/${order.required})`,
        'plantLot',
        { kind: 'plantLot', orderId: order.id },
        false,
        `${order.progress}/${order.required}`,
      );
    }
    for (const site of sites) {
      add(
        `build:${site.id}`,
        `${t.task.build} ${t.tools[site.kind]} (${site.progress}/${site.required})`,
        'build',
        { kind: 'build', siteId: site.id },
        false,
        `${site.progress}/${site.required}`,
      );
    }
  } else {
    add('yard', t.task.quintal, 'yard', { kind: 'yard' });
    add('study', t.task.study, 'study', { kind: 'study' }, !hasSchool || person.education);
  }

  if (person.task.kind === 'plant') {
    const task = person.task;
    add(taskKey(task), `${t.task.plant} (${task.x},${task.y})`, 'plant', task);
  }

  const active = options.find((option) => option.active);
  return { options, activeLabel: active?.label ?? null };
}

function FamilyCard({
  family,
  people,
  sites,
  plantOrders,
  hasSchool,
  hasForno,
  hasDryCoffee,
  hasRoastWood,
  roastBusy,
  canFertilize,
  canLime,
  t,
  onAssign,
  onLand,
  onCancelLand,
}: {
  family: Family;
  people: Person[];
  sites: { id: number; kind: BuildingKind; progress: number; required: number }[];
  plantOrders: CoffeePlantOrder[];
  hasSchool: boolean;
  hasForno: boolean;
  hasDryCoffee: boolean;
  hasRoastWood: boolean;
  roastBusy: boolean;
  canFertilize: boolean;
  canLime: boolean;
  t: Strings;
  onAssign: (personId: number, task: WorkTask) => void;
  onLand: (personId: number, kind: 'plant' | 'clear') => void;
  onCancelLand: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <article className={`family ${collapsed ? 'collapsed' : ''}`}>
      <header>
        <button
          type="button"
          className="family-toggle"
          aria-expanded={!collapsed}
          title={collapsed ? t.expand : t.collapse}
          onClick={() => setCollapsed((value) => !value)}
        >
          <Icon name="chevron" />
          <strong>{family.name}</strong>
        </button>
        <FamilyPortraits people={people} />
        <span className="morale" title={t.morale}>
          {[0, 1, 2, 3].map((index) => (
            <i key={index} className={index < family.morale ? 'on' : ''} />
          ))}
        </span>
      </header>
      {collapsed ? (
        <p className="muted small">
          {people.length} {t.people}
        </p>
      ) : (
        <ul className="people">
          {people.map((person) => {
            const { options: taskOptions, activeLabel: activeTaskLabel } = monthlyTaskOptions(
              person,
              {
                sites,
                plantOrders,
                hasSchool,
                hasForno,
                hasDryCoffee,
                hasRoastWood,
                roastBusy,
                canFertilize,
                canLime,
                t,
              },
            );
            return (
            <li key={person.id} className="person">
              <div className="person-name">
                <strong>{person.name}</strong>
                <span className="muted small">
                  {person.age >= 16 ? t.adult : t.child} · {person.age}
                  {person.education ? ` · ${t.educated}` : ''}
                </span>
              </div>
              <div className="task-picker">
                <span className="task-picker-label">{t.monthlyTask}</span>
                <div className="task-icons" role="group" aria-label={t.monthlyTask}>
                  {taskOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`task-icon ${option.active ? 'active' : ''}`}
                      data-testid={`sitio-task-${option.key}`}
                      disabled={option.disabled}
                      aria-pressed={option.active}
                      title={option.label}
                      aria-label={option.label}
                      onClick={() => {
                        onCancelLand();
                        if (option.land) {
                          onLand(person.id, option.land);
                        } else {
                          onAssign(person.id, option.task);
                        }
                      }}
                    >
                      <Icon name={option.icon} />
                      {option.badge ? <small>{option.badge}</small> : null}
                    </button>
                  ))}
                </div>
                {activeTaskLabel ? (
                  <span className="task-current">{activeTaskLabel}</span>
                ) : null}
              </div>
              {person.age < 16 ? (
                <span className="muted small">
                  {person.education
                    ? t.educated
                    : `${t.study} ${person.educationProgress}/${EDUCATION_PERIODS}`}
                </span>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
const SETUP_STEPS: SetupStep[] = ['sede', 'house', 'terreiro', 'coffee'];

function SetupPanel({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const preview = useStore(session.ui, (ui) => ui.setupPreview);
  const pinned = useStore(session.ui, (ui) => ui.setupPinned);
  const step = state.setup;
  if (!step) return null;
  const current = SETUP_STEPS.indexOf(step);
  const footprint = STARTER_FOOTPRINTS[step];
  return (
    <section className={`setup-panel ${pinned ? 'pinned' : ''}`}>
      <h2>{t.setup.title}</h2>
      <div className="tutorial-guide" data-testid="sitio-tutorial" data-step={step}>
        <div className="guide-portrait-box">
          <GuidePortrait label={t.setup.guideName} />
        </div>
        <div className="speech-bubble" role="note" aria-live="polite">
          <strong>{t.setup.guideName}</strong>
          <p>{t.setup.guide[step]}</p>
        </div>
      </div>
      <ol className="setup-steps">
        {SETUP_STEPS.map((entry, index) => (
          <li
            key={entry}
            className={index === current ? 'current' : index < current ? 'done' : ''}
          >
            {t.setup.step[entry]}
          </li>
        ))}
      </ol>
      <p>
        <strong>{t.setup.step[step]}</strong> · {footprint.w}×{footprint.h}
      </p>
      <p className={preview?.ok ? 'muted small' : 'warning small'}>
        {preview
          ? preview.ok
            ? pinned
              ? t.setup.blueprint
              : t.setup.fix
            : `${t.setup.invalid} ${t.command[preview.reason ?? 'occupied']}`
          : t.setup.click}
      </p>
      <div className="setup-actions">
        <button
          type="button"
          className="button primary"
          disabled={!preview?.ok || !pinned}
          onClick={() => void session.confirmStarter()}
        >
          {t.setup.confirm}
        </button>
        <button type="button" className="button" onClick={() => session.cancelStarter()}>
          {t.setup.cancel}
        </button>
      </div>
    </section>
  );
}

function DemolishModal({
  session,
  pending,
  t,
}: {
  session: SitioSession;
  pending: PendingDemolish;
  t: Strings;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal" data-testid="sitio-demolish-modal">
        <h2>{t.demolishTitle}</h2>
        <p className="muted">{t.demolishBody}</p>
        <dl className="report-grid">
          <Row label={t.tools[pending.kind]} value={`+${pending.wood} ${t.wood.toLowerCase()}`} />
        </dl>
        <div className="modal-actions">
          <button
            type="button"
            className="button primary"
            data-testid="sitio-demolish-confirm"
            onClick={() => void session.confirmDemolish()}
          >
            {t.demolishConfirm}
          </button>
          <button
            type="button"
            className="button"
            data-testid="sitio-demolish-cancel"
            onClick={() => session.cancelDemolish()}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const report = state.lastReport;
  if (!report) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{t.report.title}</h2>
        <p className="muted">
          {t.season[report.season]} · {t.month} {report.month} · {t.year} {report.year}
        </p>
        <dl className="report-grid">
          {report.harvest > 0 ? <Row label={t.report.harvest} value={report.harvest} /> : null}
          {report.harvestGrades.bad > 0 ? (
            <Row label={`${t.report.harvest} · ${t.grade.bad}`} value={report.harvestGrades.bad} />
          ) : null}
          {report.harvestGrades.medium > 0 ? (
            <Row
              label={`${t.report.harvest} · ${t.grade.medium}`}
              value={report.harvestGrades.medium}
            />
          ) : null}
          {report.harvestGrades.good > 0 ? (
            <Row label={`${t.report.harvest} · ${t.grade.good}`} value={report.harvestGrades.good} />
          ) : null}
          {report.lost > 0 ? <Row label={t.report.lost} value={report.lost} /> : null}
          {report.sold > 0 ? <Row label={t.report.sold} value={report.sold} /> : null}
          {report.stock > 0 ? <Row label={t.report.stock} value={report.stock} /> : null}
          {report.dried > 0 ? <Row label={t.report.dried} value={report.dried} /> : null}
          {report.spoiled > 0 ? <Row label={t.report.spoiled} value={report.spoiled} /> : null}
          {report.roasted > 0 ? <Row label={t.report.roasted} value={report.roasted} /> : null}
          {report.roastWood > 0 ? (
            <Row label={t.report.roastWood} value={report.roastWood} />
          ) : null}
          {report.dryingStock > 0 ? (
            <Row label={t.report.drying} value={report.dryingStock} />
          ) : null}
          {report.dryStock > 0 ? (
            <Row label={t.report.dryStock} value={report.dryStock} />
          ) : null}
          {report.roastedStock > 0 ? (
            <Row label={t.report.roastedStock} value={report.roastedStock} />
          ) : null}
          {report.revenue > 0 ? <Row label={t.report.revenue} value={report.revenue} /> : null}
          {report.price > 0 ? <Row label={t.report.price} value={report.price} /> : null}
          {report.foodProduced > 0 ? (
            <Row label={t.report.foodProduced} value={report.foodProduced} />
          ) : null}
          {report.foodConsumed > 0 ? (
            <Row label={t.report.foodConsumed} value={report.foodConsumed} />
          ) : null}
          {report.foodBought > 0 ? (
            <Row label={t.report.foodBought} value={report.foodBought} />
          ) : null}
          {report.foodSold > 0 ? <Row label={t.report.foodSold} value={report.foodSold} /> : null}
          {report.foodWasted > 0 ? (
            <Row label={t.report.foodWasted} value={report.foodWasted} />
          ) : null}
          {report.restBonus > 0 ? (
            <Row label={t.report.restBonus} value={report.restBonus} />
          ) : null}
          {report.planted > 0 ? <Row label={t.report.planted} value={report.planted} /> : null}
          {report.cleared > 0 ? <Row label={t.report.cleared} value={report.cleared} /> : null}
          {report.studied > 0 ? <Row label={t.report.studied} value={report.studied} /> : null}
          {report.educated > 0 ? <Row label={t.report.educated} value={report.educated} /> : null}
          {report.roads > 0 ? <Row label={t.report.roads} value={report.roads} /> : null}
          {report.fertilized > 0 ? (
            <Row label={t.report.fertilized} value={report.fertilized} />
          ) : null}
          {report.limed > 0 ? <Row label={t.report.limed} value={report.limed} /> : null}
          {report.arrivals > 0 ? <Row label={t.report.arrivals} value={report.arrivals} /> : null}
          {report.departures > 0 ? (
            <Row label={t.report.departures} value={report.departures} />
          ) : null}
          {report.completed.length > 0 ? (
            <Row
              label={t.report.completed}
              value={report.completed.map((kind) => t.tools[kind]).join(', ')}
            />
          ) : null}
          {report.event !== 'none' ? (
            <Row label={t.report.event} value={t.report[report.event]} />
          ) : null}
        </dl>
        {report.hunger ? <p className="warning">{t.report.hunger}</p> : null}
        {report.stalledCoffee > 0 ? (
          <p className="warning">
            {t.report.stalled}: {report.stalledCoffee}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="button primary" onClick={() => session.closeReport()}>
            {t.report.close}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function EndingModal({
  session,
  state,
  t,
}: {
  session: SitioSession;
  state: SitioFullState;
  t: Strings;
}) {
  const title =
    state.status === 'won'
      ? t.ending.wonTitle
      : state.status === 'lost'
        ? t.ending.lostTitle
        : t.ending.endedTitle;
  const body =
    state.status === 'won'
      ? t.ending.wonBody
      : state.status === 'lost'
        ? t.ending.lostBody
        : t.ending.endedBody;
  return (
    <div className="modal-backdrop">
      <div className={`modal ending ending-${state.status}`}>
        <h2>{title}</h2>
        <p>{body}</p>
        <dl className="report-grid">
          <Row label={t.families} value={state.families.length} />
          <Row label={t.report.revenue} value={state.stats.revenueTotal} />
          <Row label={t.report.harvest} value={state.stats.harvestTotal} />
          <Row label={t.report.completed} value={state.stats.builtTotal} />
        </dl>
        <div className="modal-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => {
              session.closeEnding();
              void session.newGame();
            }}
          >
            {t.ending.again}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              session.closeEnding();
              session.backToMenu();
            }}
          >
            {t.ending.menu}
          </button>
        </div>
      </div>
    </div>
  );
}
