# Contributing to Sítio

Thanks for wanting to work on the farm. Code, comments and docs are in English.
Player-facing text lives in `apps/web/src/i18n.ts` (`en`, `pt-BR`, `es`, `fr`,
`de`). English is the type source.

## Quick start

```sh
pnpm install
pnpm dev        # http://localhost:5178
pnpm check      # lint, types, unit tests, production build
pnpm test:e2e   # Playwright smoke test
```

Docker: `docker compose up`.

## Rules that keep the sim honest

1. `packages/kernel` and `packages/simulation` are pure TypeScript: no DOM, no
   Node APIs, no wall-clock time, no `Math.random`, no transcendental `Math`.
   Lint enforces this.
2. React components send commands and read state. They do not contain growth,
   economy or production rules.
3. The renderer never mutates simulation state.
4. Every random decision uses the engine RNG, in a deterministic order.
5. A new farm starts from the landscape: the player places the casa grande, one
   colono house, one terreiro and the starting coffee lot. Every other building
   is constructed later.
6. Interactive elements that tests touch need a `data-testid`.

A fuller map of the repo is in [AGENTS.md](AGENTS.md). The simulation rules are
described in [docs/architecture.md](docs/architecture.md).

## Pull requests

- Keep the change small and covered by a test at the right layer (unit for a
  rule, E2E for UI).
- Run `pnpm check`. Run `pnpm test:e2e` when the UI changes.
- If a rule or constant changes, update the docs and the art notes when needed.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`). Write PR titles and
  bodies in English.
- No new dependency without a written reason in the commit message.
