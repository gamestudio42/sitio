# Sítio — Game Manual

**The farm that becomes a village.**

[Português](manual.pt-BR.md) · **English**

![The farm with the almanac HUD](screenshots/farm.png)

Sítio is a monthly farm game. You place the first buildings, choose one task per
person, and end the month. The simulation decides the harvest, the coffee that
dries, the families that stay or leave, and the village that may grow.

There is no real-time pressure. Every decision is made before the month ends,
and every result appears in the monthly report.

---

## Contents

1. [The premise](#1-the-premise)
2. [Starting a farm](#2-starting-a-farm)
3. [The month](#3-the-month)
4. [Land, roads and buildings](#4-land-roads-and-buildings)
5. [People and families](#5-people-and-families)
6. [Coffee from planting to sale](#6-coffee-from-planting-to-sale)
7. [Fertilizer and limestone](#7-fertilizer-and-limestone)
8. [Works and demolition](#8-works-and-demolition)
9. [The market](#9-the-market)
10. [Reports, winning and losing](#10-reports-winning-and-losing)
11. [Saves and the test farm](#11-saves-and-the-test-farm)
12. [HUD and controls](#12-hud-and-controls)
13. [Reference tables](#13-reference-tables)
14. [FAQ](#14-faq)

---

## 1. The premise

A coffee farm becomes a village. The player does not control the harvest
directly; the player decides who works, what is built, what is sold and when the
month ends.

The farm starts with four free starter placements:

- the **casa grande** (farmhouse);
- one **colono house**;
- one **terreiro** (drying patio);
- one **coffee lot**.

Everything else costs coins and wood and is constructed over later months.

The calendar has **48 months**: four seasons of four months, across three years.

---

## 2. Starting a farm

![The spoken tutorial during setup](screenshots/tutorial.png)

Choose a farm name and a seed, then place the four starters on open land.

1. Move the pointer over the map to preview the footprint.
2. Click an open area to pin the blueprint.
3. Confirm the placement.
4. Repeat for the house, the terreiro and the coffee lot.

The tutorial guide, Bento, explains each placement. The calendar only starts
after the last starter is confirmed.

### Placement rules

- Starters cannot overlap another building, a construction site, coffee, a
  planned road or a planting order.
- The same rule applies to every later building.
- Roads, forest, buildings, coffee and construction sites all block placement.
- A building footprint is fixed by its type and never rotates.

### Controls

| Action | How |
| --- | --- |
| Pan the map | Right-drag or middle-drag |
| Zoom | Mouse wheel |
| Select a tool | Works page |
| Place a building | Choose the building, click the map, confirm |
| Assign work | Families page, one task icon per person |
| Clear forest | Choose the axe icon, then click a forest tile |
| End the month | The wax stamp in the bottom-right corner |

---

## 3. The month

Each person has **one monthly task**. Tasks persist until changed.

The month resolves in this order:

1. Food sales and market orders (including coffee and wood).
2. Monthly tasks, including roasting.
3. Dry coffee on the terreiro moves into the tulha while it fits.
4. Dry coffee still on the terreiro ages and may spoil.
5. Coffee that was drying advances; newly dry coffee tries the tulha.
6. Autumn harvest creates new coffee batches.
7. Families eat.
8. The report, history and totals update.
9. The month advances.

The monthly report shows what actually happened. Use it to adjust the next
month.

---

## 4. Land, roads and buildings

The map is **24 × 24**. Terrain is open land, forest or road.

### Forest and clearing

- **Clearing** is a targeted adult task: choose the axe icon, the family panel
  closes, then click a forest tile.
- One adult clears one forest tile per month.
- Clearing yields **2 wood** and turns the tile into open land.
- Clearing does not cost coins.

### Roads

- Plan roads with the Road tool.
- One adult assigned to Road builds one queued tile per month.
- Roads cost no coins or wood.
- Roads do not gate construction; they only occupy land.

### Construction

Buildings are built through the Works page:

1. Choose a building.
2. Place its construction site on open land.
3. Assign one or more adults to that site.
4. The building is completed when its progress reaches the required months.

A construction site needs work units. One adult provides work every month;
educated adults provide more. When the site is complete, its workers return to
vacation.

Building footprints cannot overlap existing buildings, sites, coffee, planned
roads or planting orders. The preview turns red when the footprint is blocked.

---

## 5. People and families

A colono house brings one family: **two adults and two children**.

### Adults

Adults can take the full range of monthly work:

- idle;
- vacation / rest;
- yard;
- coffee;
- road;
- roast;
- fertilize;
- limestone;
- clear forest;
- build a site;
- plant a coffee lot.

An adult on vacation earns **1 coin** for the family.

### Children

Children can:

- be idle;
- work in the yard at half adult output;
- study, if a school exists and they are at least 6 years old.

Two study months educate a child. Education persists. Educated adults count as
double work units for coffee and construction and produce extra yard food.

### Food and morale

- Each family eats **2 food** per month.
- The house pantry holds up to **8 food per family**.
- Food above the cap is wasted.
- Hunger reduces morale.
- Families leave at morale 0.
- The farm is lost when no family remains.

A family can be invited into an empty colono house for **4 coins**. New families
may also arrive at the end of a season when reputation is at least 3 and a house
is empty.

---

## 6. Coffee from planting to sale

![The Coffee page with lot badges and storage](screenshots/coffee.png)

### 6.1 Planting

A new coffee lot is a **4 × 2** order:

- it needs **16 seedlings**;
- it completes with **2 work units**;
- one uneducated adult supplies those units in one month;
- additional adults do not make the order finish faster than one month.

The first starter coffee lot is already established and starts in the *forming*
stage. A lot created later starts as *muda*.

### 6.2 Growth and harvest

Each lot has **8 cells** and **16 pés** (two pés per cell).

Coffee cells advance one stage per coffee work month:

`muda → growing → forming → mature`

The coffee crew is **global**: every adult assigned to Coffee works across all
lots, in deterministic map order.

| Crew | Cells worked per month | Equivalent |
| --- | ---: | --- |
| 1 uneducated adult | 8 | 1 lot |
| 2 uneducated adults | 16 | 2 lots |
| 1 educated adult | 16 | 2 lots |
| 2 educated adults | 32 | 4 lots |

On a single 8-cell lot, a second worker does not double the speed; the lot only
has 8 cells. The extra work goes to other coffee cells or is unused.

Harvest happens in **autumn**. Each harvested cell yields:

- **2 sacks** normally;
- **3 sacks** if the lot was fertilized for that crop.

A partial harvest is still one batch for that cafezal.

### 6.3 Grades

Soil quality starts at **40**:

- fertilizer adds **20**;
- limestone adds **20**.

| Quality | Grade |
| ---: | --- |
| below 50 | bad |
| 50 to 69 | medium |
| 70 or more | good |

Prices follow the current coffee base price, the grade and a possible shop
bonus. A shop (**venda**) adds **1 coin** to the base price.

### 6.4 Batches, drying and the terreiro

Every harvest creates one **coffee batch** per harvested cafezal, plus one stray
batch per grade for coffee planted outside lots.

A fresh batch:

- starts **wet** (`drying`);
- stays on the **terreiro**;
- has age 0.

Drying takes **one month**. Wet coffee cannot be sold.

Each terreiro holds **4 batches**. If the harvest finds every slot full, the
excess is lost. The lost amount is shown in the monthly report.

### 6.5 The tulha

A tulha holds **256 dry sacks** and keeps coffee from aging.

- Dry coffee moves automatically into the tulha while it fits.
- A batch only moves if the whole batch fits.
- If the tulha is full, the batch stays on the terreiro and ages.

### 6.6 Aging on the terreiro

Dry coffee left on the terreiro ages one month at a time:

| Age | Share of value |
| ---: | ---: |
| 0 months | 100% |
| 1 month | 66% |
| 2 months | 33% |
| 3 months | discarded |

Coffee in the tulha and roasted coffee never age.

### 6.7 Roasting

The forno (kiln) unlocks roasting.

- One adult can be assigned to **Roast** at a time.
- Roasting takes one month and consumes **1 wood**.
- It processes **one dry batch** per month.
- It chooses the **oldest dry batch** (highest age; ties by lowest id).
- Roasted coffee is worth **+2 coins per sack** over the dry value of the same
  grade.
- Roasted coffee never ages.

### 6.8 Selling coffee

The market sells **by batch**, not by an aggregate grade pile. This preserves the
exact batch age and price.

- Dry and roasted batches can be sold.
- Drying batches cannot.
- A sale reserves part or all of a batch in the market cart.
- Coffee sales apply before aging on the same month end.
- If the batch reaches zero, it disappears.

---

## 7. Fertilizer and limestone

Fertilizer and limestone are **global adult tasks**, chosen with the sack and
stone icons.

- Each worker applies one input to the next eligible coffee lot, in lot order.
- A lot receives fertilizer once and limestone once per crop.
- Applied flags reset after that lot is harvested.
- The input is consumed from stock; market purchases are applied before tasks.
- The task is disabled when there is no eligible lot or no input available.

The coffee page shows icons on each lot:

- a **worker** icon when the coffee crew works that lot this month;
- a **fertilizer** icon when applied or queued;
- a **limestone** icon when applied or queued.

Applied icons are solid; queued icons use the queue style.

---

## 8. Works and demolition

![The horizontal Works tray with costs and requirements](screenshots/works.png)

### Building reference

| Building | Coins | Wood | Months | Requirement | Unique |
| --- | ---: | ---: | ---: | --- | --- |
| Colono house | 4 | 2 | 2 | none | no |
| Terreiro | 3 | 2 | 2 | none | no |
| Tulha | 4 | 3 | 2 | Terreiro | yes |
| Forno | 5 | 2 | 2 | Tulha | yes |
| Venda | 4 | 2 | 2 | Tulha | yes |
| Escola | 6 | 3 | 3 | Venda | yes |
| Capela | 5 | 3 | 3 | Escola | yes |

### Demolition

The Demolish tool removes a completed building and recovers **50% of its wood**,
rounded down. Coins do not return.

Demolition is blocked when:

- the building is the casa grande;
- the house has a family;
- removing a terreiro would leave fewer slots than occupied batches;
- the tulha still holds coffee;
- the forno still holds roasted coffee.

When a school is demolished, studying children return to the yard. When the
kiln is demolished, roasting tasks return to the yard.

![The demolition confirmation with recovered wood](screenshots/demolition.png)

---

## 9. The market

![The Market page selling coffee by batch](screenshots/market.png)

Market operations are queued and applied when the month ends.

### Purchases

- Wood: 1 coin each.
- Fertilizer: 3 coins each.
- Limestone: 2 coins each.
- Seedlings: 1 coin per bundle of 4.
- Food is sold, not bought, in the market; hungry families may buy food with
  coins at month end.

Queued purchases reserve their coins. Buildings and family invitations cannot
spend coins already reserved by the market cart.

### Sales

- Food sells for 1 coin each, after family meals.
- Coffee is sold per batch.
- The market preview shows expenses, revenue, net coins and the balance after
  the month ends.

Coffee revenue uses the batch price at the moment of sale. Sales happen before
aging.

---

## 10. Reports, winning and losing

![Monthly report](screenshots/report.png)

The monthly report records:

- coffee harvested, lost, dried, spoiled and roasted;
- coffee drying, dry in store and roasted in store;
- sacks sold and sale revenue;
- wood used for roasting;
- food produced, eaten, bought, sold and wasted;
- rest coins, planting, clearing, roads and study;
- arrivals, departures, completed works and the season event;
- hunger and morale changes.

The Reports page draws the financial and coffee production history.

![The Reports page after a month](screenshots/reports.png)

### Winning and losing

The game ends at month 48.

You win if the farm has:

- **6 families**;
- a chapel;
- a school;
- a shop;
- every family with morale at least 2.

You lose if the last family leaves.

Otherwise the farm ends without becoming a village.

---

## 11. Saves and the test farm

### Saves

- The game autosaves in the browser.
- You can export and import `.sitio.json` files.
- Saves use format **`sitio-save` v25**.
- Older saves are not migrated and must start a new farm.

### Test farm

In development (`pnpm dev`), the main menu has a **Test farm** button.

It creates a deterministic farm with:

- all building types;
- six families;
- coffee drying, dry on the terreiro, dry in the tulha and roasted;
- resources for building, inputs and roasting;
- mature, growing and muda coffee lots.

The test farm is a development tool; it is not shown in production builds.

---

## 12. HUD and controls

![Families and the task icon picker](screenshots/families.png)

### Top HUD

- Farm plaque with season, month and year.
- Status wax seal.
- Resource tray: families, coins, food, wood, supplies, coffee, price and
  reputation.
- Menu book: save, export, import, language and back to menu.

### Book tabs

Families, Works, Coffee, Market and Reports open as almanac pages. The Coffee
page is a wide bottom sheet, and Works is a horizontal construction tray, so the
map stays visible while placing buildings.

### Family task icons

Each task is an icon:

- the active task is colored;
- available tasks are muted;
- unavailable tasks are gray and cannot be clicked;
- build sites and planting orders show a progress badge;
- clearing is targeted: choosing it closes the panel so you can click a tree.

### Encerrar mês

The round wax stamp in the bottom-right corner ends the month. The four small
marks show the month inside the season.

---

## 13. Reference tables

### Coffee constants

| Constant | Value |
| --- | ---: |
| Lot size | 4 × 2 cells |
| Pés per lot | 16 |
| Sacks per harvested cell | 2 |
| Fertilized sacks per cell | 3 |
| Drying time | 1 month |
| Terreiro batch slots | 4 |
| Tulha capacity | 256 sacks |
| Dry terreiro value | 100% / 66% / 33% |
| Discard age | 3 months |
| Roast bonus | +2 coins per sack |
| Roast wood | 1 per batch |

### Start and growth

| Item | Value |
| --- | ---: |
| Start coins | 12 |
| Start food | 4 |
| Start wood | 4 |
| Family food need | 2 per month |
| Food cap | 8 per family |
| Yard food | 2 per period |
| Rest bonus | 1 coin |
| Invite family | 4 coins |
| Family arrival reputation | 3 |
| Win families | 6 |
| School age | 6 |
| Education periods | 4 |
| Road tiles per adult | 1 per month |
| Clearing wood | 2 per tile |

### Seasons

| Season | Months | Event |
| --- | --- | --- |
| Spring | 1–4 | none |
| Summer | 5–8 | drought can reduce yard output |
| Autumn | 9–12 | coffee harvest |
| Winter | 13–16 | frost can damage mature coffee |

Each season has four months. A year has four seasons. The game lasts three
years.

---

## 14. FAQ

**Why can't I sell my coffee?**

Fresh coffee is wet and must spend one month drying. Only dry or roasted batches
can be sold.

**Why doesn't a second worker speed up one coffee lot?**

Coffee work is global. A lot has only 8 cells, so one adult already covers it in
a month. Extra workers cover other lots or harvest more cells.

**Why did the family panel close when I chose clearing?**

Clearing is targeted. The panel closes so you can see the map and click the
forest tile you want to clear.

**How do I fertilize a specific lot?**

Fertilizer and limestone are global tasks. Each worker applies the input to the
next eligible lot in lot order. The coffee page shows which lots are queued.

**Why is a building disabled in Works?**

It may need another building, may already exist as a unique building, or the
farm may lack coins or wood. The requirement line is always shown on the card.

**Why can't I demolish this building?**

The casa grande, occupied houses, a terreiro without enough remaining slots, a
tulha with coffee and a forno with roasted coffee cannot be demolished.

**How do I make roasted coffee?**

Build a terreiro, then a tulha, then a forno. Have dry coffee and at least one
wood, then assign Roast to an adult.

**Why did my coffee disappear?**

Dry coffee on the terreiro without tulha space ages for three months and is
discarded after that. The report records the spoiled amount.

---

Sítio is a Game Studio 42 game. Game code is AGPL-3.0-or-later; docs, art and
screenshots are CC-BY-4.0. See the repository license map for details.
