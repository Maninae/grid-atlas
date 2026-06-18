# Grid Atlas

Static site (GitHub Pages): type a ZIP code or click a state → see where that
electricity comes from, its CO₂ per kWh, prices, the plants behind it, and how
it changed since 2001. Audience: everyday Americans; copy is plain-language
(~5th-grade reading level) with (i) popovers for depth.

## Architecture

```
index.html          all markup + copy (no templating)
css/                base.css (tokens/layout) · components.css · charts.css
js/
├── main.js         boot, data loading, selection state, deep links (#94110/#CA),
│                   sticky-topbar reveal, map-click feedback. ≥1200px (SIDE_BY_SIDE):
│                   maps + at-a-glance render side by side, so a click just
│                   pulses+flashes — NO scroll/cue (detail is already beside).
│                   1000–1200px desktop: partial scroll pinning the map-grid top +
│                   "see it below" cue; mobile ≤760px: full scroll to panel
├── meta.js         fuel colors/labels, subregion friendly names, CO2 ramp
├── format.js       plain-language sentence builders + number formats
├── usmap.js        US choropleth class — 4 instances in a 2x2 grid, one per
│                   metric (dominant fuel / clean / coal / CO2), click→select
├── lookup.js       lazy ZIP→subregion/utility/rate resolution (zips.json);
│                   TX entries also carry utility `options` for the picker
├── region.js       composes the "your grid" panel from chart modules; owns the
│                   TX utility picker (mutates sel, re-calls renderRegion —
│                   keep renderRegion idempotent, resize re-render relies on it)
├── infopopup.js    (i) popover content + behavior
├── share.js        html2canvas PNG export buttons (watermark strip) on every
│                   card/map — self-initializing, loaded directly by index.html
├── dayscrolly.js   "a day on your grid" sticky scrolly (chart + hour-band
│                   highlight driven by IntersectionObserver steps)
└── charts/         waffle.js (top-4 fuels + grouped "everything else")
                    · area.js (returns scales; trend + typical day)
                    · dotstrip.js · line.js · plantsmap.js
data/               baked JSON (see build/CLAUDE.md for provenance)
build/              Python pipeline that regenerates data/ (not deployed)
```

Layout principle: dense for secondary info, generous for hero visualizations.
The four national maps share one screen (2x2 grid). Region panel: big mix tile
(4 cols x 2 rows, a flex column so its waffle absorbs the span height — don't
let it stretch into dead space) with carbon+price stacked beside it, then the
day-on-grid sticky scrolly showcase, then full-width trend/plants/story. A slim
topbar with a ZIP input slides in whenever the hero form is off-screen.

Side-by-side (≥1200px): `index.html` wraps `.map-grid-section` + `#region-panel`
in `<div class="explore">` (a 2-col grid, maps left / at-a-glance right). The
at-a-glance cards (`.cards cards-glance` = mix + carbon + cost) are the ONLY
thing in `#region-panel` now; the deep dives (day-on-grid, trend, plants, story)
were split into a sibling `<section id="region-deep">` that stays full-width
below. region.js un-hides BOTH on render. <1200px `.explore` is plain block flow
so everything stacks exactly as before (mobile unchanged). All the chart `id`s
are unchanged — region.js targets by id, so the DOM move is transparent to it.

- No framework, no bundler. ES modules + D3 v7 / topojson-client from jsDelivr.
- All data ships as static JSON in `data/` — the live site makes zero API calls.
- State flows one way: `main.js` owns the selection, `region.js` renders it.
- `us-states.json` is pre-projected (Albers); plant lon/lats are projected with
  `d3.geoAlbersUsa().scale(1300).translate([487.5, 305])` to match (see plantsmap.js).
- Theming: dark default via `:root` CSS vars, light overrides via
  `[data-theme="light"]`. Theme-dependent SVG colors are set with `.style("fill"/"stroke", "var(--x)")`
  so they live-switch (bare SVG attrs don't resolve CSS vars). `usmap.refresh()`
  re-applies map fills + legends on theme change (only `--map-nodata` is
  theme-dependent; the clean/coal ramps are fixed constants in usmap.js,
  aligned so darker = dirtier in BOTH themes). A bootstrap script in `<head>`
  reads `localStorage["ga-theme"]` (falling back to `prefers-color-scheme`) and
  sets `data-theme` before stylesheets load, preventing FOUC.
- `.day-sticky` must stay `position: sticky` — do NOT add it to the share-button
  `position: relative` rule in components.css (that override shipped once and
  silently killed the scrolly; sticky already anchors the absolute .share-btn).
- The scroll cue dismisses on user input events (wheel/touchmove/keydown), not
  an IntersectionObserver — IO delivers stale intersection records right after
  showCue and races it. Don't "simplify" it back.

## Conventions

- Fuel categories & colors live ONLY in `js/meta.js`; the build pipeline has
  the same canonical list in `build/common.py`. Change both or charts lie.
- Copy rules: short sentences, no jargon without an (i) popover, never repeat
  a point made elsewhere (see user's educational principles).
- Geographic granularity is honest: mix/CO₂ = eGRID subregion (zip level),
  trends/prices/plants = state, typical-day = grid operator.
- The "a day on your grid" chart resolves an operator via, in order: ZIP →
  `sub2op[subregion]`, US → "US", plain state → `state2op[state]` (the state's
  dominant operator, baked from the ZIP crosswalk in build_typical_day.py). It's
  labeled by the operator's own name, so naming the dominant operator stays
  honest even for split states. AK/HI have no EIA-930 data → chart hidden, note
  shown.
- Texas gets special honesty: the ZIP's "predominant utility" is a land-area
  guess, so TX shows a utility picker + "I pick my own plan (retail choice)"
  fallback (no public dataset has per-ZIP retail plan prices — see
  build/CLAUDE.md before "fixing" that).

## Local dev

```bash
python3 -m http.server 8000   # from repo root; open http://localhost:8000
```
(Needs a server because of fetch() + ES modules; file:// won't work.)
