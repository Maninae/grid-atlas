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
│                   sticky-topbar reveal
├── meta.js         fuel colors/labels, subregion friendly names, CO2 ramp
├── format.js       plain-language sentence builders + number formats
├── usmap.js        US choropleth class — 4 instances in a 2x2 grid, one per
│                   metric (dominant fuel / clean / coal / CO2), click→select
├── lookup.js       lazy ZIP→subregion resolution (zips.json)
├── region.js       composes the "your grid" panel from chart modules
├── infopopup.js    (i) popover content + behavior
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
(4 cols x 2 rows) with carbon+price stacked beside it, then the day-on-grid
sticky scrolly showcase, then full-width trend/plants/story. A slim topbar
with a ZIP input slides in whenever the hero form is off-screen.

- No framework, no bundler. ES modules + D3 v7 / topojson-client from jsDelivr.
- All data ships as static JSON in `data/` — the live site makes zero API calls.
- State flows one way: `main.js` owns the selection, `region.js` renders it.
- `us-states.json` is pre-projected (Albers); plant lon/lats are projected with
  `d3.geoAlbersUsa().scale(1300).translate([487.5, 305])` to match (see plantsmap.js).
- Theming: dark default via `:root` CSS vars, light overrides via
  `[data-theme="light"]`. Theme-dependent SVG colors are set with `.style("fill"/"stroke", "var(--x)")`
  so they live-switch (bare SVG attrs don't resolve CSS vars). `usmap.refresh()`
  re-rasterizes the two computed clean/coal ramps (d3.interpolateRgb reads the
  current `--ramp-base`/`--clean-hi`/`--coal-hi`). A bootstrap script in `<head>`
  reads `localStorage["ga-theme"]` (falling back to `prefers-color-scheme`) and
  sets `data-theme` before stylesheets load, preventing FOUC.

## Conventions

- Fuel categories & colors live ONLY in `js/meta.js`; the build pipeline has
  the same canonical list in `build/common.py`. Change both or charts lie.
- Copy rules: short sentences, no jargon without an (i) popover, never repeat
  a point made elsewhere (see user's educational principles).
- Geographic granularity is honest: mix/CO₂ = eGRID subregion (zip level),
  trends/prices/plants = state, typical-day = grid operator.

## Local dev

```bash
python3 -m http.server 8000   # from repo root; open http://localhost:8000
```
(Needs a server because of fetch() + ES modules; file:// won't work.)
