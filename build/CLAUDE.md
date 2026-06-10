# Grid Atlas — data pipeline

Transforms free public data (EPA eGRID, EIA) into the compact JSON files in
`../data/` that the static site loads. Run once (or yearly when new data drops).
The site itself never calls any API — everything is baked.

## How to run

```bash
python3 -m venv venv && ./venv/bin/pip install pandas openpyxl xlrd requests
./download.sh                              # fetch raw inputs into raw/
./venv/bin/python build_zips.py            # -> data/zips.json
./venv/bin/python build_subregions.py      # -> data/subregions.json, subregions-geo.json
./venv/bin/python build_plants.py          # -> data/plants.json
./venv/bin/python build_states.py          # -> data/states.json  (needs plants.json first)
./venv/bin/python build_typical_day.py     # -> data/typicalday.json
```

Python 3.9 — no modern-syntax features (no `match`, no `X | Y` type unions).

## Modules

| File | Responsibility | Output |
|---|---|---|
| `common.py` | Fuel-category mappings, subregion→operator map, state names, paths | — |
| `build_zips.py` | EPA zip→subregion/utility crosswalk, indexed for size | `zips.json` |
| `build_subregions.py` | Per-subregion fuel mix, CO2 g/kWh, rank, simplified boundaries | `subregions.json`, `subregions-geo.json` |
| `build_plants.py` | All 13.4k operable plants: name/state/fuel/MW/lat/lon | `plants.json` |
| `build_states.py` | 2001–2025 fuel-mix trends, 2025 mix, prices, CO2, top plants, facts | `states.json` |
| `build_typical_day.py` | Avg hourly fuel shares (24h) per grid operator, 2025 | `typicalday.json` |

`build_states.py` is the only script that hits the network (EIA API v2 with
`DEMO_KEY` — two requests total, well within limits).

## Data decisions (read before changing anything)

- **Sector**: state generation uses EIA "all sectors" (API sectorid 99), which
  exactly equals the XLS "Total Electric Power Industry". Verified: CA 2024 =
  214,191,383 MWh in both. Utility-scale only — rooftop solar is NOT included
  (the site says so in an info popup).
- **2025 mix** comes from the EIA API (annual, confirmed full-year). 2001–2024
  comes from `annual_generation_state.xls`. Same sector definition, safe to
  concatenate.
- **CO2 rates** are eGRID2023 (released Jun 2025) — the newest official
  zip-level emissions data. lb/MWh × 0.45359 = g/kWh.
- **Fuel categories** (10): solar, wind, hydro, nuclear, geothermal, biomass,
  gas, coal, oil, other. Typical-day adds `battery`. Pumped storage & negative
  values are clamped/folded into "other" for share math.
- **CAISO battery quirk**: CAISO reports grid batteries under "Other Fuel
  Sources" in EIA-930 (its Battery column is empty; verified across 2025 H1+H2,
  ~5 GW evening discharge). `build_typical_day.py` relabels other→battery for
  the CISO BA only.
- **Subregion → operator** (`common.SUBREGION_TO_OPERATOR`): typical-day curves
  exist per balancing authority, not per eGRID subregion. Each subregion maps to
  its dominant grid operator (CAMX→CAISO, RFCE/RFCW→PJM, …). Approximate by
  design; AK/HI/PR have no EIA-930 hourly data and the UI hides that chart.
- **ZIP quirks**: ~10–15% of ZIPs straddle subregions; we keep EPA's
  "predominant" pick (rows with `Predominant Utility == 1`), same as EPA's tool.
- **EPA/EIA static files have no CORS** — that's why everything is baked at
  build time instead of fetched in the browser.

## Refreshing next year

1. Bump `FINAL_YEAR` in `build_states.py`, update the eGRID/930 URLs in
   `download.sh` (eGRID2024 official was unreleased as of Jun 2026; check
   https://www.epa.gov/egrid/detailed-data), re-run everything.
2. `data/stories.json` is hand-researched content (not generated) — extend by hand.
