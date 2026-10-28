<p align="center">
  <img src="apps/web/public/favicon.svg" width="88" alt="Sítio">
</p>

<h1 align="center">Sítio</h1>

<p align="center"><strong>The farm that becomes a village.</strong></p>

<p align="center">
  Coffee pays. The yard keeps the family. The village is what remains.
  A 24×24 coffee farm on a monthly clock, running in the browser.
  No install. Interface in English, Portuguese, Spanish, French and German.
</p>

<p align="center">
  <a href="https://gamestudio42.github.io/sitio/">Play Sítio</a>
</p>

## What it is

A new farm starts from the landscape, not a finished village. Place the casa
grande, one colono house, one terreiro and the starting coffee lot; everything
else is built later. Each colono house holds a family with two adults and two
children. Every person has one monthly task: yard work, coffee, construction,
roads, clearing, fertilizing, limestone or study. Children may work in the yard
at half output or go to school; at sixteen they become adults.

Coffee is harvested in autumn and stored in the terreiro and tulha. Fertilizer
and limestone raise soil quality and grade; a venda raises the price. Food feeds
the families; a hungry family loses morale and leaves. After three years (48
months) the farm wins with six families, a chapel, a school, a shop and morale of
at least 2.

Saves live in IndexedDB or in exported `.sitio.json` files (`sitio-save` v24).

## Develop

```sh
pnpm install
pnpm dev        # http://localhost:5178
```

Or with Docker: `docker compose up`.

| Command         | Description                                         |
| --------------- | --------------------------------------------------- |
| `pnpm check`    | Lint, type check, unit tests and the production build |
| `pnpm test:e2e` | Playwright smoke test (builds and serves the app)   |
| `pnpm art`      | Export `art/sitio/sitio.aseprite` to the app atlas  |
| `pnpm art:draw` | Regenerate the `.aseprite` from `tools/art-sitio.lua` |

Every push to `main` publishes `apps/web/dist` to GitHub Pages. To host it
elsewhere:

```sh
BASE_PATH=/path/ pnpm build
```

## Layout

```
apps/web/            React + Pixi app, worker host, i18n catalogs
packages/simulation/ Sítio engine, forecast, save envelope
packages/kernel/     RNG, hash, base64, save envelope, tick runner
packages/bridge/     Worker clock and RPC inbox
packages/view-iso/   Isometric camera and chunk grid
packages/chrome/     Store, boot/pause/toasts, logo, locale, saves
art/sitio/           Aseprite source of truth for sprites
tools/               Aseprite export pipeline
tests/               Vitest unit tests and Playwright smoke test
```

Docs: [architecture](docs/architecture.md) · [art](art/sitio/README.md) ·
[agents](AGENTS.md) · [contributing](CONTRIBUTING.md)

## Licence

Original code, original pixel art and synthesized sound, MIT licence.
Micropolis (GPLv3) and OpenSC2K were studied as references for behaviour only;
no code or assets were copied.
