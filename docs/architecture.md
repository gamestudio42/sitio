# Architecture

Sítio is a static browser game. There is no backend: the simulation runs in a
Web Worker on the client, and saves live in IndexedDB or in exported files.

## Packages

| Package                 | Responsibility                                                     | May depend on    |
| ----------------------- | ------------------------------------------------------------------ | ---------------- |
| `packages/kernel`       | RNG, hash, base64, save envelope, command queue, tick runner        | nothing          |
| `packages/bridge`       | Worker clock and RPC inbox                                          | nothing          |
| `packages/view-iso`     | Isometric projection, camera, chunk grid                            | pixi.js          |
| `packages/chrome`       | Store, boot/pause/toasts, Logo, locale, saves                       | react            |
| `packages/simulation`   | Sítio: coffee, families, institutions, `sitio-save`                 | `@sitio/kernel`  |
| `apps/web`              | Sítio web app (renderer, panels, worker host, i18n)                 | simulation+shell |
| `tools/`                | Aseprite export pipeline                                            | nothing          |
| `tests/`                | Unit tests (Vitest) and the end-to-end smoke test                   | the packages     |

Packages expose their TypeScript sources directly (`"exports": "./src/index.ts"`).
Vite, Vitest and `tsx` compile them on the fly, so there is no package build step.

## Static site

`pnpm build` builds `apps/web` into `apps/web/dist`. The app reads `BASE_PATH`
(default `/`) and prefixes its assets with it. GitHub Pages publishes
`apps/web/dist` with `BASE_PATH=/<repository>/`.

`pnpm dev` runs the app on port 5178. `pnpm preview` serves the production build.

IndexedDB and the save envelope use the title name: `sitio-save` v25
(`.sitio.json`).

## Simulation

Sítio is a 24×24 coffee farm on a monthly clock: four seasons, four months per
season and three years, 48 months in total. A new farm starts from the landscape,
not a finished village. The player places the casa grande (3×2), one colono house
(2×2), one terreiro (2×2) and a free 4×2 coffee lot (eight cells, 16 pés). These
placements are free; the calendar is locked until the coffee lot is placed.
Every other building is paid and constructed later. The road and forest are
preserved and there is no road-access rule; roads reject planting, building and
clearing.

A colono house holds one family with two adults and two children. Each person has
one monthly task; routines persist until changed. Children may work only in the
yard, at half adult output: their food feeds the family but never creates a
sellable surplus. A child aged 6 or older may instead study at a completed school. Two
study months educate the child; education persists. At the end of each year every
person ages one year; a 16-year-old becomes an adult and any idle or study
routine becomes yard work. A family is created when its house is placed. An empty
colono house can receive an invited family for 4 coins; invited families are
unrelated to the existing families, so siblings never marry each other. At the
end of each season a new family may also arrive if a house is empty and
reputation is at least 3.

The month is the only clock: validate monthly tasks, apply construction, study and
production, mature or harvest coffee, apply the season event, feed the families,
update stock, wood, money, morale and population, process arrivals, report and
advance. The season controls frost and
drought, not a second simulation. A coffee monthly task covers eight cells (16
pés), the full 4×2 lot. Educated adults count as double units for coffee and
construction and add one extra food per task. Coffee is harvested in autumn as
one batch per harvested cafezal, plus one stray batch per grade for coffee
outside lots. A batch starts wet (`drying`) on the terreiro; each terreiro holds
four batches, and a harvest that finds every slot full is lost. Drying takes one
month. Dry coffee moves automatically into a tulha while it fits (256 sacks);
coffee in the tulha never ages. Dry coffee still on the terreiro ages one month
per month at 100%, 66% and 33% of its value and is discarded after the third
month. Coffee can be sold per batch only when dry or roasted; a venda adds 1 to
the base price. A roast is one adult monthly task that uses one wood and turns
the oldest dry batch into roasted coffee, worth 2 extra coins per sack and never
aging. The monthly report records sacks sold, sale revenue, dried, spoiled and
roasted coffee, roast wood, and the drying, dry and roasted stock. Yard work
yields food per task; families eat two
units per month. Food is stored in one house pantry capped at eight per family;
the player sells it manually at the market, and excess above the cap is wasted.
Hunger reduces morale. Frost damages mature
coffee and drought reduces yard output in the last month of their seasons.
Families leave at morale 0 and the farm is lost when no family remains.

Construction costs coins and wood and takes one work unit per adult per month;
roads also advance one tile per adult per month. The site keeps its progress and
is drawn as a generic canteiro in three stages. A new farm starts
with 4 wood; clearing one forest tile yields 2 wood, and wood can also be bought
at the market for 1 coin each. Houses
and terreiros can be repeated; a tulha, a forno, a venda, an escola and a capela
are unique. The forno is a 2x2 work that costs 5 coins and 2 wood, takes two
months and requires a tulha. The chain is tulha after terreiro, forno after
tulha, venda after tulha, escola after venda and capela after escola. Building
footprints cannot overlap another building, a construction site, coffee, a
planned road or a planting order. A completed building can be demolished for
half of its wood cost; the seat, occupied houses and buildings holding coffee
or families in use cannot be demolished.

Coffee inputs are fertilizer and limestone. Each lot can receive one of each
per crop: fertilizer adds 20 soil quality and one sack per harvested cell;
limestone adds 20 quality. Quality is 40 at base and grades as bad below 50,
medium from 50 to 69 and good at 70 or above. Bad sells for one less than base,
medium at base and good for one more; a venda adds one more. Batches keep their
own grade, amount, age and storage, so every sale preserves the exact batch
price. Applied fertilizer and limestone come from the lot flags; queued tasks
show as pending until the month ends, with the applied state taking priority.

A new coffee lot is a 4×2 order that needs 16 seedlings, bought as four-seedling
bundles for one coin. One adult monthly task completes the order before it becomes
a muda lot. Monthly history records coins, income, expenses and
harvest/stock by grade, and the Reports page draws the financial and production
lines. The interface uses an almanac-style HUD: a wooden farm plaque, a
parchment resource tally, wooden book tabs for Families, Works, Coffee, Market
and Reports, and a wax stamp for ending the month. Market purchases and coffee sales are queued and
applied together at the end of the month; the market page shows pending items,
cost, revenue and net coins before confirmation. Queued purchases reserve their
coins, so buildings and family invitations cannot spend them before the month
ends.

Each resident has one monthly task and one worker on the map. A worker task
carries the output of the old two periods. Clearing is targeted at one forest
tile per task; fertilizer and limestone are global tasks that advance the first
eligible coffee lots in order, one lot per worker per month. Residents whose
monthly task is idle or rest are
removed from the map and leave only floating Zzz above the house. Each adult on
vacation earns one coin for the house. When a construction or planting order
finishes, its workers return home on vacation. Adults and children have a stored
sex and outfit color chosen by the engine RNG; the map and family portrait use
the same sprite variant. Applied fertilizer and limestone put a full icon with a
check above the lot; queued tasks use a faded floating icon. Applied wins when
both would apply. Each lot also shows a clock badge with its first harvest
forecast.

The harvest forecast is a pure calculation from the current coffee crew: it
simulates the same monthly growth and autumn harvest limits, without mutating the
game, and reports both the first and the complete harvest month per lot. It
assumes the current coffee scale and no frost. The construction site is drawn
generically in three progress phases with foundation, materials, scaffolding,
ladder and hoist; planting orders use a separate nursery bed drawing.

Roads are visually planned with the Road tool and saved as a queue. An adult
assigned to Road builds one queued tile per month. Roads cost no coins or wood and
do not gate construction. The school currently educates without a teacher or
staff; staffed institutions are the next stage. The game ends at month 48: the
farm wins if it has six families, a chapel, a school, a shop and morale of at
least 2; otherwise it ends. Development builds also expose a deterministic
“Test farm” preset with every building, six families and coffee in every
processing stage. Saves use `sitio-save` v25 (`.sitio.json`) and store
the coffee batches; older saves are not migrated and must start a new farm.

## Determinism

`packages/kernel` and `packages/simulation` compile with `lib: ["ES2023"]` and no
ambient types, so any accidental use of DOM or Node APIs fails the type check.
ESLint additionally bans `Math.random`, `Date`, `window` and `document` inside
those packages. Every random decision uses the kernel RNG, in a deterministic
order. React components send commands and read state. The renderer never mutates
simulation state.
