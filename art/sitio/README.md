# Sítio art

`sitio.aseprite` is the source of truth. Edit it in Aseprite (or with the
Aseprite AI Artist MCP), then:

```sh
pnpm art        # export the current .aseprite to sitio.png/json
pnpm art:draw   # regenerate the .aseprite from tools/art-sitio.lua first
```

`pnpm art` never redraws the document, so live edits survive. The game reads
`apps/web/public/art/sitio.png` and `sitio.json`. Open `/?art` in the app for a
2× and 4× preview of every slice.

## Live Aseprite workflow

1. Open Aseprite.
2. Restart OpenCode so the `aseprite-ai-artist` MCP loads.
3. Run `preflight`, then open `art/sitio/sitio.aseprite`.
4. Draw/edit, call `look`, save, then `pnpm art` and check `/?art`.
5. If `preflight` reports `not_connected`, click the Aseprite window once; the
   bridge auto-starts.

## Scale and anchors

- Terrain: 32×16 art, rendered at 2× (64×32 on screen).
- Roads: 32×16 art, 16 autotiles with mask `N=1, E=2, S=4, W=8`, rendered at
  2×. The arm endpoints are the midpoints of the shared diamond edges. The dark
  outline is computed from the union of the arm bands, so junctions have no
  internal seam.
- Coffee tiles (per-cell simulation): 32×32 art, used as fallback.
- Coffee lot: 128×96 art, 4×2 footprint, eight cells and 16 pés in four rows of
  four, low wooden border, no high fence. Base centre `(76,56)`. Each cell holds
  two pés; one monthly coffee task covers the full 16-pé lot.
  The terreiro's capacity 16 holds one full lot.
- Trees: 32×48 art, rendered at 2×. People and family slices are 16×24 art,
  rendered at 2× with the anchor at bottom center.
- People: person_man, person_woman, person_boy and person_girl, six outfit
  colors and two frames each. The renderer alternates the frames and adds a small
  bob plus task props; the family portrait uses the same slices.
- Field icons: icon_fertilizer, icon_limestone, icon_clock at 16×16,
  rendered at 1× in the map status layer.
- Casa grande: 112×88 art, 3×2 footprint, single storey, rendered at 2×. Base
  centre `(64,52)`.
- Colono house: 96×80 art, 2×2 footprint (house + horta + galinheiro + varal),
  rendered at 2×. Base centre `(48,56)`.
- Terreiro: 96×80 art, 2×2 footprint (drying patio, capacity 16), rendered at 2×.
  Base centre `(48,56)`. One terreiro is placed at the start of a new farm.
- Tulha: 128×104 art, 3×3 footprint (2×2 storehouse + 5-tile yard with sacks and
  cart), rendered at 2×. Base centre `(64,56)`.
- Venda: 96×64 art, 2×1 footprint (shop with striped awning and counter),
  rendered at 2×. Base centre `(48,40)`.
- Escola: 96×88 art, 2×2 footprint (schoolhouse with green shutters, bell plaque
  and flagpole), rendered at 2×. Base centre `(48,56)`.
- Capela: 80×112 art, 1×2 footprint (church with bell tower, red spire and
  cross), rendered at 2×. Base centre `(40,64)`.
- Remaining buildings: 64×64 art, rendered at 1× until their art pass.
- The map is 24×24. The New farm starts from the landscape: the player places
  the casa grande, one colono house, one terreiro and the starting coffee lot.
  The other buildings are constructed later. The road enters at the west edge
  and is preserved; there is no road-access requirement.

Structures are explicit in the simulation (`Structure { id, kind, x, y, w, h }`),
so each building is drawn once from its origin. The per-building art table lives
in `apps/web/src/renderer.ts` (`BUILDING_ART`).

## Footprint target

The table is the agreed target. A building's footprint changes in the same step
as its new art, never before.

| Slice | Footprint | Status |
| --- | --- | --- |
| `sede` | 3×2 | done |
| `house` | 2×2 | done |
| `coffee_lot_*` | 4×2 | done |
| `terreiro` | 2×2 | done |
| `tulha` | 3×3 | done |
| `capela` | 1×2 | done |
| `venda` | 2×1 | done |
| `escola` | 2×2 | done |
| `tile_*`, `coffee_*`, `tree` | 1×1 | done |
| `road_*` | 1×1 | done |
| `family` | 1×1 | done |
| `person_*` | 1x1 | done |
| `icon_*` | 1x1 | done |

## Queue

1. **Casa grande** — single-storey 3×2, roof planes, ridge, eaves, veranda
   depth and posts. Done.
2. **Casa de colono** — 2×2 lot with the house, horta, galinheiro and varal.
   Done.
3. **Cafezal modular** — 4×2 lot, eight cells, 16 pés, 4 stages, low border.
   Done: one monthly coffee task harvests 16 pés.
4. **Terreiro** — 2×2 drying patio, capacity 16. Done.
5. **Tulha** — 3×3 yard with a 2×2 storehouse, sack area and cart in the
   remaining 5 tiles. Done.
6. **Capela** — 1×2 church with bell tower, red spire and cross. Done.
7. **Venda** — 2×1 shop with a striped awning, counter, door and sign. Done.
8. **Escola** — 2×2 schoolhouse with green shutters, bell plaque and flagpole.
   Done.
9. Terrain, fences, well.
10. Coffee post-harvest stage.
11. People poses, chickens, props. People, outfit variants, family portraits
    and field icons done; chickens and remaining props pending.
12. HUD icons, panel, cursor. Implemented as a DOM pixel skin with Pixelify
    Sans and crisp vector icons; the canteiro is drawn generically by the
    renderer, so no new map slice is required.
13. Season variants and cover art.

Each element is reviewed in `/?art` and in the map before the next one starts.

## Slices

`tile_terra`, `tile_terra_alt`, `tile_mata`, `tile_mata_alt`, `road_0` to
`road_15`, `coffee_0` to `coffee_3`, `coffee_lot_0` to `coffee_lot_3`, `tree`,
`sede`, `house`, `terreiro`, `tulha`, `capela`, `venda`, `escola`, `family`,
`person_man_0..5_0/1`, `person_woman_0..5_0/1`, `person_boy_0..5_0/1`,
`person_girl_0..5_0/1`, `icon_fertilizer`, `icon_limestone`, `icon_clock`.

## Palette

Terra roxa `#8a5a3b`, mata `#2f5637`, coffee greens `#3f7434` / `#5c8f3e`,
cherry `#c7442e`, terracotta `#b8563a` / `#8c3e2a`, whitewash `#f0e2c4`, stone
`#8a7a68`, wood `#6b3d2a`, glass `#6a8a9a`, shutters `#3f6b44`. Road bed
`#8a5a3b`, packed band `#b89a6a`, road edge `#4a2c1e`. Tulha roof uses the same
terracotta as the houses (`#b8563a` / `#8c3e2a`).

## Reference

The casa grande follows the long, whitewashed coffee-farm houses of the Paraíba
Paulista, with a hipped terracotta roof, deep veranda, green shutters and a
service annex. The public-domain photograph used as a visual reference was
*Casa grande da Fazenda Santa Maria do Monjolinho* (São Carlos, SP).

All art in this repository is original.
