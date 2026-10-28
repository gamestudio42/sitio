import {
  BUILDING_IDS,
  SITIO_SAVE_EXTENSION,
  SITIO_SAVE_VERSION,
  STARTER_FOOTPRINTS,
  demolishRecovery,
  footprintOfBuilding,
  type BuildingKind,
  type InputKind,
  type SitioCommandReason,
  type SitioFullState,
  type StarterKind,
  type WorkTask,
} from '@sitio/simulation';
import {
  AUTOSAVE_ID,
  SaveStore,
  Store,
  slugFileName,
  type ToastItem,
} from '@sitio/chrome';
import { SitioClient } from './client';
import { applyDocumentLocale, bootLocale, catalog, persistLocale, type Locale } from './i18n';
import { SitioRenderer } from './renderer';

export type Screen = 'menu' | 'game';
export type Tool = 'select' | 'road' | 'coffee' | 'demolish' | BuildingKind;
export type Panel = 'families' | 'works' | 'coffee' | 'market' | 'reports';

export interface BootState {
  step: 'graphics' | 'farm' | 'done';
  progress: number;
}

export interface SitioSaveSlot {
  id: string;
  version: number;
  savedAt: string;
  name: string;
  turn: number;
  families: number;
  autosave: boolean;
  bytes: number;
}

export interface SetupPreview {
  kind: StarterKind;
  x: number;
  y: number;
  ok: boolean;
  reason?: SitioCommandReason;
}

export interface PendingLand {
  personId: number;
  kind: 'plant' | 'clear';
}

export interface PendingDemolish {
  structureId: number;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  wood: number;
}

export interface SitioUi {
  boot: BootState;
  screen: Screen;
  state: SitioFullState | null;
  locale: Locale;
  name: string;
  seed: string;
  saves: SitioSaveSlot[];
  toasts: ToastItem[];
  tool: Tool;
  activePanel: Panel | null;
  selectedTile: { x: number; y: number } | null;
  setupPreview: SetupPreview | null;
  setupPinned: boolean;
  pendingLand: PendingLand | null;
  pendingDemolish: PendingDemolish | null;
  reportOpen: boolean;
  endingOpen: boolean;
}

const store = new SaveStore<SitioSaveSlot>('sitio');

export class SitioSession {
  readonly ui = new Store<SitioUi>({
    boot: { step: 'graphics', progress: 0 },
    screen: 'menu',
    state: null,
    locale: bootLocale(),
    name: 'Sítio',
    seed: 'sitio',
    saves: [],
    toasts: [],
    tool: 'select',
    activePanel: null,
    selectedTile: null,
    setupPreview: null,
    setupPinned: false,
    pendingLand: null,
    pendingDemolish: null,
    reportOpen: false,
    endingOpen: false,
  });
  readonly client = new SitioClient();
  readonly renderer = new SitioRenderer();
  private toastSeq = 1;
  private previewToken = 0;

  constructor() {
    applyDocumentLocale(this.ui.get().locale);
    this.client.subscribe({
      onState: (state) => this.applyState(state),
      onError: (message) => this.toast('error', message),
    });
    this.renderer.setOnTile((x, y) => void this.handleTile(x, y));
    this.renderer.setOnHover((tile) => void this.handleHover(tile));
  }

  async boot(host: HTMLElement): Promise<void> {
    this.ui.set({ boot: { step: 'graphics', progress: 0.2 } });
    await this.renderer.init(host);
    this.ui.set({ boot: { step: 'farm', progress: 0.55 } });
    await this.client.newGame({ name: 'Sítio', seed: 'sitio' });
    this.renderer.setInputEnabled(false);
    await this.refreshSaves();
    this.ui.set({ boot: { step: 'done', progress: 1 } });
  }

  setLocale(locale: Locale): void {
    persistLocale(locale);
    applyDocumentLocale(locale);
    this.ui.set({ locale });
  }

  setName(name: string): void {
    this.ui.set({ name });
  }

  setSeed(seed: string): void {
    this.ui.set({ seed });
  }

  async previewStarter(x: number, y: number, pin = false): Promise<void> {
    const state = this.ui.get().state;
    if (!state?.setup) return;
    const kind = state.setup;
    const footprint = STARTER_FOOTPRINTS[kind];
    const token = ++this.previewToken;
    if (pin) this.ui.set({ setupPinned: true });
    this.renderer.setPlacement({
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      valid: true,
      kind,
    });
    const result = await this.client.starterPreview(kind, x, y);
    if (token !== this.previewToken) return;
    this.ui.set({
      setupPreview: {
        kind,
        x,
        y,
        ok: result.ok,
        reason: result.ok ? undefined : result.reason,
      },
    });
    this.renderer.setPlacement({
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      valid: result.ok,
      kind,
    });
  }

  async previewBuilding(kind: BuildingKind, x: number, y: number): Promise<void> {
    const footprint = footprintOfBuilding(BUILDING_IDS[kind]);
    const token = ++this.previewToken;
    this.renderer.setPlacement({
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      valid: true,
      kind,
    });
    const result = await this.client.buildPreview(kind, x, y);
    if (token !== this.previewToken) return;
    this.renderer.setPlacement({
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      valid: result.ok,
      kind,
    });
  }

  private clearPlacement(): void {
    this.previewToken++;
    this.renderer.setPlacement(null);
  }

  async confirmStarter(): Promise<void> {
    const ui = this.ui.get();
    const preview = ui.setupPreview;
    if (!preview || !ui.setupPinned) return;
    if (!preview.ok) {
      if (preview.reason) this.toast('error', this.reason(preview.reason));
      return;
    }
    const result = await this.client.command({
      type: 'placeStarter',
      kind: preview.kind,
      x: preview.x,
      y: preview.y,
    });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.cancelStarter();
  }

  cancelStarter(): void {
    this.ui.set({ setupPreview: null, setupPinned: false });
    this.clearPlacement();
  }

  setTool(tool: Tool): void {
    this.ui.set({
      tool,
      selectedTile: null,
      pendingLand: null,
      pendingDemolish: null,
    });
    this.clearPlacement();
  }

  setPanel(panel: Panel | null): void {
    this.ui.set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    }));
  }

  private async startGame(options: {
    name: string;
    seed: string;
    preset?: 'test';
  }): Promise<void> {
    this.renderer.setInputEnabled(true);
    this.clearPlacement();
    await this.client.newGame(options);
    this.ui.set({
      screen: 'game',
      tool: 'select',
      activePanel: null,
      selectedTile: null,
      setupPreview: null,
      setupPinned: false,
      pendingLand: null,
      pendingDemolish: null,
      reportOpen: false,
      endingOpen: false,
    });
  }

  async newGame(): Promise<void> {
    const { name, seed } = this.ui.get();
    await this.startGame({ name: name || 'Sítio', seed: seed || 'sitio' });
  }

  async newTestFarm(): Promise<void> {
    const { name } = this.ui.get();
    await this.startGame({ name: name || 'Sítio', seed: 'teste', preset: 'test' });
  }

  async continueLatest(): Promise<void> {
    const latest = this.ui.get().saves[0];
    if (!latest) return;
    const text = await store.read(latest.id);
    await this.loadFile(text);
  }

  async loadSlot(id: string): Promise<void> {
    const text = await store.read(id);
    await this.loadFile(text);
  }

  async loadFile(text: string): Promise<void> {
    const result = await this.client.importSave(text);
    if (!result.ok) {
      this.toast('error', catalog(this.ui.get().locale).invalidSave);
      return;
    }
    const state = this.client.state;
    this.renderer.setInputEnabled(true);
    this.clearPlacement();
    this.ui.set({
      screen: 'game',
      name: result.meta.name,
      seed: result.meta.seed,
      tool: 'select',
      activePanel: null,
      selectedTile: null,
      setupPreview: null,
      setupPinned: false,
      pendingLand: null,
      pendingDemolish: null,
      reportOpen: false,
      endingOpen: state?.status !== 'playing',
    });
    this.toast('info', catalog(this.ui.get().locale).loaded);
  }

  async save(notify = true): Promise<void> {
    if (!this.ui.get().state) return;
    const { text, meta } = await this.client.exportSave(new Date().toISOString());
    await store.write(
      {
        id: AUTOSAVE_ID,
        version: SITIO_SAVE_VERSION,
        savedAt: meta.savedAt,
        name: meta.name,
        turn: meta.turn,
        families: meta.families,
        autosave: true,
        bytes: text.length,
      },
      text,
    );
    await this.refreshSaves();
    if (notify) this.toast('info', catalog(this.ui.get().locale).saved);
  }

  exportFile(): void {
    void this.client.exportSave(new Date().toISOString()).then(({ text, meta }) => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slugFileName(meta.name, SITIO_SAVE_EXTENSION, 'sitio');
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async endMonth(): Promise<void> {
    const before = this.ui.get().state;
    if (!before || before.status !== 'playing') return;
    if (before.setup) {
      this.toast('error', this.reason('setup'));
      return;
    }
    const result = await this.client.command({ type: 'endMonth' });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    const state = this.client.state;
    this.ui.set({
      reportOpen: true,
      endingOpen: state?.status !== 'playing',
      selectedTile: null,
      tool: 'select',
      setupPreview: null,
      pendingLand: null,
      pendingDemolish: null,
    });
    this.clearPlacement();
    await this.save(false);
  }

  async assignTask(personId: number, task: WorkTask): Promise<boolean> {
    const result = await this.client.command({ type: 'assign', personId, task });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return false;
    }
    return true;
  }

  beginLand(kind: 'plant' | 'clear', personId: number): void {
    this.ui.set({ pendingLand: { kind, personId }, activePanel: null });
    this.clearPlacement();
  }

  cancelLand(): void {
    this.ui.set({ pendingLand: null });
    this.clearPlacement();
  }

  async build(kind: BuildingKind, x: number, y: number): Promise<void> {
    const result = await this.client.command({ type: 'build', kind, x, y });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.ui.set({ tool: 'select', selectedTile: null });
    this.clearPlacement();
  }

  selectDemolish(x: number, y: number): void {
    const state = this.ui.get().state;
    const structure = state?.structures.find(
      (entry) =>
        x >= entry.x &&
        y >= entry.y &&
        x < entry.x + entry.w &&
        y < entry.y + entry.h,
    );
    if (!structure) {
      this.toast('error', this.reason('no-structure'));
      return;
    }
    if (structure.kind === 'sede') {
      this.toast('error', this.reason('in-use'));
      return;
    }
    this.ui.set({
      pendingDemolish: {
        structureId: structure.id,
        kind: structure.kind,
        x: structure.x,
        y: structure.y,
        w: structure.w,
        h: structure.h,
        wood: demolishRecovery(structure.kind),
      },
    });
    this.clearPlacement();
  }

  async confirmDemolish(): Promise<void> {
    const pending = this.ui.get().pendingDemolish;
    if (!pending) return;
    const result = await this.client.command({
      type: 'demolish',
      structureId: pending.structureId,
    });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.ui.set({ pendingDemolish: null, tool: 'select' });
    this.clearPlacement();
    this.toast('info', catalog(this.ui.get().locale).demolished);
  }

  cancelDemolish(): void {
    this.ui.set({ pendingDemolish: null });
    this.clearPlacement();
  }

  async sellCoffee(batchId: number, amount: number): Promise<void> {
    const result = await this.client.command({ type: 'sellCoffee', batchId, amount });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).addedToMarket);
  }

  async sellFood(amount: number): Promise<void> {
    const result = await this.client.command({ type: 'sellFood', amount });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).addedToMarket);
  }
  async buyInput(kind: InputKind, amount: number): Promise<void> {
    const result = await this.client.command({ type: 'buyInput', kind, amount });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).addedToMarket);
  }

  async planRoad(x: number, y: number): Promise<void> {
    const result = await this.client.command({ type: 'planRoad', x, y });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
  }

  async clearRoadPlan(): Promise<void> {
    await this.client.command({ type: 'clearRoadPlan' });
  }

  async inviteFamily(): Promise<void> {
    const result = await this.client.command({ type: 'inviteFamily' });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).familyArrived);
  }

  async buyWood(amount: number): Promise<void> {
    const result = await this.client.command({ type: 'buyWood', amount });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).addedToMarket);
  }

  async clearMarketCart(): Promise<void> {
    await this.client.command({ type: 'clearMarketCart' });
  }

  selectTile(x: number, y: number): void {
    this.ui.set({ selectedTile: { x, y } });
  }

  closeReport(): void {
    const state = this.ui.get().state;
    this.ui.set({ reportOpen: false, endingOpen: state ? state.status !== 'playing' : false });
  }

  closeEnding(): void {
    this.ui.set({ endingOpen: false });
  }

  backToMenu(): void {
    this.renderer.setInputEnabled(false);
    this.clearPlacement();
    this.ui.set({
      screen: 'menu',
      selectedTile: null,
      activePanel: null,
      setupPreview: null,
      setupPinned: false,
      pendingLand: null,
      pendingDemolish: null,
      reportOpen: false,
      endingOpen: false,
    });
  }

  toast(kind: ToastItem['kind'], message: string): void {
    const id = this.toastSeq++;
    this.ui.set((state) => ({ toasts: [...state.toasts, { id, kind, message }] }));
    window.setTimeout(() => this.dismissToast(id), 2800);
  }

  dismissToast(id: number): void {
    this.ui.set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  }

  dispose(): void {
    this.client.dispose();
    this.renderer.destroy();
  }

  async previewCoffee(x: number, y: number): Promise<void> {
    const token = ++this.previewToken;
    this.renderer.setPlacement({
      x,
      y,
      w: 4,
      h: 2,
      valid: true,
      kind: 'coffee',
    });
    const result = await this.client.coffeePreview(x, y);
    if (token !== this.previewToken) return;
    this.renderer.setPlacement({
      x,
      y,
      w: 4,
      h: 2,
      valid: result.ok,
      kind: 'coffee',
    });
  }

  async plantCoffeeLot(x: number, y: number): Promise<void> {
    const result = await this.client.command({ type: 'plantCoffeeLot', x, y });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.clearPlacement();
    this.toast('info', catalog(this.ui.get().locale).coffeeLotQueued);
  }

  async buySeedlings(amount: number): Promise<void> {
    const result = await this.client.command({ type: 'buySeedlings', amount });
    if (!result.ok) {
      this.toast('error', this.reason(result.reason));
      return;
    }
    this.toast('info', catalog(this.ui.get().locale).addedToMarket);
  }

  private async handleTile(x: number, y: number): Promise<void> {
    const ui = this.ui.get();
    const state = ui.state;
    if (!state || state.status !== 'playing' || ui.screen !== 'game') return;
    if (state.setup) {
      await this.previewStarter(x, y, true);
      return;
    }
    if (ui.pendingLand) {
      const ok = await this.assignTask(ui.pendingLand.personId, {
        kind: ui.pendingLand.kind,
        x,
        y,
      });
      if (ok) this.cancelLand();
      return;
    }
    if (ui.tool === 'select') {
      this.selectTile(x, y);
      return;
    }
    if (ui.tool === 'road') {
      await this.planRoad(x, y);
      return;
    }
    if (ui.tool === 'coffee') {
      await this.plantCoffeeLot(x, y);
      return;
    }
    if (ui.tool === 'demolish') {
      this.selectDemolish(x, y);
      return;
    }
    await this.build(ui.tool, x, y);
  }

  private async handleHover(tile: { x: number; y: number } | null): Promise<void> {
    const ui = this.ui.get();
    const state = ui.state;
    if (!state || state.status !== 'playing' || ui.screen !== 'game') {
      this.clearPlacement();
      return;
    }
    if (state.setup) {
      if (ui.setupPinned) return;
      if (!tile) {
        this.clearPlacement();
        return;
      }
      await this.previewStarter(tile.x, tile.y);
      return;
    }
    if (ui.tool === 'demolish') {
      if (!tile) {
        this.clearPlacement();
        return;
      }
      const structure = state.structures.find(
        (entry) =>
          tile.x >= entry.x &&
          tile.y >= entry.y &&
          tile.x < entry.x + entry.w &&
          tile.y < entry.y + entry.h,
      );
      if (!structure) {
        this.clearPlacement();
        return;
      }
      this.renderer.setPlacement({
        x: structure.x,
        y: structure.y,
        w: structure.w,
        h: structure.h,
        valid: false,
      });
      return;
    }
    if (ui.pendingLand || ui.tool === 'select' || ui.tool === 'road' || !tile) {
      this.clearPlacement();
      return;
    }
    if (ui.tool === 'coffee') {
      await this.previewCoffee(tile.x, tile.y);
      return;
    }
    await this.previewBuilding(ui.tool, tile.x, tile.y);
  }

  private applyState(state: SitioFullState): void {
    this.renderer.setState(state);
    this.ui.set({ state });
  }

  private reason(reason: SitioCommandReason): string {
    return catalog(this.ui.get().locale).command[reason];
  }

  private async refreshSaves(): Promise<void> {
    try {
      const slots = await store.list();
      this.ui.set({
        saves: slots.filter((slot) => slot.version === SITIO_SAVE_VERSION),
      });
    } catch {
      this.ui.set({ saves: [] });
    }
  }
}
