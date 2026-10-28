-- Builds the Sítio pixel-art sheet. Edit the generated .aseprite from
-- Aseprite (or through the Aseprite AI Artist MCP) and re-export with
-- `pnpm art`.
--
-- Run from the repository root:
--   aseprite -b --script tools/art-sitio.lua

local OUT = "art/sitio/sitio.aseprite"

local function C(hex, alpha)
  return Color(
    (hex >> 16) & 0xFF,
    (hex >> 8) & 0xFF,
    hex & 0xFF,
    alpha or 255
  )
end

local TERRA = C(0x8A5A3B)
local TERRA_DARK = C(0x6F452C)
local TERRA_LIGHT = C(0xA5714A)
local MATA = C(0x2F5637)
local MATA_DARK = C(0x24462C)
local MATA_LIGHT = C(0x3F6B44)
local COFFEE = C(0x3F7434)
local COFFEE_DARK = C(0x2A5A2C)
local COFFEE_LIGHT = C(0x5C8F3E)
local CHERRY = C(0xC7442E)
local ROOF = C(0xB8563A)
local ROOF_LIGHT = C(0xC96A48)
local ROOF_DARK = C(0x8C3E2A)
local WALL = C(0xF0E2C4)
local WALL_SHADE = C(0xD6C2A0)
local STONE = C(0x8A7A68)
local STONE_DARK = C(0x5A4A3A)
local WOOD = C(0x6B3D2A)
local WOOD_DARK = C(0x4A2C1E)
local GLASS = C(0x6A8A9A)
local SHUTTER = C(0x3F6B44)
local WHITE = C(0xF4EFE0)
local GOLD = C(0xE0A84A)
local YARD = C(0x4F7A3A)
local SKIN = C(0xD8A070)
local SHIRT = C(0x7A5A3A)
local HAT = C(0xE0C070)
local SHADOW = C(0x2A1C12)
local ROAD_BASE = C(0x8A5A3B)
local ROAD_BASE_DARK = C(0x744A30)
local ROAD_BASE_LIGHT = C(0x9C6A45)
local ROAD_BAND = C(0xB89A6A)
local ROAD_BAND_LIGHT = C(0xC9AD80)
local ROAD_EDGE = C(0x4A2C1E)
local ROAD_MASK = C(0xFF00FF)
local ROAD_MASK_PIXEL = app.pixelColor.rgba(255, 0, 255, 255)

local sprite = Sprite(512, 640, ColorMode.RGB)

local OX, OY = 0, 0

local function layer(name, ox, oy)
  local l = sprite:newLayer()
  l.name = name
  local cel = sprite:newCel(l, 1)
  OX, OY = ox or 0, oy or 0
  return cel.image
end

local function px(img, x, y, color)
  x = math.floor(x + OX)
  y = math.floor(y + OY)
  if x >= 0 and y >= 0 and x < img.width and y < img.height then
    img:putPixel(x, y, color)
  end
end

local function rect(img, x, y, w, h, color)
  for yy = y, y + h - 1 do
    for xx = x, x + w - 1 do
      px(img, xx, yy, color)
    end
  end
end

local function diamond(img, cx, top, w, h, color)
  for yy = 0, h - 1 do
    local t = yy / (h - 1)
    local half = math.floor((w / 2) * (1 - math.abs(t * 2 - 1)))
    for xx = cx - half, cx + half do
      px(img, xx, top + yy, color)
    end
  end
end

local function roof(img, cx, top, halfWidth, height, color)
  for yy = 0, height - 1 do
    local half = math.floor(halfWidth * (yy + 1) / height)
    rect(img, cx - half, top + yy, half * 2 + 1, 1, color)
  end
end

local function edge(img, x0, y0, x1, y1, color)
  x0, y0 = math.floor(x0 + 0.5), math.floor(y0 + 0.5)
  x1, y1 = math.floor(x1 + 0.5), math.floor(y1 + 0.5)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    px(img, x0, y0, color)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
end

local function poly(img, points, color)
  local minY = 1e9
  local maxY = -1e9
  for _, point in ipairs(points) do
    if point[2] < minY then minY = point[2] end
    if point[2] > maxY then maxY = point[2] end
  end
  for y = math.floor(minY), math.ceil(maxY) do
    local nodes = {}
    local j = #points
    for i = 1, #points do
      local xi, yi = points[i][1], points[i][2]
      local xj, yj = points[j][1], points[j][2]
      if (yi < y and yj >= y) or (yj < y and yi >= y) then
        local x = xi + (y - yi) * (xj - xi) / (yj - yi)
        table.insert(nodes, x)
      end
      j = i
    end
    table.sort(nodes)
    for k = 1, #nodes, 2 do
      local x0 = math.ceil(nodes[k])
      local x1 = math.floor(nodes[k + 1] or nodes[k])
      for x = x0, x1 do px(img, x, y, color) end
    end
  end
end

local function wallPanel(img, x1, y1, x2, y2, t, w, h, color)
  local dx, dy = x2 - x1, y2 - y1
  local len = math.sqrt(dx * dx + dy * dy)
  local ux, uy = dx / len, dy / len
  local xa = x1 + dx * t
  local ya = y1 + dy * t
  local xb = xa + ux * w
  local yb = ya + uy * w
  poly(img, {
    { xa, ya },
    { xb, yb },
    { xb, yb - h },
    { xa, ya - h },
  }, color)
end

local function tile(name, x, y, base, dark, light, speckles)
  local img = layer(name, x, y)
  diamond(img, 16, 0, 32, 16, base)
  edge(img, 0, 8, 15, 0, light)
  edge(img, 31, 8, 16, 15, dark)
  for _, spot in ipairs(speckles) do
    px(img, spot[1], spot[2], spot[3] and dark or light)
  end
end

tile("tile_terra", 0, 0, TERRA, TERRA_DARK, TERRA_LIGHT, {
  { 8, 6, true }, { 20, 5, false }, { 13, 10, true }, { 24, 11, false },
})
tile("tile_terra_alt", 32, 0, TERRA, TERRA_DARK, TERRA_LIGHT, {
  { 11, 5, false }, { 22, 8, true }, { 6, 10, true }, { 17, 12, false },
})
tile("tile_mata", 64, 0, MATA, MATA_DARK, MATA_LIGHT, {
  { 7, 6, false }, { 18, 5, true }, { 24, 9, false }, { 12, 11, true },
})
tile("tile_mata_alt", 96, 0, MATA, MATA_DARK, MATA_LIGHT, {
  { 10, 5, true }, { 20, 7, false }, { 6, 10, false }, { 15, 12, true },
})

local function bush(img, cx, baseY, stage)
  local h = stage == 0 and 6 or stage == 1 and 9 or stage == 2 and 12 or 14
  local w = stage == 0 and 7 or stage == 1 and 9 or stage == 2 and 12 or 14
  diamond(img, cx, baseY - 1, w + 2, 4, C(0x4A2C1E))
  rect(img, cx - 1, baseY - h + 4, 2, h - 4, WOOD)
  diamond(img, cx, baseY - h, w, math.max(4, math.floor(h * 0.6)), COFFEE_DARK)
  diamond(img, cx - 1, baseY - h - 2, w - 3, math.max(3, math.floor(h * 0.45)), COFFEE)
  diamond(img, cx - 2, baseY - h - 4, math.max(4, math.floor(w * 0.4)), math.max(2, math.floor(h * 0.25)), COFFEE_LIGHT)
  if stage == 3 then
    px(img, cx - 4, baseY - h + 3, CHERRY)
    px(img, cx + 2, baseY - h + 1, CHERRY)
    px(img, cx + 4, baseY - h + 6, CHERRY)
    px(img, cx - 1, baseY - h + 8, CHERRY)
  elseif stage == 2 then
    px(img, cx - 3, baseY - h + 5, GOLD)
    px(img, cx + 3, baseY - h + 7, GOLD)
  end
end

local function coffee(name, x, y, stage)
  local img = layer(name, x, y)
  edge(img, 4, 31, 28, 19, C(0x4A2C1E))
  bush(img, 7, 29, stage)
  bush(img, 16, 25, stage)
  bush(img, 25, 21, stage)
end

coffee("coffee_0", 0, 16, 0)
coffee("coffee_1", 32, 16, 1)
coffee("coffee_2", 64, 16, 2)
coffee("coffee_3", 96, 16, 3)

-- Modular 4x2 coffee lot: 16 pés in four rows of four, low wooden border.
local function coffeeLot(name, ox, stage)
  local img = layer(name, ox, 256)
  local function CP(x, y, h)
    return { 60 + (x - y) * 16, 32 + (x + y) * 8 - (h or 0) }
  end
  local lot = { CP(0, 0), CP(4, 0), CP(4, 2), CP(0, 2) }
  -- Dark terra tiles, so the 4x2 grid is visible under the rows.
  for tx = 0, 3 do
    for ty = 0, 1 do
      local c = CP(tx + 0.5, ty + 0.5)
      local base = (tx + ty) % 2 == 0 and C(0x5A3D27) or C(0x66452C)
      diamond(img, c[1], c[2] - 8, 32, 16, base)
      edge(img, c[1], c[2] - 8, c[1] + 16, c[2], C(0x3A2418))
      edge(img, c[1] + 16, c[2], c[1], c[2] + 8, C(0x3A2418))
    end
  end
  local rows = { 0.33, 0.67, 1.33, 1.67 }
  for row = 1, 4 do
    local y = rows[row]
    local a, b = CP(0.15, y), CP(3.85, y)
    edge(img, a[1], a[2], b[1], b[2], C(0x3A2418))
  end
  local function lotBush(cx, baseY, growth)
    local h = growth == 0 and 7 or growth == 1 and 9 or growth == 2 and 11 or 13
    local w = growth == 0 and 6 or growth == 1 and 8 or growth == 2 and 9 or 10
    local trunk = growth == 0 and 3 or 5
    rect(img, cx - 1, baseY - trunk, 2, trunk, C(0x9A6B43))
    px(img, cx + 1, baseY - trunk, WOOD_DARK)
    diamond(img, cx, baseY - h, w, math.max(4, h - 4), COFFEE_DARK)
    diamond(img, cx - 1, baseY - h - 1, w - 2, math.max(3, h - 6), COFFEE)
    diamond(img, cx - 2, baseY - h - 2, math.max(3, w - 5), math.max(2, h - 8), COFFEE_LIGHT)
    if growth == 2 then
      px(img, cx - 3, baseY - h + 2, GOLD)
      px(img, cx + 2, baseY - h + 4, GOLD)
    elseif growth == 3 then
      px(img, cx - 3, baseY - h + 2, CHERRY)
      px(img, cx + 2, baseY - h + 3, CHERRY)
      px(img, cx, baseY - h + 6, CHERRY)
    end
  end
  local cols = { 0.5, 1.5, 2.5, 3.5 }
  for row = 1, 4 do
    for col = 1, 4 do
      local x = cols[col] + (row % 2 == 0 and 0.08 or -0.08)
      local p = CP(x, rows[row])
      lotBush(p[1], p[2], stage)
    end
  end
  edge(img, lot[1][1], lot[1][2], lot[2][1], lot[2][2], WOOD)
  edge(img, lot[2][1], lot[2][2], lot[3][1], lot[3][2], WOOD)
  edge(img, lot[3][1], lot[3][2], lot[4][1], lot[4][2], WOOD)
  edge(img, lot[4][1], lot[4][2], lot[1][1], lot[1][2], WOOD)
end

coffeeLot("coffee_lot_0", 0, 0)
coffeeLot("coffee_lot_1", 128, 1)
coffeeLot("coffee_lot_2", 256, 2)
coffeeLot("coffee_lot_3", 384, 3)

-- 1x1 road autotiles. Mask bits are N=1, E=2, S=4, W=8; the arm endpoints
-- are the midpoints of the four shared diamond edges.
local ROAD_ARMS = {
  { bit = 1, ex = 24, ey = 4 },
  { bit = 2, ex = 24, ey = 12 },
  { bit = 4, ex = 8, ey = 12 },
  { bit = 8, ex = 8, ey = 4 },
}

local function roadTile(mask)
  local img = layer("road_" .. mask, mask * 32, 352)
  diamond(img, 16, 0, 32, 16, ROAD_BASE)
  for _, spot in ipairs({
    { 6, 5, true }, { 25, 4, false }, { 9, 11, false }, { 27, 11, true },
    { 16, 2, true }, { 16, 14, false }, { 4, 8, false }, { 29, 8, true },
  }) do
    px(img, spot[1], spot[2], spot[3] and ROAD_BASE_DARK or ROAD_BASE_LIGHT)
  end
  local cx, cy = 16, 8
  local half = 3
  for _, arm in ipairs(ROAD_ARMS) do
    if math.floor(mask / arm.bit) % 2 == 1 then
      local dx, dy = arm.ex - cx, arm.ey - cy
      local len = math.sqrt(dx * dx + dy * dy)
      local ox, oy = -dy / len * half, dx / len * half
      poly(img, {
        { arm.ex + ox, arm.ey + oy },
        { arm.ex - ox, arm.ey - oy },
        { cx - ox, cy - oy },
        { cx + ox, cy + oy },
      }, ROAD_MASK)
    end
  end
  diamond(img, cx, cy - 3, 7, 6, ROAD_MASK)

  local band = {}
  for y = 0, 15 do
    band[y] = {}
    for x = 0, 31 do
      local c = img:getPixel(x + OX, y + OY)
      band[y][x] = c == ROAD_MASK_PIXEL
    end
  end
  local function isBand(x, y)
    if x < 0 or y < 0 or x >= 32 or y >= 16 then return true end
    return band[y][x] == true
  end
  for y = 0, 15 do
    for x = 0, 31 do
      if band[y][x] then
        local boundary =
          not isBand(x - 1, y) or
          not isBand(x + 1, y) or
          not isBand(x, y - 1) or
          not isBand(x, y + 1)
        px(img, x, y, boundary and ROAD_EDGE or ROAD_BAND)
      end
    end
  end

  for _, arm in ipairs(ROAD_ARMS) do
    if math.floor(mask / arm.bit) % 2 == 1 then
      edge(img, cx, cy, arm.ex, arm.ey, ROAD_BAND_LIGHT)
    end
  end
  for _, stone in ipairs({ { 21, 3 }, { 27, 7 }, { 13, 13 }, { 6, 8 } }) do
    px(img, stone[1], stone[2], ROAD_EDGE)
  end
end

for mask = 0, 15 do roadTile(mask) end

local tree = layer("tree", 128, 16)
rect(tree, 14, 30, 4, 18, WOOD)
rect(tree, 12, 45, 8, 3, WOOD_DARK)
diamond(tree, 16, 18, 26, 16, MATA_DARK)
diamond(tree, 16, 10, 24, 18, MATA)
diamond(tree, 15, 4, 18, 12, MATA_LIGHT)
diamond(tree, 15, 0, 10, 8, MATA_LIGHT)
px(tree, 11, 22, MATA_LIGHT)
px(tree, 22, 18, MATA_LIGHT)

-- Casa grande: a 3x2 colonial coffee farmhouse with a hip roof and veranda.
-- The lot base centre is (64, 52); the renderer anchors the sprite there.
local casa = layer("sede", 160, 16)

-- Plan-based projection for the smaller 3x2 lot (TILE_W=32, TILE_H=16 art px).
-- The lot base centre is (64, 52), which is the renderer anchor.
local function P(x, y, h)
  return { 56 + (x - y) * 16, 32 + (x + y) * 8 - (h or 0) }
end

local function along(a, b, t)
  return { a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t }
end

-- Lot, back 3x1 house block and front 3x1 veranda.
local veranda = { P(0, 1.4), P(3, 1.4), P(3, 2), P(0, 2) }

poly(casa, veranda, STONE)

-- Single-storey walls; the front sits on the veranda back edge.
local w0, w1, d0, d1 = 0.15, 2.85, 0.15, 1.4
local wb = { P(w0, d0), P(w1, d0), P(w1, d1), P(w0, d1) }
local wt = { P(w0, d0, 18), P(w1, d0, 18), P(w1, d1, 18), P(w0, d1, 18) }
poly(casa, { wb[4], wb[3], wt[3], wt[4] }, WALL)
poly(casa, { wb[3], wb[2], wt[2], wt[3] }, WALL_SHADE)

-- Smaller windows, lifted off the floor, plus a central door.
local function framedWindow(x1, y1, x2, y2, t, w, h, lift)
  lift = lift or 0
  local y1l = y1 - lift
  local y2l = y2 - lift
  wallPanel(casa, x1, y1l, x2, y2l, t - 0.018, w + 3, h + 2, SHUTTER)
  wallPanel(casa, x1, y1l, x2, y2l, t, w, h, GLASS)
end

local wx1, wy1 = wb[4][1], wb[4][2]
local wx2, wy2 = wb[3][1], wb[3][2]
for _, t in ipairs({ 0.1, 0.28, 0.72, 0.9 }) do
  framedWindow(wx1, wy1, wx2, wy2, t, 3, 5, 3)
end
wallPanel(casa, wx1, wy1, wx2, wy2, 0.5, 8, 11, WOOD_DARK)
wallPanel(casa, wx1, wy1, wx2, wy2, 0.52, 6, 9, WOOD)
wallPanel(casa, wx1, wy1 - 8, wx2, wy2 - 8, 0.52, 6, 2, GLASS)

-- One window on the short right face.
framedWindow(wb[3][1], wb[3][2], wb[2][1], wb[2][2], 0.5, 3, 5, 3)

-- Veranda railing along the front edge.
edge(casa, veranda[4][1], veranda[4][2], veranda[3][1], veranda[3][2], STONE_DARK)
for i = 0, 6 do
  local p = along(veranda[4], veranda[3], i / 6)
  edge(casa, p[1], p[2], p[1], p[2] - 4, WOOD)
end
edge(casa, veranda[4][1], veranda[4][2] - 4, veranda[3][1], veranda[3][2] - 4, WOOD)

-- Eave at wall-top height, just outside the 3x2 lot.
local e = 0.12
local eN = P(-e, -e, 18)
local eE = P(3 + e, -e, 18)
local eS = P(3 + e, 2 + e, 18)
local eW = P(-e, 2 + e, 18)

-- Posts straight up from the veranda edge to the eave.
for _, t in ipairs({ 0.08, 0.29, 0.5, 0.71, 0.92 }) do
  local floor = along(veranda[4], veranda[3], t)
  local top = { floor[1], floor[2] - 18 }
  edge(casa, floor[1], floor[2], top[1], top[2], WOOD_DARK)
  edge(casa, floor[1] + 1, floor[2], top[1] + 1, top[2], WOOD)
end

-- Hip roof: ridge on the long axis of the 3x2 plan.
local r1 = P(0.6, 1, 30)
local r2 = P(2.4, 1, 30)

poly(casa, { eN, eE, r2, r1 }, ROOF_DARK)
poly(casa, { r1, eN, eW }, ROOF_DARK)
poly(casa, { r1, r2, eS, eW }, ROOF)
poly(casa, { r2, eE, eS }, ROOF)
edge(casa, r1[1], r1[2], r2[1], r2[2], ROOF_DARK)
edge(casa, eN[1], eN[2], eE[1], eE[2], ROOF_DARK)
edge(casa, eE[1], eE[2], eS[1], eS[2], ROOF_DARK)
edge(casa, eS[1], eS[2], eW[1], eW[2], ROOF_DARK)
edge(casa, eW[1], eW[2], eN[1], eN[2], ROOF_DARK)
for i = 1, 5 do
  local t = i / 6
  local a = along(r1, r2, t)
  local b = along(eW, eS, t)
  edge(casa, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end

-- Chimney and a little greenery at the front corners.
local ch = P(2.5, 0.5, 24)
rect(casa, ch[1] - 2, ch[2] - 6, 5, 6, WALL)
rect(casa, ch[1] - 3, ch[2] - 7, 7, 2, WOOD_DARK)
diamond(casa, 20, 64, 8, 5, MATA)
diamond(casa, 64, 76, 8, 5, MATA)

local house = layer("house", 0, 160)

-- A 2x2 colono lot: house at the back-left, clothesline at the back-right,
-- vegetable garden at the front-left and chicken coop at the front-right.
local function HP(x, y, h)
  return { 48 + (x - y) * 16, 40 + (x + y) * 8 - (h or 0) }
end

local function HL(a, b, t)
  return { a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t }
end

local lot = { HP(0, 0), HP(2, 0), HP(2, 2), HP(0, 2) }
poly(house, lot, C(0x7D5638))
edge(house, lot[1][1], lot[1][2], lot[2][1], lot[2][2], STONE_DARK)
edge(house, lot[2][1], lot[2][2], lot[3][1], lot[3][2], STONE_DARK)
edge(house, lot[3][1], lot[3][2], lot[4][1], lot[4][2], STONE_DARK)
edge(house, lot[4][1], lot[4][2], lot[1][1], lot[1][2], STONE_DARK)

-- Clothesline on the back-right tile.
local vp1, vp2 = HP(1.15, 0.25), HP(1.85, 0.75)
edge(house, vp1[1], vp1[2], vp1[1], vp1[2] - 14, WOOD)
edge(house, vp2[1], vp2[2], vp2[1], vp2[2] - 14, WOOD)
local vt1 = { vp1[1], vp1[2] - 14 }
local vt2 = { vp2[1], vp2[2] - 14 }
edge(house, vt1[1], vt1[2], vt2[1], vt2[2], WOOD_DARK)
for i, cloth in ipairs({ WHITE, GLASS, C(0xC7442E) }) do
  local p = HL(vt1, vt2, 0.2 + (i - 1) * 0.28)
  rect(house, p[1] - 2, p[2], 4, 9, cloth)
  px(house, p[1] - 2, p[2] + 9, WOOD_DARK)
end
local basket = HP(1.5, 0.5)
rect(house, basket[1] - 2, basket[2] - 2, 4, 3, WOOD_DARK)

-- Vegetable garden on the front-left tile.
local garden = { HP(0.1, 1.1), HP(0.9, 1.1), HP(0.9, 1.9), HP(0.1, 1.9) }
poly(house, garden, C(0x4A2C1E))
for i = 1, 3 do
  for j = 1, 2 do
    local p = HP(0.15 + i * 0.2, 1.15 + j * 0.25)
    px(house, p[1], p[2], COFFEE_LIGHT)
    px(house, p[1], p[2] - 1, COFFEE)
    px(house, p[1] + 1, p[2] - 1, COFFEE_LIGHT)
  end
end
edge(house, HP(0, 2)[1], HP(0, 2)[2], HP(1, 2)[1], HP(1, 2)[2], WOOD)
for i = 0, 3 do
  local p = HL(HP(0, 2), HP(1, 2), i / 3)
  edge(house, p[1], p[2], p[1], p[2] - 4, WOOD)
end

-- The house itself, a little larger than the old single-tile cottage.
local w0, w1, d0, d1 = 0.08, 0.95, 0.14, 0.89
local wb = { HP(w0, d0), HP(w1, d0), HP(w1, d1), HP(w0, d1) }
local wt = { HP(w0, d0, 14), HP(w1, d0, 14), HP(w1, d1, 14), HP(w0, d1, 14) }
poly(house, { wb[4], wb[3], wt[3], wt[4] }, WALL)
poly(house, { wb[3], wb[2], wt[2], wt[3] }, WALL_SHADE)

local wx1, wy1 = wb[4][1], wb[4][2]
local wx2, wy2 = wb[3][1], wb[3][2]
wallPanel(house, wx1, wy1, wx2, wy2, 0.58, 6, 8, WOOD_DARK)
wallPanel(house, wx1, wy1, wx2, wy2, 0.6, 4, 6, WOOD)

local function houseWindow(x1, y1, x2, y2, t)
  wallPanel(house, x1, y1 - 2, x2, y2 - 2, t - 0.025, 5, 5, SHUTTER)
  wallPanel(house, x1, y1 - 2, x2, y2 - 2, t, 3, 3, GLASS)
end

houseWindow(wx1, wy1, wx2, wy2, 0.18)
houseWindow(wb[3][1], wb[3][2], wb[2][1], wb[2][2], 0.5)

local e = 0.03
local eN = HP(-e, -e, 14)
local eE = HP(1.03 + e, -e, 14)
local eS = HP(1.03 + e, 1.03 + e, 14)
local eW = HP(-e, 1.03 + e, 14)
local r1 = HP(0.3, 0.515, 22)
local r2 = HP(0.75, 0.515, 22)
poly(house, { eN, eE, r2, r1 }, ROOF_DARK)
poly(house, { r1, eN, eW }, ROOF_DARK)
poly(house, { r1, r2, eS, eW }, ROOF)
poly(house, { r2, eE, eS }, ROOF)
edge(house, r1[1], r1[2], r2[1], r2[2], ROOF_DARK)
edge(house, eN[1], eN[2], eE[1], eE[2], ROOF_DARK)
edge(house, eE[1], eE[2], eS[1], eS[2], ROOF_DARK)
edge(house, eS[1], eS[2], eW[1], eW[2], ROOF_DARK)
edge(house, eW[1], eW[2], eN[1], eN[2], ROOF_DARK)
for i = 1, 4 do
  local t = i / 5
  local a = HL(r1, r2, t)
  local b = HL(eW, eS, t)
  edge(house, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end
local step = HP(0.55, 0.89)
poly(house, {
  { step[1] - 2, step[2] },
  { step[1] + 3, step[2] + 2 },
  { step[1] + 3, step[2] + 4 },
  { step[1] - 2, step[2] + 2 },
}, STONE)

-- Chicken coop on the front-right tile.
local coop = HP(1.55, 1.55)
rect(house, coop[1] - 4, coop[2] - 7, 9, 7, WOOD)
rect(house, coop[1] - 3, coop[2] - 6, 7, 5, WOOD_DARK)
poly(house, {
  { coop[1] - 6, coop[2] - 7 },
  { coop[1] + 8, coop[2] - 2 },
  { coop[1] + 2, coop[2] - 12 },
}, ROOF)
local run = { HP(1.05, 1.35), HP(1.9, 1.35), HP(1.9, 1.95), HP(1.05, 1.95) }
edge(house, run[1][1], run[1][2], run[2][1], run[2][2], WOOD)
edge(house, run[1][1], run[1][2], run[4][1], run[4][2], WOOD)
edge(house, run[2][1], run[2][2], run[3][1], run[3][2], WOOD)
edge(house, run[4][1], run[4][2], run[3][1], run[3][2], WOOD)
for _, p in ipairs({ HP(1.25, 1.6), HP(1.55, 1.75), HP(1.8, 1.5) }) do
  px(house, p[1], p[2], WHITE)
  px(house, p[1] + 1, p[2], WHITE)
  px(house, p[1], p[2] - 1, GOLD)
end


local terreiro = layer("terreiro", 112, 160)

-- 2x2 drying patio: pale stone, low border, drying beans, rake and sacks.
local function TP(x, y, h)
  return { 48 + (x - y) * 16, 40 + (x + y) * 8 - (h or 0) }
end

local patio = { TP(0, 0), TP(2, 0), TP(2, 2), TP(0, 2) }
poly(terreiro, patio, C(0xC9B38A))
edge(terreiro, patio[1][1], patio[1][2], patio[2][1], patio[2][2], STONE_DARK)
edge(terreiro, patio[2][1], patio[2][2], patio[3][1], patio[3][2], STONE_DARK)
edge(terreiro, patio[3][1], patio[3][2], patio[4][1], patio[4][2], STONE_DARK)
edge(terreiro, patio[4][1], patio[4][2], patio[1][1], patio[1][2], STONE_DARK)
for tx = 0, 1 do
  for ty = 0, 1 do
    local c = TP(tx + 0.5, ty + 0.5)
    edge(terreiro, c[1], c[2] - 8, c[1] + 16, c[2], C(0xA88A62))
    edge(terreiro, c[1] + 16, c[2], c[1], c[2] + 8, C(0xA88A62))
  end
end
for row = 0, 3 do
  for col = 0, 5 do
    local p = TP(0.25 + col * 0.28, 0.25 + row * 0.4)
    rect(terreiro, p[1], p[2], 2, 1, row % 2 == 0 and C(0x8C3E2A) or C(0xC7442E))
  end
end
local rake = TP(0.3, 1.75)
edge(terreiro, rake[1], rake[2], rake[1] + 6, rake[2] - 14, WOOD)
edge(terreiro, rake[1] - 3, rake[2] - 12, rake[1] + 9, rake[2] - 12, WOOD_DARK)
for i = 0, 3 do
  edge(terreiro, rake[1] - 3 + i * 3, rake[2] - 12, rake[1] - 3 + i * 3, rake[2] - 9, WOOD_DARK)
end
local sack = TP(1.55, 0.4)
rect(terreiro, sack[1] - 3, sack[2] - 5, 6, 5, WOOD)
rect(terreiro, sack[1] - 2, sack[2] - 4, 4, 3, WOOD_DARK)
px(terreiro, sack[1], sack[2] - 5, C(0xC7442E))

-- Tulha: a 3x3 yard with a 2x2 storehouse and the cart/sacks in the
-- five remaining tiles. The lot base centre is (64, 56).
local tulha = layer("tulha", 0, 368)
local function TP(x, y, h)
  return { 64 + (x - y) * 16, 32 + (x + y) * 8 - (h or 0) }
end

local function TL(a, b, t)
  return { a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t }
end

local function distance(a, b)
  local dx, dy = b[1] - a[1], b[2] - a[2]
  return math.sqrt(dx * dx + dy * dy)
end

local tlot = { TP(0, 0), TP(3, 0), TP(3, 3), TP(0, 3) }
poly(tulha, tlot, C(0x7D5638))
edge(tulha, tlot[1][1], tlot[1][2], tlot[2][1], tlot[2][2], STONE_DARK)
edge(tulha, tlot[2][1], tlot[2][2], tlot[3][1], tlot[3][2], STONE_DARK)
edge(tulha, tlot[3][1], tlot[3][2], tlot[4][1], tlot[4][2], STONE_DARK)
edge(tulha, tlot[4][1], tlot[4][2], tlot[1][1], tlot[1][2], STONE_DARK)

local path = { TP(1.2, 2.15), TP(1.8, 2.15), TP(1.8, 3), TP(1.2, 3) }
poly(tulha, path, C(0x9A7A5A))
for _, p in ipairs({ TP(1.4, 2.45), TP(1.6, 2.75) }) do
  px(tulha, p[1], p[2], C(0xB89A6A))
end

-- 2x2 storehouse, centred horizontally in the 3x3 lot.
local w0, w1, d0, d1 = 0.5, 2.5, 0.15, 2.15
local wb = { TP(w0, d0), TP(w1, d0), TP(w1, d1), TP(w0, d1) }
local wt = { TP(w0, d0, 16), TP(w1, d0, 16), TP(w1, d1, 16), TP(w0, d1, 16) }
poly(tulha, { wb[4], wb[3], wt[3], wt[4] }, WALL)
poly(tulha, { wb[3], wb[2], wt[2], wt[3] }, WALL)

local wx1, wy1 = wb[4][1], wb[4][2]
local wx2, wy2 = wb[3][1], wb[3][2]
local front = distance(wb[4], wb[3])
for i = 1, 7 do
  local t = i / 8
  local a = TL(wb[4], wb[3], t)
  edge(tulha, a[1], a[2] - 1, a[1], a[2] - 15, C(0x6B3D2A, 80))
end

-- Planks and a small loading window on the short east face.
local ex1, ey1 = wb[3][1], wb[3][2]
local ex2, ey2 = wb[2][1], wb[2][2]
for i = 1, 5 do
  local t = i / 6
  local a = TL(wb[3], wb[2], t)
  edge(tulha, a[1], a[2] - 1, a[1], a[2] - 15, C(0x6B3D2A, 80))
end
wallPanel(tulha, ex1, ey1 - 7, ex2, ey2 - 7, 0.5 - 3 / front, 6, 5, WOOD_DARK)
wallPanel(tulha, ex1, ey1 - 7, ex2, ey2 - 7, 0.5 - 2 / front, 4, 3, GLASS)

local doorWidth = 16
local doorT = 0.5 - doorWidth / 2 / front
wallPanel(tulha, wx1, wy1, wx2, wy2, doorT - 1 / front, doorWidth + 2, 12, WOOD_DARK)
wallPanel(tulha, wx1, wy1, wx2, wy2, doorT, doorWidth, 10, WOOD)
local lintelA = TL(wb[4], wb[3], doorT)
local lintelB = TL(wb[4], wb[3], doorT + doorWidth / front)
edge(tulha, lintelA[1], lintelA[2] - 11, lintelB[1], lintelB[2] - 11, WOOD_DARK)
local split = TL(wb[4], wb[3], 0.5)
edge(tulha, split[1], split[2], split[1], split[2] - 10, WOOD_DARK)
px(tulha, split[1] - 3, split[2] - 6, WOOD_DARK)
px(tulha, split[1] + 3, split[2] - 6, WOOD_DARK)

-- Small vent above the door.
wallPanel(tulha, wx1, wy1 - 12, wx2, wy2 - 12, 0.5 - 2 / front, 4, 3, WOOD_DARK)
px(tulha, split[1], split[2] - 14, GLASS)

edge(tulha, wb[4][1], wb[4][2], wt[4][1], wt[4][2], C(0x6B3D2A, 160))
edge(tulha, wb[3][1], wb[3][2], wt[3][1], wt[3][2], C(0x6B3D2A, 160))
edge(tulha, wb[2][1], wb[2][2], wt[2][1], wt[2][2], C(0x6B3D2A, 160))
edge(tulha, wt[4][1], wt[4][2], wt[3][1], wt[3][2], C(0x6B3D2A, 160))

-- Hip roof, same red tile as the houses; no beige gable face.
local e = 0.06
local eN = TP(w0 - e, d0 - e, 16)
local eE = TP(w1 + e, d0 - e, 16)
local eS = TP(w1 + e, d1 + e, 16)
local eW = TP(w0 - e, d1 + e, 16)
local midY = (d0 + d1) / 2
local r1 = TP(w0 + 0.35, midY, 28)
local r2 = TP(w1 - 0.35, midY, 28)
poly(tulha, { eN, eE, r2, r1 }, ROOF_DARK)
poly(tulha, { r1, eN, eW }, ROOF_DARK)
poly(tulha, { r1, r2, eS, eW }, ROOF)
poly(tulha, { r2, eE, eS }, ROOF)
edge(tulha, eN[1], eN[2], eE[1], eE[2], ROOF_DARK)
edge(tulha, eE[1], eE[2], eS[1], eS[2], ROOF_DARK)
edge(tulha, eS[1], eS[2], eW[1], eW[2], ROOF_DARK)
edge(tulha, eW[1], eW[2], eN[1], eN[2], ROOF_DARK)
edge(tulha, r1[1], r1[2], r2[1], r2[2], ROOF_DARK)
for i = 1, 5 do
  local t = i / 6
  local a = TL(eW, eS, t)
  local b = TL(r1, r2, t)
  edge(tulha, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end

local step = TP(1.5, 2.2)
poly(tulha, {
  { step[1] - 5, step[2] },
  { step[1] + 5, step[2] + 3 },
  { step[1] + 5, step[2] + 5 },
  { step[1] - 5, step[2] + 2 },
}, STONE)

local function tulhaSack(cx, cy)
  rect(tulha, cx - 2, cy - 4, 5, 4, WOOD)
  rect(tulha, cx - 1, cy - 3, 3, 2, WOOD_DARK)
  px(tulha, cx, cy - 4, C(0xC7442E))
end

-- Sack area on the left of the door, in the front strip.
local pallet = { TP(0.2, 2.25), TP(1.0, 2.25), TP(1.0, 2.9), TP(0.2, 2.9) }
poly(tulha, pallet, C(0x8A6A48))
edge(tulha, pallet[1][1], pallet[1][2], pallet[2][1], pallet[2][2], WOOD_DARK)
edge(tulha, pallet[2][1], pallet[2][2], pallet[3][1], pallet[3][2], WOOD_DARK)
edge(tulha, pallet[3][1], pallet[3][2], pallet[4][1], pallet[4][2], WOOD_DARK)
edge(tulha, pallet[4][1], pallet[4][2], pallet[1][1], pallet[1][2], WOOD_DARK)
for _, y in ipairs({ 2.45, 2.7 }) do
  local a, b = TP(0.3, y), TP(0.9, y)
  edge(tulha, a[1], a[2], b[1], b[2], WOOD)
end
local sp = TP(0.6, 2.6)
for _, s in ipairs({
  { sp[1] - 4, sp[2] }, { sp[1], sp[2] }, { sp[1] + 4, sp[2] },
  { sp[1] - 2, sp[2] - 4 }, { sp[1] + 2, sp[2] - 4 },
  { sp[1], sp[2] - 8 },
}) do
  tulhaSack(s[1], s[2])
end

-- Cart parked on the right of the door, shafts on the ground.
local cc = TP(2.7, 2.7)
local function wheel(cx, cy, r)
  for yy = -r, r do
    for xx = -r, r do
      if xx * xx + yy * yy <= r * r then
        local rr = xx * xx + yy * yy
        px(tulha, cx + xx, cy + yy, rr >= (r - 1) * (r - 1) and WOOD_DARK or C(0x9A6B43))
      end
    end
  end
  px(tulha, cx, cy, WOOD_DARK)
  px(tulha, cx - 1, cy, C(0xE0C070))
end
local wy = cc[2] - 3
wheel(cc[1] - 4, wy, 3)
poly(tulha, {
  { cc[1] - 8, cc[2] - 10 },
  { cc[1] + 7, cc[2] - 10 },
  { cc[1] + 7, cc[2] - 4 },
  { cc[1] - 8, cc[2] - 4 },
}, WOOD)
edge(tulha, cc[1] - 8, cc[2] - 10, cc[1] + 7, cc[2] - 10, WOOD_DARK)
edge(tulha, cc[1] - 8, cc[2] - 4, cc[1] + 7, cc[2] - 4, WOOD_DARK)
for i = 0, 3 do
  local x = cc[1] - 6 + i * 4
  edge(tulha, x, cc[2] - 9, x, cc[2] - 5, WOOD_DARK)
end
edge(tulha, cc[1] + 7, cc[2] - 8, cc[1] + 14, cc[2] - 1, WOOD)
edge(tulha, cc[1] + 7, cc[2] - 5, cc[1] + 14, cc[2] + 1, WOOD)
edge(tulha, cc[1] + 13, cc[2] - 1, cc[1] + 15, cc[2] - 1, WOOD_DARK)
wheel(cc[1] + 4, wy, 3)

local function drawCapela()
-- Capela: a 1x2 church with a bell tower, red spire and cross.
-- The lot base centre is (40, 64); the renderer anchors the sprite there.
local capela = layer("capela", 320, 368)
local function CP(x, y, h)
  return { 48 + (x - y) * 16, 52 + (x + y) * 8 - (h or 0) }
end

local clot = { CP(0, 0), CP(1, 0), CP(1, 2), CP(0, 2) }
poly(capela, clot, C(0x7D5638))
edge(capela, clot[1][1], clot[1][2], clot[2][1], clot[2][2], STONE_DARK)
edge(capela, clot[2][1], clot[2][2], clot[3][1], clot[3][2], STONE_DARK)
edge(capela, clot[3][1], clot[3][2], clot[4][1], clot[4][2], STONE_DARK)
edge(capela, clot[4][1], clot[4][2], clot[1][1], clot[1][2], STONE_DARK)

-- Nave at the back, tower at the front.
local nw0, nw1, nd0, nd1 = 0.12, 0.88, 0.1, 1.3
local nwb = { CP(nw0, nd0), CP(nw1, nd0), CP(nw1, nd1), CP(nw0, nd1) }
local nwt = { CP(nw0, nd0, 18), CP(nw1, nd0, 18), CP(nw1, nd1, 18), CP(nw0, nd1, 18) }
poly(capela, { nwb[3], nwb[2], nwt[2], nwt[3] }, WALL)
wallPanel(capela, nwb[3][1], nwb[3][2] - 5, nwb[2][1], nwb[2][2] - 5, 0.25, 5, 8, WOOD_DARK)
wallPanel(capela, nwb[3][1], nwb[3][2] - 5, nwb[2][1], nwb[2][2] - 5, 0.27, 3, 6, GLASS)

local ne = 0.06
local eNW = CP(nw0 - ne, nd0 - ne, 18)
local eNE = CP(nw1 + ne, nd0 - ne, 18)
local eSE = CP(nw1 + ne, nd1 + ne, 18)
local eSW = CP(nw0 - ne, nd1 + ne, 18)
local rN = CP(0.5, nd0 - ne, 30)
local rS = CP(0.5, nd1 + ne, 30)
poly(capela, { eNE, eSE, rS, rN }, ROOF)
poly(capela, { eNW, eNE, rN }, ROOF_DARK)
poly(capela, { eNW, eSW, rS, rN }, ROOF_DARK)
edge(capela, eNW[1], eNW[2], eNE[1], eNE[2], ROOF_DARK)
edge(capela, eNE[1], eNE[2], eSE[1], eSE[2], ROOF_DARK)
edge(capela, eSE[1], eSE[2], eSW[1], eSW[2], ROOF_DARK)
edge(capela, rN[1], rN[2], rS[1], rS[2], ROOF_DARK)
for i = 1, 4 do
  local t = i / 5
  local a = TL(eNE, eSE, t)
  local b = TL(rN, rS, t)
  edge(capela, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end

local tw0, tw1, td0, td1 = 0.12, 0.88, 1.3, 1.95
local twb = { CP(tw0, td0), CP(tw1, td0), CP(tw1, td1), CP(tw0, td1) }
local twt = { CP(tw0, td0, 32), CP(tw1, td0, 32), CP(tw1, td1, 32), CP(tw0, td1, 32) }
poly(capela, { twb[4], twb[3], twt[3], twt[4] }, WALL)
poly(capela, { twb[3], twb[2], twt[2], twt[3] }, WALL)

local twx1, twy1 = twb[4][1], twb[4][2]
local twx2, twy2 = twb[3][1], twb[3][2]
local towerFront = distance(twb[4], twb[3])
for i = 1, 7 do
  local t = i / 8
  local a = TL(twb[4], twb[3], t)
  edge(capela, a[1], a[2] - 1, a[1], a[2] - 30, C(0x6B3D2A, 90))
end

-- Door, rose window and bell.
wallPanel(capela, twx1, twy1, twx2, twy2, 0.5 - 4 / towerFront, 9, 13, WOOD_DARK)
wallPanel(capela, twx1, twy1, twx2, twy2, 0.5 - 3 / towerFront, 7, 11, WOOD)
local tex1, tey1 = twb[3][1], twb[3][2]
local tex2, tey2 = twb[2][1], twb[2][2]
local towerSide = distance(twb[3], twb[2])
wallPanel(capela, tex1, tey1 - 14, tex2, tey2 - 14, 0.5 - 1.5 / towerSide, 5, 7, WOOD_DARK)
wallPanel(capela, tex1, tey1 - 14, tex2, tey2 - 14, 0.5 - 1 / towerSide, 3, 5, GLASS)
wallPanel(capela, twx1, twy1 - 15, twx2, twy2 - 15, 0.5 - 2 / towerFront, 4, 4, WOOD_DARK)
wallPanel(capela, twx1, twy1 - 15, twx2, twy2 - 15, 0.5 - 1 / towerFront, 2, 2, GLASS)
wallPanel(capela, twx1, twy1 - 24, twx2, twy2 - 24, 0.5 - 3 / towerFront, 6, 6, WOOD_DARK)
rect(capela, twx1 + (twx2 - twx1) * 0.5 - 1, twy1 - 28, 3, 4, GOLD)
px(capela, twx1 + (twx2 - twx1) * 0.5, twy1 - 27, WOOD_DARK)

-- Red spire and gold cross.
local se = 0.05
local sNW = CP(tw0 - se, td0 - se, 32)
local sNE = CP(tw1 + se, td0 - se, 32)
local sSE = CP(tw1 + se, td1 + se, 32)
local sSW = CP(tw0 - se, td1 + se, 32)
local apex = CP(0.5, (td0 + td1) / 2, 46)
poly(capela, { sSW, sSE, apex }, ROOF)
poly(capela, { sSE, sNE, apex }, ROOF)
poly(capela, { sNW, sNE, apex }, ROOF_DARK)
poly(capela, { sNW, sSW, apex }, ROOF_DARK)
edge(capela, sNW[1], sNW[2], sNE[1], sNE[2], ROOF_DARK)
edge(capela, sNE[1], sNE[2], sSE[1], sSE[2], ROOF_DARK)
edge(capela, sSE[1], sSE[2], sSW[1], sSW[2], ROOF_DARK)
edge(capela, sSW[1], sSW[2], sNW[1], sNW[2], ROOF_DARK)

local crossTop = CP(0.5, (td0 + td1) / 2, 52)
edge(capela, apex[1], apex[2], crossTop[1], crossTop[2], GOLD)
local crossBar = CP(0.5, (td0 + td1) / 2, 49)
edge(capela, crossBar[1] - 4, crossBar[2], crossBar[1] + 4, crossBar[2], GOLD)

local step = CP(0.5, 1.95)
poly(capela, {
  { step[1] - 4, step[2] },
  { step[1] + 4, step[2] + 2 },
  { step[1] + 4, step[2] + 4 },
  { step[1] - 4, step[2] + 1 },
}, STONE)
end

drawCapela()

-- Venda: a 2x1 rural shop with a red hip roof, striped awning and counter.
-- The lot base centre is (48, 40); the renderer anchors the sprite there.
local venda = layer("venda", 128, 368)
local function VP(x, y, h)
  return { 40 + (x - y) * 16, 28 + (x + y) * 8 - (h or 0) }
end

local vlot = { VP(0, 0), VP(2, 0), VP(2, 1), VP(0, 1) }
poly(venda, vlot, C(0x7D5638))
edge(venda, vlot[1][1], vlot[1][2], vlot[2][1], vlot[2][2], STONE_DARK)
edge(venda, vlot[2][1], vlot[2][2], vlot[3][1], vlot[3][2], STONE_DARK)
edge(venda, vlot[3][1], vlot[3][2], vlot[4][1], vlot[4][2], STONE_DARK)
edge(venda, vlot[4][1], vlot[4][2], vlot[1][1], vlot[1][2], STONE_DARK)

local porch = { VP(0.1, 0.7), VP(1.9, 0.7), VP(1.9, 1.0), VP(0.1, 1.0) }
poly(venda, porch, C(0x8A6A48))
edge(venda, porch[1][1], porch[1][2], porch[2][1], porch[2][2], WOOD_DARK)
edge(venda, porch[2][1], porch[2][2], porch[3][1], porch[3][2], WOOD_DARK)
edge(venda, porch[3][1], porch[3][2], porch[4][1], porch[4][2], WOOD_DARK)
edge(venda, porch[4][1], porch[4][2], porch[1][1], porch[1][2], WOOD_DARK)

local w0, w1, d0, d1 = 0.15, 1.85, 0.1, 0.7
local wb = { VP(w0, d0), VP(w1, d0), VP(w1, d1), VP(w0, d1) }
local wt = { VP(w0, d0, 15), VP(w1, d0, 15), VP(w1, d1, 15), VP(w0, d1, 15) }
poly(venda, { wb[4], wb[3], wt[3], wt[4] }, WALL)
poly(venda, { wb[3], wb[2], wt[2], wt[3] }, WALL)

local wx1, wy1 = wb[4][1], wb[4][2]
local wx2, wy2 = wb[3][1], wb[3][2]
local front = distance(wb[4], wb[3])
for i = 1, 9 do
  local t = i / 10
  local a = TL(wb[4], wb[3], t)
  edge(venda, a[1], a[2] - 1, a[1], a[2] - 14, C(0x6B3D2A, 90))
end

-- Serving window on the left, counter board on the porch.
local winT = 0.08
local winWidth = 13
wallPanel(venda, wx1, wy1 - 3, wx2, wy2 - 3, winT - 1 / front, winWidth + 2, 9, WOOD_DARK)
wallPanel(venda, wx1, wy1 - 3, wx2, wy2 - 3, winT, winWidth, 7, C(0x3A2A1A))
local counter = {
  VP(0.25, d1, 3),
  VP(1.05, d1, 3),
  VP(1.05, d1 + 0.16, 3),
  VP(0.25, d1 + 0.16, 3),
}
poly(venda, counter, WOOD)
edge(venda, counter[1][1], counter[1][2], counter[2][1], counter[2][2], WOOD_DARK)
edge(venda, counter[2][1], counter[2][2], counter[3][1], counter[3][2], WOOD_DARK)
edge(venda, counter[3][1], counter[3][2], counter[4][1], counter[4][2], WOOD_DARK)
edge(venda, counter[4][1], counter[4][2], counter[1][1], counter[1][2], WOOD_DARK)
for _, goods in ipairs({ { 0.4, GOLD }, { 0.62, C(0xC7442E) }, { 0.84, GLASS } }) do
  local p = VP(goods[1], d1 + 0.08, 3)
  rect(venda, p[1] - 1, p[2] - 3, 3, 3, goods[2])
  px(venda, p[1], p[2] - 4, GOLD)
end

-- Door on the right.
wallPanel(venda, wx1, wy1, wx2, wy2, 0.64, 10, 11, WOOD_DARK)
wallPanel(venda, wx1, wy1, wx2, wy2, 0.65, 8, 9, WOOD)
wallPanel(venda, wx1, wy1 - 5, wx2, wy2 - 5, 0.66, 3, 3, GLASS)

-- Hip roof, red tile like the houses.
local e = 0.06
local eN = VP(w0 - e, d0 - e, 15)
local eE = VP(w1 + e, d0 - e, 15)
local eS = VP(w1 + e, d1 + e, 15)
local eW = VP(w0 - e, d1 + e, 15)
local r1 = VP(w0 + 0.3, 0.4, 26)
local r2 = VP(w1 - 0.3, 0.4, 26)
poly(venda, { eN, eE, r2, r1 }, ROOF_DARK)
poly(venda, { r1, eN, eW }, ROOF_DARK)
poly(venda, { r1, r2, eS, eW }, ROOF)
poly(venda, { r2, eE, eS }, ROOF)
edge(venda, eN[1], eN[2], eE[1], eE[2], ROOF_DARK)
edge(venda, eE[1], eE[2], eS[1], eS[2], ROOF_DARK)
edge(venda, eS[1], eS[2], eW[1], eW[2], ROOF_DARK)
edge(venda, eW[1], eW[2], eN[1], eN[2], ROOF_DARK)
edge(venda, r1[1], r1[2], r2[1], r2[2], ROOF_DARK)
for i = 1, 5 do
  local t = i / 6
  local a = TL(eW, eS, t)
  local b = TL(r1, r2, t)
  edge(venda, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end

-- Striped awning over the counter, leaving the door exposed.
local aL = VP(0.1, d1, 14)
local aR = VP(1.15, d1, 14)
local afL = VP(0.1, 1.0, 10)
local afR = VP(1.15, 1.0, 10)
for _, x in ipairs({ 0.1, 1.15 }) do
  local p = VP(x, 1.0)
  edge(venda, p[1], p[2], p[1], p[2] - 10, WOOD_DARK)
end
for i = 0, 3 do
  local t0, t1 = i / 4, (i + 1) / 4
  local p1, p2 = TL(aL, aR, t0), TL(aL, aR, t1)
  local p3, p4 = TL(afL, afR, t1), TL(afL, afR, t0)
  poly(venda, { p1, p2, p3, p4 }, i % 2 == 0 and SHUTTER or WHITE)
end
edge(venda, aL[1], aL[2], aR[1], aR[2], WOOD_DARK)
edge(venda, afL[1], afL[2], afR[1], afR[2], WOOD_DARK)
edge(venda, aL[1], aL[2], afL[1], afL[2], WOOD_DARK)
edge(venda, aR[1], aR[2], afR[1], afR[2], WOOD_DARK)

-- Gold hanging sign with a coffee bean.
local signC = TL(afL, afR, 0.5)
rect(venda, signC[1] - 5, signC[2] + 1, 10, 5, GOLD)
edge(venda, signC[1] - 5, signC[2] + 1, signC[1] + 5, signC[2] + 1, WOOD_DARK)
edge(venda, signC[1] - 5, signC[2] + 5, signC[1] + 5, signC[2] + 5, WOOD_DARK)
px(venda, signC[1] - 1, signC[2] + 3, WOOD_DARK)
px(venda, signC[1], signC[2] + 3, WOOD_DARK)
px(venda, signC[1] + 1, signC[2] + 2, WOOD_DARK)

-- Barrel and crate on the porch.
local barrel = VP(0.3, 0.95)
rect(venda, barrel[1] - 2, barrel[2] - 6, 5, 6, WOOD)
rect(venda, barrel[1] - 2, barrel[2] - 6, 5, 1, WOOD_DARK)
rect(venda, barrel[1] - 2, barrel[2] - 3, 5, 1, WOOD_DARK)
px(venda, barrel[1], barrel[2] - 6, C(0x9A6B43))

local crate = VP(1.75, 0.95)
rect(venda, crate[1] - 3, crate[2] - 5, 7, 5, WOOD)
rect(venda, crate[1] - 2, crate[2] - 4, 5, 3, WOOD_DARK)
px(venda, crate[1], crate[2] - 4, GOLD)

local lamp = VP(1.82, d1, 8)
rect(venda, lamp[1] - 1, lamp[2] - 2, 3, 3, GOLD)
px(venda, lamp[1], lamp[2] - 1, GLASS)

local step = VP(1.4, 0.76)
poly(venda, {
  { step[1] - 4, step[2] },
  { step[1] + 4, step[2] + 2 },
  { step[1] + 4, step[2] + 4 },
  { step[1] - 4, step[2] + 1 },
}, STONE)

local function drawEscola()
-- Escola: a 2x2 schoolhouse with a red hip roof, green shutters and flagpole.
-- The lot base centre is (48, 56); the renderer anchors the sprite there.
local escola = layer("escola", 224, 368)
local function EP(x, y, h)
  return { 48 + (x - y) * 16, 40 + (x + y) * 8 - (h or 0) }
end

local elot = { EP(0, 0), EP(2, 0), EP(2, 2), EP(0, 2) }
poly(escola, elot, C(0x7D5638))
edge(escola, elot[1][1], elot[1][2], elot[2][1], elot[2][2], STONE_DARK)
edge(escola, elot[2][1], elot[2][2], elot[3][1], elot[3][2], STONE_DARK)
edge(escola, elot[3][1], elot[3][2], elot[4][1], elot[4][2], STONE_DARK)
edge(escola, elot[4][1], elot[4][2], elot[1][1], elot[1][2], STONE_DARK)

local w0, w1, d0, d1 = 0.15, 1.85, 0.15, 1.85
local wb = { EP(w0, d0), EP(w1, d0), EP(w1, d1), EP(w0, d1) }
local wt = { EP(w0, d0, 15), EP(w1, d0, 15), EP(w1, d1, 15), EP(w0, d1, 15) }
poly(escola, { wb[4], wb[3], wt[3], wt[4] }, WALL)
poly(escola, { wb[3], wb[2], wt[2], wt[3] }, WALL)

local wx1, wy1 = wb[4][1], wb[4][2]
local wx2, wy2 = wb[3][1], wb[3][2]
local front = distance(wb[4], wb[3])
for i = 1, 9 do
  local t = i / 10
  local a = TL(wb[4], wb[3], t)
  edge(escola, a[1], a[2] - 1, a[1], a[2] - 14, C(0x6B3D2A, 90))
end
for i = 1, 9 do
  local t = i / 10
  local a = TL(wb[3], wb[2], t)
  edge(escola, a[1], a[2] - 1, a[1], a[2] - 14, C(0x6B3D2A, 90))
end

local function schoolWindowOn(a, b, t)
  local len = distance(a, b)
  local w, h, lift = 6, 6, 4
  wallPanel(escola, a[1], a[2] - lift, b[1], b[2] - lift, t - (w + 2) / 2 / len, w + 2, h + 2, SHUTTER)
  wallPanel(escola, a[1], a[2] - lift, b[1], b[2] - lift, t - w / 2 / len, w, h, GLASS)
  local c = TL(a, b, t)
  edge(escola, c[1], c[2] - lift, c[1], c[2] - lift - h, C(0xF4EFE0))
  local p = TL(a, b, t - w / 2 / len)
  local q = TL(a, b, t + w / 2 / len)
  edge(escola, p[1], p[2] - lift - h / 2, q[1], q[2] - lift - h / 2, C(0xF4EFE0))
end

schoolWindowOn(wb[4], wb[3], 0.2)
schoolWindowOn(wb[4], wb[3], 0.8)
schoolWindowOn(wb[3], wb[2], 0.3)
schoolWindowOn(wb[3], wb[2], 0.7)

-- Central door and golden bell plaque.
wallPanel(escola, wx1, wy1, wx2, wy2, 0.5 - 5 / front, 10, 11, WOOD_DARK)
wallPanel(escola, wx1, wy1, wx2, wy2, 0.5 - 4 / front, 8, 9, WOOD)
wallPanel(escola, wx1, wy1 - 5, wx2, wy2 - 5, 0.5 - 2 / front, 4, 3, GLASS)
wallPanel(escola, wx1, wy1 - 12, wx2, wy2 - 12, 0.5 - 2 / front, 6, 3, GOLD)
local plaque = TL(wb[4], wb[3], 0.5)
rect(escola, plaque[1] - 1, plaque[2] - 15, 3, 2, WOOD_DARK)
px(escola, plaque[1], plaque[2] - 13, GOLD)

-- Hip roof, red tile like the houses.
local e = 0.06
local eN = EP(w0 - e, d0 - e, 15)
local eE = EP(w1 + e, d0 - e, 15)
local eS = EP(w1 + e, d1 + e, 15)
local eW = EP(w0 - e, d1 + e, 15)
local r1 = EP(w0 + 0.3, 1.0, 26)
local r2 = EP(w1 - 0.3, 1.0, 26)
poly(escola, { eN, eE, r2, r1 }, ROOF_DARK)
poly(escola, { r1, eN, eW }, ROOF_DARK)
poly(escola, { r1, r2, eS, eW }, ROOF)
poly(escola, { r2, eE, eS }, ROOF)
edge(escola, eN[1], eN[2], eE[1], eE[2], ROOF_DARK)
edge(escola, eE[1], eE[2], eS[1], eS[2], ROOF_DARK)
edge(escola, eS[1], eS[2], eW[1], eW[2], ROOF_DARK)
edge(escola, eW[1], eW[2], eN[1], eN[2], ROOF_DARK)
edge(escola, r1[1], r1[2], r2[1], r2[2], ROOF_DARK)
for i = 1, 5 do
  local t = i / 6
  local a = TL(eW, eS, t)
  local b = TL(r1, r2, t)
  edge(escola, a[1], a[2], b[1], b[2], C(0x9E4630, 180))
end

-- Flagpole and green pennant.
local flag = EP(0.15, 1.9)
edge(escola, flag[1], flag[2], flag[1], flag[2] - 34, WOOD_DARK)
poly(escola, {
  { flag[1] + 1, flag[2] - 34 },
  { flag[1] + 8, flag[2] - 32 },
  { flag[1] + 8, flag[2] - 27 },
  { flag[1] + 1, flag[2] - 29 },
}, C(0x3F7434))
px(escola, flag[1] + 4, flag[2] - 31, C(0xF4EFE0))

local step = EP(0.5, 1.9)
poly(escola, {
  { step[1] - 4, step[2] },
  { step[1] + 4, step[2] + 2 },
  { step[1] + 4, step[2] + 4 },
  { step[1] - 4, step[2] + 1 },
}, STONE)
end

drawEscola()


local family = layer("family", 464, 160)
rect(family, 6, 13, 5, 7, SHIRT)
rect(family, 6, 19, 2, 5, WOOD_DARK)
rect(family, 9, 19, 2, 5, WOOD_DARK)
rect(family, 5, 8, 7, 6, SKIN)
rect(family, 4, 5, 9, 3, HAT)
rect(family, 6, 3, 5, 2, HAT)
px(family, 7, 11, SHADOW)
px(family, 10, 11, SHADOW)

local function drawActors()
  local SKIN_DARK = C(0xB87A50)
  local HAIR = C(0x3A2A1E)
  local APRON = C(0xE8D8B8)
  local PANTS = C(0x4A3A2A)
  local BOOT = C(0x2A1C12)
  local HAT_DARK = C(0xB89A52)
  local SACK = C(0xB89A6A)
  local SACK_DARK = C(0x8A6A48)
  local LIME_SACK = C(0xD6C2A0)
  local LIME_DARK = C(0x9A8A70)
  local outfits = {
    C(0xA64B3C),
    C(0x3F6B8A),
    C(0x4F7A3A),
    C(0xB07A4A),
    C(0x7A4A6A),
    C(0x3F7A72),
  }
  local roles = { "man", "woman", "boy", "girl" }

  local function man(img, color, frame)
    rect(img, 4, 10, 8, 7, color)
    rect(img, 3, 11, 2, 5, color)
    rect(img, 12, 11, 2, 5, color)
    rect(img, 3, 15, 2, 2, SKIN)
    rect(img, 12, 15, 2, 2, SKIN)
    rect(img, 5, 17, 3, 5, PANTS)
    rect(img, 9, 17, 3, 5, PANTS)
    rect(img, 4, 21, 3, 2, BOOT)
    rect(img, 9, 21, 3, 2, BOOT)
    rect(img, 5, 5, 6, 6, SKIN)
    rect(img, 5, 4, 6, 2, HAIR)
    px(img, 7, 8, SHADOW)
    px(img, 10, 8, SHADOW)
    rect(img, 3, 3, 10, 2, HAT)
    rect(img, 5, 1, 6, 2, HAT)
    rect(img, 4, 2, 8, 1, HAT_DARK)
    if frame == 1 then
      rect(img, 3, 17, 2, 4, color)
      rect(img, 12, 10, 2, 5, color)
      rect(img, 4, 17, 3, 4, PANTS)
      rect(img, 10, 18, 3, 4, PANTS)
      rect(img, 3, 21, 3, 2, BOOT)
      rect(img, 10, 21, 3, 2, BOOT)
    end
  end

  local function woman(img, color, frame)
    rect(img, 4, 10, 8, 7, color)
    rect(img, 3, 16, 10, 5, color)
    rect(img, 6, 11, 4, 6, APRON)
    rect(img, 3, 11, 2, 5, color)
    rect(img, 12, 11, 2, 5, color)
    rect(img, 3, 15, 2, 2, SKIN)
    rect(img, 12, 15, 2, 2, SKIN)
    rect(img, 5, 20, 2, 2, PANTS)
    rect(img, 9, 20, 2, 2, PANTS)
    rect(img, 4, 22, 3, 1, BOOT)
    rect(img, 9, 22, 3, 1, BOOT)
    rect(img, 5, 5, 6, 6, SKIN)
    rect(img, 4, 4, 8, 2, HAIR)
    rect(img, 3, 6, 2, 4, HAIR)
    rect(img, 11, 6, 2, 4, HAIR)
    px(img, 7, 8, SHADOW)
    px(img, 10, 8, SHADOW)
    rect(img, 6, 2, 5, 2, APRON)
    if frame == 1 then
      rect(img, 4, 20, 2, 2, PANTS)
      rect(img, 10, 20, 2, 2, PANTS)
      rect(img, 3, 22, 3, 1, BOOT)
      rect(img, 10, 22, 3, 1, BOOT)
    end
  end

  local function boy(img, color, frame)
    rect(img, 5, 13, 6, 6, color)
    rect(img, 4, 12, 2, 4, color)
    rect(img, 10, 12, 2, 4, color)
    rect(img, 5, 18, 6, 2, PANTS)
    rect(img, 5, 20, 2, 3, PANTS)
    rect(img, 9, 20, 2, 3, PANTS)
    rect(img, 4, 22, 3, 1, BOOT)
    rect(img, 9, 22, 3, 1, BOOT)
    rect(img, 6, 8, 4, 5, SKIN)
    rect(img, 6, 7, 4, 2, HAIR)
    px(img, 7, 10, SHADOW)
    px(img, 9, 10, SHADOW)
    rect(img, 6, 5, 4, 2, HAT_DARK)
    if frame == 1 then
      rect(img, 4, 20, 2, 3, PANTS)
      rect(img, 10, 20, 2, 3, PANTS)
      rect(img, 3, 22, 3, 1, BOOT)
      rect(img, 10, 22, 3, 1, BOOT)
    end
  end

  local function girl(img, color, frame)
    rect(img, 5, 12, 6, 7, color)
    rect(img, 4, 17, 8, 4, color)
    rect(img, 6, 13, 4, 4, APRON)
    rect(img, 4, 12, 2, 4, color)
    rect(img, 10, 12, 2, 4, color)
    rect(img, 5, 20, 2, 2, PANTS)
    rect(img, 9, 20, 2, 2, PANTS)
    rect(img, 4, 22, 3, 1, BOOT)
    rect(img, 9, 22, 3, 1, BOOT)
    rect(img, 6, 8, 4, 5, SKIN)
    rect(img, 5, 7, 6, 2, HAIR)
    rect(img, 5, 9, 1, 3, HAIR)
    rect(img, 10, 9, 1, 3, HAIR)
    px(img, 7, 10, SHADOW)
    px(img, 9, 10, SHADOW)
    rect(img, 6, 5, 4, 2, APRON)
    if frame == 1 then
      rect(img, 4, 20, 2, 2, PANTS)
      rect(img, 10, 20, 2, 2, PANTS)
      rect(img, 3, 22, 3, 1, BOOT)
      rect(img, 10, 22, 3, 1, BOOT)
    end
  end

  local drawers = { man = man, woman = woman, boy = boy, girl = girl }
  for roleIndex, role in ipairs(roles) do
    for outfitIndex, color in ipairs(outfits) do
      for frame = 0, 1 do
        local index = (roleIndex - 1) * 12 + (outfitIndex - 1) * 2 + frame
        local x = (index % 12) * 16
        local y = 480 + math.floor(index / 12) * 24
        local img = layer("person_" .. role .. "_" .. (outfitIndex - 1) .. "_" .. frame, x, y)
        drawers[role](img, color, frame)
      end
    end
  end

  local fertilizer = layer("icon_fertilizer", 0, 600)
  rect(fertilizer, 4, 4, 8, 10, SACK)
  rect(fertilizer, 5, 2, 6, 2, SACK_DARK)
  rect(fertilizer, 3, 13, 10, 1, SACK_DARK)
  rect(fertilizer, 6, 7, 4, 3, COFFEE)
  px(fertilizer, 7, 6, COFFEE_LIGHT)
  px(fertilizer, 8, 6, COFFEE_LIGHT)

  local limestone = layer("icon_limestone", 24, 600)
  rect(limestone, 4, 4, 8, 10, LIME_SACK)
  rect(limestone, 5, 2, 6, 2, LIME_DARK)
  rect(limestone, 3, 13, 10, 1, LIME_DARK)
  rect(limestone, 6, 8, 4, 2, STONE_DARK)

  local clock = layer("icon_clock", 48, 600)
  rect(clock, 6, 2, 4, 1, GOLD)
  rect(clock, 4, 3, 8, 2, GOLD)
  rect(clock, 3, 5, 10, 6, GOLD)
  rect(clock, 4, 11, 8, 3, GOLD)
  rect(clock, 6, 14, 4, 1, GOLD)
  rect(clock, 7, 5, 1, 5, SHADOW)
  rect(clock, 8, 9, 4, 1, SHADOW)
end
drawActors()
local function slice(name, x, y, w, h)
  local s = sprite:newSlice(Rectangle(x, y, w, h))
  s.name = name
end

slice("tile_terra", 0, 0, 32, 16)
slice("tile_terra_alt", 32, 0, 32, 16)
slice("tile_mata", 64, 0, 32, 16)
slice("tile_mata_alt", 96, 0, 32, 16)
for mask = 0, 15 do
  slice("road_" .. mask, mask * 32, 352, 32, 16)
end
slice("coffee_0", 0, 16, 32, 32)
slice("coffee_1", 32, 16, 32, 32)
slice("coffee_2", 64, 16, 32, 32)
slice("coffee_3", 96, 16, 32, 32)
slice("coffee_lot_0", 0, 256, 128, 96)
slice("coffee_lot_1", 128, 256, 128, 96)
slice("coffee_lot_2", 256, 256, 128, 96)
slice("coffee_lot_3", 384, 256, 128, 96)
slice("tree", 128, 16, 32, 48)
slice("sede", 160, 16, 112, 88)
slice("house", 0, 160, 96, 80)
slice("terreiro", 112, 160, 96, 80)
slice("tulha", 0, 368, 128, 104)
slice("capela", 320, 368, 80, 112)
slice("venda", 128, 368, 96, 64)
slice("escola", 224, 368, 96, 88)
slice("family", 464, 160, 16, 24)
local function addPersonSlices()
for roleIndex, role in ipairs({ "man", "woman", "boy", "girl" }) do
  for outfit = 0, 5 do
    for frame = 0, 1 do
      local index = (roleIndex - 1) * 12 + outfit * 2 + frame
      local x = (index % 12) * 16
      local y = 480 + math.floor(index / 12) * 24
      slice("person_" .. role .. "_" .. outfit .. "_" .. frame, x, y, 16, 24)
    end
  end
end
end
addPersonSlices()

slice("icon_fertilizer", 0, 600, 16, 16)
slice("icon_limestone", 24, 600, 16, 16)
slice("icon_clock", 48, 600, 16, 16)

app.activeSprite = sprite
sprite:saveAs(OUT)
print("saved " .. OUT)
