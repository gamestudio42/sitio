import {
  decodeSitioSave,
  encodeSitioSave,
  SitioEngine,
  type FromSitioMessage,
  type ToSitioMessage,
} from '@sitio/simulation';
import { stringifySave } from '@sitio/kernel';

interface WorkerScope {
  postMessage(message: FromSitioMessage): void;
  onmessage: ((event: MessageEvent<ToSitioMessage>) => void) | null;
}

const scope = self as unknown as WorkerScope;
let engine: SitioEngine | null = null;

function post(message: FromSitioMessage): void {
  scope.postMessage(message);
}

function publish(): void {
  if (engine) post({ type: 'state', state: engine.fullState() });
}

scope.onmessage = (event) => {
  const message = event.data;
  try {
    switch (message.type) {
      case 'newGame':
        engine = SitioEngine.create(message.options);
        post({ type: 'init', state: engine.fullState() });
        break;
      case 'command': {
        if (!engine) throw new Error('No sítio loaded');
        const result = engine.execute(message.command);
        publish();
        post({ type: 'commandResult', id: message.id, result });
        break;
      }
      case 'starterPreview': {
        if (!engine) throw new Error('No sítio loaded');
        const result = engine.canPlaceStarter(message.kind, message.x, message.y);
        post({ type: 'starterPreviewResult', id: message.id, result });
        break;
      }
      case 'buildPreview': {
        if (!engine) throw new Error('No sítio loaded');
        const result = engine.canPlaceBuilding(message.kind, message.x, message.y);
        post({ type: 'buildPreviewResult', id: message.id, result });
        break;
      }
      case 'coffeePreview': {
        if (!engine) throw new Error('No sítio loaded');
        const result = engine.canPlantCoffeeLot(message.x, message.y);
        post({ type: 'coffeePreviewResult', id: message.id, result });
        break;
      }
      case 'snapshot':
        if (!engine) throw new Error('No sítio loaded');
        post({ type: 'snapshot', id: message.id, snapshot: engine.serialize() });
        break;
      case 'hash':
        if (!engine) throw new Error('No sítio loaded');
        post({ type: 'hash', id: message.id, hash: engine.hash() });
        break;
      case 'exportSave': {
        if (!engine) throw new Error('No sítio loaded');
        const file = encodeSitioSave(engine.serialize(), message.savedAt);
        post({
          type: 'saveData',
          id: message.id,
          text: stringifySave(file),
          meta: engine.meta(message.savedAt),
        });
        break;
      }
      case 'importSave': {
        const decoded = decodeSitioSave(message.text);
        if (!decoded.ok) {
          post({ type: 'loadResult', id: message.id, result: decoded });
          break;
        }
        engine = SitioEngine.fromSnapshot(decoded.snapshot);
        post({ type: 'init', state: engine.fullState() });
        post({
          type: 'loadResult',
          id: message.id,
          result: { ok: true, meta: decoded.meta, migratedFrom: decoded.migratedFrom },
        });
        break;
      }
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
