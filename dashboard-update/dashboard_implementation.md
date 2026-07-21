# Love Andaman — B2B Sales Dashboard
## Implementation Specification (dev handoff)

**Version:** 1.0 · **Date:** 2026-07-17 · **Owner:** Joe (MD)
**Companion mockup:** `love_andaman_b2b_dashboard.html` (working reference implementation — behaviour in this spec must match the mockup)

---

## 0. สรุปสำหรับทีม dev (Thai TL;DR)

Dashboard วิเคราะห์ยอดขายช่อง B2B จากข้อมูล booking ในระบบ (`sb_bookings`). คำนวณ**ฝั่ง client ทั้งหมด**จากชุดข้อมูล booking ที่ป้อนเข้ามา — ไม่มี backend logic. ผู้ใช้สลับ **มุมมองวัน (จอง/เดินทาง)**, **ช่วงเทียบ (สัปดาห์/เดือน/YoY/rolling)**, และ **เกณฑ์ % จัด growth/loss/stable** ได้สด. ทุกชื่อ (agent / sales / market) กดเข้าหน้ารายละเอียดเฉพาะได้ และลิงก์ไป-กลับกันได้. เป้าหมายคือ implement logic ให้ **ตรงกับ mockup 100%** แล้วต่อเข้าระบบจริงเพื่อ refresh อัตโนมัติ.

หัวใจที่ต้องได้เป๊ะ: (1) นิยาม period + date-basis, (2) การจัดชั้น growth/loss/stable ตามเกณฑ์ปรับได้, (3) revenue bridge, (4) **สัญญาณย้ายเส้นทาง** (route-shift) ในหน้า By trip, (5) ระบบ navigation ข้ามหน้า.

---

## 1. Overview & goals

A single-page analytics dashboard for the B2B sales channel. It answers, for any chosen period and date basis:

- How is B2B revenue moving, and *why* (which agents drove the change)?
- How is each **sales owner** performing, per month and per agent?
- For each **trip/route**, who are the agents (ranked), and are they growing or shrinking **on that route specifically**?
- For each **market**, which agents sit in it and how are they trending?
- Which agents are **Growth / Loss / Stable** (and **New / Churned**)?

Design principles: all metrics computed live client-side; every entity name is a link into its own detail page; comparisons and thresholds are user-controllable.

**Scope note (important):** the source booking module is newly adopted (data from Dec 2025). Figures reflect *what is in the system*, not full historical company revenue. YoY modes will be sparse until a full year accumulates. This is expected; the dashboard must degrade gracefully (see §10).

---

## 2. Data sources & field mapping (from the existing system)

The app state object (`INITIAL_DATA`) contains these tables. The dashboard consumes:

| Table | Use |
|---|---|
| `sb_bookings` | primary fact source (one record per booking) |
| `sb_agents` | agent master → name, code, `sales` (owner ref) |
| `sb_sales` | sales-owner master (id → name, role) |
| `sb_markets` | market master (code → display name) |
| `routes` | route master (id → name, islands) → trip family |

### 2.1 Booking fields consumed (`sb_bookings[]`)

| Field | Meaning | Notes |
|---|---|---|
| `status` | booking status | **keep only `confirmed`**; drop `cancelled`, `cancelled_weather`, `quote` |
| `bookingDate` | date the booking was made | ISO `YYYY-MM-DD`; see §10 for cleanup |
| `bookedAt` | booking timestamp | fallback for `bookingDate` |
| `agentId` | FK → `sb_agents.id` | |
| `marketSnapshot.market` | market code at time of booking | FK → `sb_markets.id` |
| `priceBreakdown.total` | booking revenue (THB) | fallback `total` |
| `trips[]` | trips in the booking | usually 1; see §4.4 |
| `trips[].routeId` | FK → `routes.id` | → trip family (§4.7) |
| `trips[].date` | **travel date** | ISO; drives "travel-date" basis |
| `trips[].pax` | pax counts by type | see §4.5 |

### 2.2 Owner resolution (**non-obvious — implement carefully**)

The booking has no direct owner. Resolve:

```
owner = sb_sales[ sb_agents[booking.agentId].sales ]        // agent.sales is an sb_sales *id*, NOT a code
```

`sb_agents.sales` holds values like `s01`, `s05`, `s057714` which are **`sb_sales.id`** (not the `code` like `MMM`, `SOP`). If `sales` is empty/null (walk-in, house accounts) → owner = **"House"**. See §12 for the full id→name map.

---

## 3. Derived data model — the **trip-line**

Flatten confirmed bookings into **trip-lines** (1 row per booking × trip). ~1,177 rows from the sample export. Every aggregation in the dashboard is a filter+sum over trip-lines.

```
TripLine {
  bd     : bookingDate (ISO)               // booking-date basis
  td     : trips[].date (ISO)              // travel-date basis
  fam    : trip family (§4.7)              // Phi Phi | Similan | Surin | Krabi | อื่นๆ
  ag     : agent display name
  agid   : agentId                          // stable key for grouping/linking
  code   : agent code (sb_agents.code)      // for external sales-system link + CSV
  own    : owner display name (§2.2)
  mkt    : market display name (§4/§12)
  rev    : allocated revenue (THB, §4.4)
  pax    : paying pax (§4.5)
}
```

---

## 4. Core definitions & business rules

### 4.1 Confirmed filter
Include only `status === 'confirmed'`. (Everything downstream operates on confirmed trip-lines.)

### 4.2 Date basis (user toggle: "วันจอง" ↔ "วันเดินทาง")
- **Booking basis** → filter/bucket on `bd`.
- **Travel basis** → filter/bucket on `td`.
Default: **booking**. The same toggle drives every window filter and every monthly bucket.

### 4.3 Period comparison modes
Given a reference date `ref` (user-picked, default = latest data date), each mode yields a **current** window `[cs, ce]` and a **comparison** window `[ps, pe]` (all inclusive):

| Mode (UI label) | Current `[cs, ce]` | Comparison `[ps, pe]` |
|---|---|---|
| WoW — "สัปดาห์ (WoW)" | `[ref−6d, ref]` | `[ref−13d, ref−7d]` |
| MoM — "เดือน (MoM)" | `[ref−29d, ref]` | `[ref−59d, ref−30d]` |
| Same week LY — "สัปดาห์เดียวกันปีก่อน" | `[ref−6d, ref]` | current shifted −364d |
| Same month LY — "เดือนเดียวกันปีก่อน" | **calendar month of `ref`** | same calendar month, `year−1` |
| Rolling 12M | `[ref−364d, ref]` | `[ref−729d, ref−365d]` |

Default mode: **MoM**. Show the resolved window text to the user (e.g. "ช่วง 18 มิ.ย. – 17 ก.ค. เทียบ 19 พ.ค. – 17 มิ.ย.").

### 4.4 Revenue allocation
`bookingRevenue = priceBreakdown.total ?? total ?? 0`.
- Single-trip booking (the norm) → the trip-line gets the full booking revenue.
- Multi-trip booking → **allocate by pax share** across its trips (`rev_i = total × pax_i / Σpax`). Allocation must reconcile: `Σ rev over trip-lines === Σ booking totals`.

### 4.5 Pax
`pax = ad_th + ad_fr + chd_th + chd_fr` (adults + children, Thai + foreign). Infants and FOC are excluded from paying-pax counts.

### 4.6 Classification: Growth / Loss / Stable / New / Churned
Per **agent** (by `agid`), compare current-window revenue `c` vs comparison-window revenue `p`, with threshold `T` (percent, **user-adjustable**, default **10**):

```
if p <= 0 and c > 0      -> "new"
else if c <= 0 and p > 0 -> "churn"
else:
    g = (c - p) / p * 100
    if g === null (p == 0) -> "stable"     // both zero edge
    else if g >  T         -> "growth"
    else if g < -T         -> "loss"
    else                   -> "stable"
```

In tab counts: **Growth tab** = growth + new; **Loss tab** = loss + churn; **Stable tab** = stable. The G/S/L segmented bar uses: G = growth+new, S = stable, L = loss+churn.

The **same function** is reused at the **agent×route** grain for the By-trip tab (§6.4) — pass the agent's revenue *on that route* as `c`/`p`.

### 4.7 Trip-family mapping (routeId → family)
| routeId | family |
|---|---|
| r1, r2, r3, r4, r5 | Similan |
| r6 | Surin |
| r7, r8, r9, r10, r12 | Phi Phi |
| r11 | Krabi |
| *(any other)* | อื่นๆ |

(Implement as a lookup, not by parsing route names. r12 "Whale Shark Phi Phi Maiton" = Phi Phi.)

---

## 5. Screens & components

### 5.1 Global controls (always visible, top bar)
1. **Date basis** segmented toggle — วันจอง / วันเดินทาง (§4.2)
2. **Period** select — 5 modes (§4.3)
3. **Reference date** picker — default latest data date
4. **Threshold** number input — `±[N]%`, min 1 / max 50 / step 1, default 10 (§4.6)
5. **Export CSV** button (§8)
6. **Window label** — resolved current vs comparison dates

Any control change → recompute globals → re-render the **current screen** (keep the user where they are).

### 5.2 KPI row (global, whole B2B channel)
Four cards, each value + delta-vs-comparison:
- B2B revenue (Σ current revenue) · Δ%
- Active agents (agents with current revenue > 0) · Δ count
- Pax (Σ current pax) · Δ%
- Avg / agent (revenue ÷ active agents) · Δ%

### 5.3 Tabs
| Tab | Contents |
|---|---|
| **Overview** | Revenue bridge waterfall (§6.1) + summary (gained/lost/net) + Watchlist (top-10 agents by ฿ lost) |
| **By staff** | Monthly stacked trend by owner (§6.2) + owner summary table (agents, rev, Δ, **G/S/L bar** §6.3). Owner rows link → Staff detail |
| **By trip** | **Trip selector** (chips per family w/ revenue) → for the selected trip: summary + **full agent list ranked by revenue** with **per-route** class + **route-shift signal** (§6.4) |
| **By market** | Market table (agents, rev, Δ, % of total). Market rows link → Market detail |
| **Growth / Loss / Stable** | Agent list for that class, with action hint. Agent/owner/market names link to their detail pages |

### 5.4 Detail pages & navigation model
Three detail page types, reachable by clicking a name **anywhere**:

- **Agent detail** — header (name, class, code, owner-link, market-link, external sales-system link §7); KPIs (revenue+Δ, pax, bookings, #routes sent); monthly revenue chart; **"which routes they send"** table (family → bookings, pax, rev, Δ, per-route class); **recent bookings** list (booking date, travel date, trip, pax, ฿).
- **Staff (sales) detail** — header (name, role); KPIs (revenue+Δ, active agents, pax, % of team); G/S/L bar; monthly revenue chart; **agents-in-portfolio** table (agent-link, market-link, primary trip, rev, Δ, class).
- **Market detail** — header; KPIs (revenue+Δ, agents, pax, % of total); G/S/L bar; monthly revenue chart; **agents-in-market** table ranked (agent-link, owner-link, rev, Δ, class).

**Navigation:** maintain a history **stack**. `go(screen)` pushes the current screen and renders the target; **Back** ("‹ กลับ") pops. Clicking a top-tab clears the stack. Cross-links required:
`agent name → Agent detail` · `owner/sales name → Staff detail` · `market name → Market detail`, from every table that shows them (tabs **and** detail pages). Changing a global control while on a detail page re-renders that same detail page.

---

## 6. Key computed visuals & logic

### 6.1 Revenue bridge (waterfall)
Bars, left→right, floating (cumulative):
`Prev total → +Growth Δ → +New (cur) → ±Stable Δ → −Loss (prev−cur) → −Churn (prev) → Now total`

Where, over agents in each class (window = current vs comparison):
```
growthΔ = Σ (cur − prev)   over growth
newΔ    = Σ  cur           over new
stableΔ = Σ (cur − prev)   over stable
lossΔ   = Σ (prev − cur)   over loss    (shown negative)
churnΔ  = Σ  prev          over churn   (shown negative)
```
Identity (must reconcile): `prevTotal + growthΔ + newΔ + stableΔ − lossΔ − churnΔ === curTotal`.
Colours: prev/now = grey, growth/new = green, stable = muted teal, loss/churn = red.

### 6.2 Monthly stacked trend (By staff)
Bucket **all** trip-lines by `YYYY-MM` of the active basis (not window-limited — show full history for trend). Stacked bar, one series per owner (fixed colour per owner). Respects the date-basis toggle.

### 6.3 G/S/L segmented bar
Horizontal 3-segment bar (green=growth+new, grey=stable, red=loss+churn), widths ∝ agent counts, with numeric labels "N โต · N นิ่ง · N หด". Replaces raw "N/N/N" text for legibility.

### 6.4 Route-shift signal (By trip) — **the differentiating feature**
For each agent shown under a selected trip, compute **two** classifications over the same window:
- **route** = agent's revenue *on this route only* → `routeCls`, `routeΔ%`
- **overall** = agent's revenue *across all routes* → `overallΔ%`

Signal (T = threshold):
```
if routeCls in {loss, churn}:
    if overallΔ% !== null and overallΔ% > −T  -> "↘ ลดเส้นนี้ · ไปเส้นอื่น"   (amber)  // moved to another route, portfolio OK
    else                                       -> "↘ ลดทั้งพอร์ต"            (red)    // genuinely declining
elif routeCls == growth and overallΔ% !== null and overallΔ% <= T:
                                               -> "↗ ดึงมาเส้นนี้"           (blue)   // shifting FROM other routes TO this one
else: (no signal)
```
Purpose: distinguish an agent **reallocating between routes** from one **truly shrinking**. This becomes highly informative once multiple routes are active (e.g. Similan season opens).

---

## 7. Integration hook — link agent → sales work system
Each agent name carries a secondary external link (↗ "เปิดในระบบงาน sales"). Behaviour is a placeholder pending the target system:
```
SALES_SYS_URL = ''   // e.g. 'https://<sales-system>/agent/{id}'  or  '.../{code}'
openAgent(id, code): if SALES_SYS_URL set -> open URL with {id}/{code} substituted; else no-op/notice
```
**Action for dev/Joe:** provide the sales-system URL pattern and whether it keys on agent **`code`** (e.g. `CLUBWYND`) or internal **`id`** (e.g. `a01`). Then wire `SALES_SYS_URL`. (This link is separate from the internal Agent-detail link on the agent's name.)

---

## 8. Export (CSV / Excel)
"Export CSV" downloads the table(s) currently rendered on screen (works on every tab and detail page). Requirements: UTF-8 **with BOM** (so Excel renders Thai correctly); quote/escape cells containing `, " \n`; filename encodes the current screen + reference date, e.g. `LA_trip_PhiPhi_2026-07-17.csv`. Optional enhancement: true `.xlsx` via a spreadsheet lib.

---

## 9. Non-functional requirements
- **Compute:** entirely client-side over the trip-line array; no server round-trips for interaction.
- **Refresh:** the production build must load booking data from the live system (API or a data blob the system regenerates), replacing the embedded snapshot used in the mockup. Re-deriving trip-lines on load.
- **i18n:** Thai UI throughout; render with a Thai-capable font (mockup uses Noto Sans Thai + Inter; tabular figures for numbers).
- **Responsive:** usable down to mobile widths; tables may scroll horizontally.
- **Charts:** the mockup uses Chart.js; any equivalent is fine as long as the maths matches.
- **State on control change:** recompute + re-render current screen; never lose the user's place.

---

## 10. Data-quality handling & caveats
- **Malformed dates:** a few `bookingDate` / `trips[].date` values are non-ISO (e.g. `"Sat Jul 04"`). For booking date, fall back `bookingDate → bookedAt[:10] → createdAt[:10]`; if travel date is non-ISO, treat as missing (exclude from travel-basis windows).
- **Missing market:** some bookings have no market → label **"ไม่ระบุ"**.
- **Adoption ramp:** because the module is new, near-term period comparisons can look explosively positive (mostly "new" agents entering the system). Surface a notice when the comparison window has no data. Treat the tool as a **live inventory** now; the growth/loss triage sharpens once a stable baseline exists.

---

## 11. Acceptance criteria (test cases)
1. **Confirmed only** — cancelled/quote bookings never contribute to any figure.
2. **Basis toggle** — switching วันจอง↔วันเดินทาง re-buckets every window and monthly chart.
3. **Period windows** — resolved `[cs,ce]`/`[ps,pe]` match §4.3 exactly (unit-test each mode against fixed `ref`).
4. **Reconciliation** — Σ trip-line revenue in a window equals the corresponding sum of booking totals; bridge identity (§6.1) holds to the rounding.
5. **Threshold** — changing `T` reclassifies every agent everywhere immediately (e.g. 8 vs 10 vs 12 shifts counts).
6. **Route-shift signal** — an agent whose route revenue drops but overall rises is flagged "ไปเส้นอื่น"; whose overall also drops is flagged "ลดทั้งพอร์ต".
7. **Navigation** — clicking any agent/owner/market opens the correct detail; Back returns to the exact prior screen; changing controls on a detail page keeps that page.
8. **Export** — CSV of the current screen opens in Excel with correct Thai characters.

*Reference numbers from the sample export (MoM, booking basis, ref 2026-07-17, T=10):* B2B revenue current ≈ ฿4.57M; agent `a01` (Club Wyndham, owner ร่มธรรม) current ฿976,200 / 242 bookings / 541 pax / class = growth / all Phi Phi; Russian Market current ≈ ฿956,900 across 18 active agents.

---

## 12. Appendix — reference maps

### 12.1 Market codes (`sb_markets.id → name`)
| code | name |
|---|---|
| ru | Russian Market |
| ota | Online Travel Agent |
| hpk | Hotel Phuket |
| hkl | Hotel Khao Lak |
| cpk | Counter Tour Phuket |
| ckl | Counter Tour Khao Lak |
| ap | Asia Pacific |
| ww | World Wide |
| walkin | Walk-in / Direct |
| staff | Staff / Internal |

### 12.2 Sales owners (`sb_sales.id → name / role`)
| id | code | display name | role |
|---|---|---|---|
| s01 | IRI | Natthaphat | Sales Executive |
| s02 | MMM | Sangsunee | Sales Executive |
| s03 | NYM | ร่มธรรม | Sales Executive |
| s04 | NAN | Nana | Sales Executive |
| s05 | MIS | Mikhail | Sales Executive |
| s300574 | ALI | Nirin | Sales Executive |
| s057714 | SOP | Sopit | Director of Sales |
| *(none/empty)* | — | House | — |

### 12.3 Screens map (for QA)
`Global controls → KPIs → [Overview | By staff | By trip | By market | Growth | Loss | Stable]`, with `Agent / Staff / Market` detail pages reachable from any name and inter-linked, all sharing one history stack.

---

*End of specification. The accompanying `love_andaman_b2b_dashboard.html` is the authoritative reference for exact behaviour — when this document and the mockup disagree, treat it as a spec bug and reconcile.*