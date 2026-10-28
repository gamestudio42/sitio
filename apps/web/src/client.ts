import type {
  BuildingKind,
  FromSitioMessage,
  LoadSitioResult,
  NewSitioOptions,
  SitioCommand,
  SitioCommandResult,
  SitioFullState,
  SitioMeta,
  SitioSnapshot,
  StarterKind,
  StarterPreviewResult,
  ToSitioMessage,
} from '@sitio/simulation';
import { emitListeners, RpcInbox } from '@sitio/bridge';

export interface SitioListener {
  onState?(state: SitioFullState): void;
  onError?(message: string): void;
}

export class SitioClient {
  state: SitioFullState | null = null;

  private readonly worker: Worker;
  private readonly listeners = new Set<SitioListener>();
  private readonly rpc = new RpcInbox<FromSitioMessage>();

  constructor() {
    this.worker = new Worker(new URL('./worker/sitio.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<FromSitioMessage>) => this.handle(event.data);
  }

  subscribe(listener: SitioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  newGame(options: NewSitioOptions): Promise<void> {
    return this.rpc.waitInit(() => this.send({ type: 'newGame', options }));
  }

  command(command: SitioCommand): Promise<SitioCommandResult> {
    return this.rpc.request(
      (id) => this.send({ type: 'command', id, command }),
      (message) => (message.type === 'commandResult' ? message.result : undefined),
    );
  }

  starterPreview(kind: StarterKind, x: number, y: number): Promise<StarterPreviewResult> {
    return this.rpc.request(
      (id) => this.send({ type: 'starterPreview', id, kind, x, y }),
      (message) => (message.type === 'starterPreviewResult' ? message.result : undefined),
    );
  }

  buildPreview(kind: BuildingKind, x: number, y: number): Promise<SitioCommandResult> {
    return this.rpc.request(
      (id) => this.send({ type: 'buildPreview', id, kind, x, y }),
      (message) => (message.type === 'buildPreviewResult' ? message.result : undefined),
    );
  }

  coffeePreview(x: number, y: number): Promise<SitioCommandResult> {
    return this.rpc.request(
      (id) => this.send({ type: 'coffeePreview', id, x, y }),
      (message) => (message.type === 'coffeePreviewResult' ? message.result : undefined),
    );
  }

  snapshot(): Promise<SitioSnapshot> {
    return this.rpc.request(
      (id) => this.send({ type: 'snapshot', id }),
      (message) => (message.type === 'snapshot' ? message.snapshot : undefined),
    );
  }

  hash(): Promise<string> {
    return this.rpc.request(
      (id) => this.send({ type: 'hash', id }),
      (message) => (message.type === 'hash' ? message.hash : undefined),
    );
  }

  exportSave(savedAt: string): Promise<{ text: string; meta: SitioMeta }> {
    return this.rpc.request(
      (id) => this.send({ type: 'exportSave', id, savedAt }),
      (message) => (message.type === 'saveData' ? { text: message.text, meta: message.meta } : undefined),
    );
  }

  importSave(text: string): Promise<LoadSitioResult> {
    return this.rpc.request(
      (id) => this.send({ type: 'importSave', id, text }),
      (message) => (message.type === 'loadResult' ? message.result : undefined),
    );
  }

  dispose(): void {
    this.worker.terminate();
  }

  private send(message: ToSitioMessage): void {
    this.worker.postMessage(message);
  }

  private emit<K extends keyof SitioListener>(
    key: K,
    ...args: Parameters<NonNullable<SitioListener[K]>>
  ): void {
    emitListeners(this.listeners, key, ...args);
  }

  private handle(message: FromSitioMessage): void {
    switch (message.type) {
      case 'init':
      case 'state':
        this.state = message.state;
        this.emit('onState', message.state);
        if (message.type === 'init') this.rpc.resolveInit();
        break;
      case 'error':
        this.emit('onError', message.message);
        break;
      default:
        this.rpc.settle(message.id, message);
    }
  }
}
