# AGENTS.md

Guidance for AI agents and humans working on this repository.

## Mission

Build Sítio, an original browser game about a coffee farm that becomes a village.
The player sets the monthly tasks and builds the farm; the simulation decides the
harvest, the families and the year.

## Golden rules

1. `packages/kernel` and `packages/simulation` are pure TypeScript: no DOM, no
   Node APIs, no wall-clock time, no `Math.random`, no transcendental `Math`
   functions. Lint and type check enforce this.
2. React components never contain growth, economy or production rules. They send
   commands and read state.
3. The renderer never mutates simulation state.
4. Every random decision uses the engine RNG, in a deterministic order.
5. A new farm starts from the landscape, not a finished village. The player
   places the casa grande, one colono house, one terreiro and the starting coffee
   lot; every other building is constructed later.
6. Code, comments, technical docs, commit messages and pull requests (title and
   body) are in English. Player-facing text lives in `apps/web/src/i18n.ts`
   (`en`, `pt-BR`, `es`, `fr`, `de`). English is the type source. The first visit
   follows the browser language (or English).

## Commands

```sh
pnpm install          # install dependencies
pnpm dev              # dev server on http://localhost:5178
pnpm lint             # ESLint
pnpm typecheck        # tsc for every package
pnpm test             # unit tests (Vitest)
pnpm test:e2e         # Playwright smoke test (builds and serves the app)
pnpm build            # production build of apps/web
pnpm check            # lint + typecheck + test + build
pnpm art              # export the Aseprite source to the app atlas
pnpm art:draw         # regenerate the .aseprite from tools/art-sitio.lua
```

Docker: `docker compose up` serves the dev build on port 5178.

## Work loop

1. Inspect the existing code before adding new modules.
2. Make a small, testable change.
3. Run `pnpm check`; for UI changes also run `pnpm test:e2e`.
4. Fix regressions before moving on.
5. Commit with a descriptive English message (conventional commits: `feat:`,
   `fix:`, `test:`...). Open pull requests in English (title and body).
6. Update docs when a rule or constant changes.

Never declare a feature done just because it compiles.

## Layout

```
apps/web/              React + Pixi app (renderer, panels, worker host, i18n)
packages/simulation/   Sítio engine, harvest forecast, `sitio-save`
packages/kernel/       RNG, hash, base64, save envelope, command queue
packages/bridge/       Worker clock + RPC inbox
packages/view-iso/     Isometric camera, picking, chunk grid
packages/chrome/       Store, boot/pause/toasts, logo, locale, saves, audio
art/sitio/             Aseprite source of truth and art notes
tests/unit/            Vitest for the simulation and the atlas
tests/e2e/             Playwright smoke test
tools/                 Aseprite export pipeline
```

UI conventions: every interactive element that tests touch has a `data-testid`.
The UI reads the worker state; anything that needs a rule (forecast, placement
preview) calls a pure function exported by `@sitio/simulation`.

## Definition of done

- Behaviour covered by a test at the right layer.
- `pnpm check` green, E2E green for UI changes.
- No new dependency without a written reason in the commit message.
- Docs updated.
