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
├── main.js         boot, data loading, selection state, deep links (#94110/#CA)
├── meta.js         fuel colors/labels, subregion friendly names, CO2 ramp
├── format.js       plain-language sentence builders + number formats
├── usmap.js        hero choropleth (scroll-driven metrics, click→select)
├── scrolly.js      IntersectionObserver step driver
├── lookup.js       lazy ZIP→subregion resolution (zips.json)
├── region.js       composes the "your grid" panel from chart modules
├── infopopup.js    (i) popover content + behavior
└── charts/         waffle.js · area.js (trend + typical day) · dotstrip.js
                    · line.js · plantsmap.js
data/               baked JSON (see build/CLAUDE.md for provenance)
build/              Python pipeline that regenerates data/ (not deployed)
```

- No framework, no bundler. ES modules + D3 v7 / topojson-client from jsDelivr.
- All data ships as static JSON in `data/` — the live site makes zero API calls.
- State flows one way: `main.js` owns the selection, `region.js` renders it.
- `us-states.json` is pre-projected (Albers); plant lon/lats are projected with
  `d3.geoAlbersUsa().scale(1300).translate([487.5, 305])` to match (see plantsmap.js).

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
