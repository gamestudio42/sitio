# Sítio licensing

Copyright (C) 2026 Game Studio 42.

Sítio is a mixed-license repository. The game code is free software under the
GNU Affero General Public License, version 3 or later. Reusable shell libraries
and tools are under the Apache License 2.0. Art, screenshots and documentation
are under Creative Commons attribution. Third-party components keep their own
licenses.

## License map

| Path                                                                                                                                                  | License             | Text                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `apps/web/`, `packages/simulation/`, `tests/`, root build and config files                                                                            | `AGPL-3.0-or-later` | [`LICENSE`](LICENSE)                                                 |
| `packages/kernel/`, `packages/bridge/`, `packages/view-iso/`, `packages/chrome/`                                                                      | `Apache-2.0`        | `LICENSE` in each package                                            |
| `tools/`                                                                                                                                              | `Apache-2.0`        | [`tools/LICENSE`](tools/LICENSE)                                     |
| `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `THIRD-PARTY.md`, `LICENSING.md`, `art/`, `apps/web/public/art/`, `apps/web/public/favicon.svg`, `docs/` | `CC-BY-4.0`         | [`LICENSE-ASSETS`](LICENSE-ASSETS)                                   |
| `apps/web/public/fonts/`                                                                                                                              | `OFL-1.1`           | [`OFL-PixelifySans.txt`](apps/web/public/fonts/OFL-PixelifySans.txt) |

Root build and config files include `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`,
`playwright.config.ts`, `docker-compose.yml` and `.github/`.

More specific paths take precedence over broader ones. For example,
`apps/web/public/art/` is CC-BY-4.0 even though the rest of `apps/web/` is
AGPL-3.0-or-later. The license texts and notices themselves (`LICENSE`,
`LICENSE-ASSETS`, `NOTICE` and the per-package `LICENSE`/`NOTICE` files) are
not relicensed; they state the license that applies to the work.

The AGPL applies to the game as a whole. The Apache-2.0 packages remain
available under Apache-2.0, and the art and documentation remain available
under CC-BY-4.0, with the attribution below.

## AGPL-3.0-or-later

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

The Corresponding Source is available at
<https://github.com/gamestudio42/sitio>.

## Art and documentation

Art, screenshots and documentation are licensed under the Creative Commons
Attribution 4.0 International License (CC-BY-4.0). Attribution: **Game Studio
42**, Sítio, <https://github.com/gamestudio42/sitio>.

## Third-party

See [`THIRD-PARTY.md`](THIRD-PARTY.md). The bundled Pixelify Sans font remains
under the SIL Open Font License 1.1 and is not relicensed by this repository.
