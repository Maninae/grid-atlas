# ⚡ Grid Atlas

**Where does your electricity come from?**

Type your ZIP code and meet your grid: what makes your electricity (solar?
coal? atoms?), how much CO₂ rides along with every kilowatt-hour, what it
costs, the actual power plants doing the work — and the 25-year story of how
it all changed.

**Live site:** https://maninae.github.io/grid-atlas/

## What's inside

- **ZIP-level lookup** using the EPA's own ZIP → grid-region crosswalk (the
  same data behind their Power Profiler, minus the clunky UI)
- **2025 fuel mix** for every state (EIA), with trends back to 2001
- **CO₂ per kWh** for all 27 US grid regions (EPA eGRID 2023 — the newest
  official release)
- **A typical day on your grid**: hourly fuel mix averaged over all of 2025
  (EIA-930) — watch solar swell at noon and batteries take the evening
- **All 13,400+ US power plants** mapped by size and fuel
- **Hand-researched grid histories** for CA, TX, WA, WV, and GA

Everything is free, public US government data, baked into static JSON at
build time. The site makes no API calls and collects nothing — your ZIP never
leaves your browser.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Rebuild the data

See [`build/CLAUDE.md`](build/CLAUDE.md). One `download.sh` plus five small
Python scripts regenerate everything in `data/` from EPA/EIA sources.

## Sources

| Data | Source | Vintage |
|---|---|---|
| Fuel mix & trends | [EIA state generation data](https://www.eia.gov/electricity/data/state/) + [EIA API v2](https://www.eia.gov/opendata/) | 2001–2025 |
| CO₂ rates, ZIP crosswalk, region boundaries | [EPA eGRID / Power Profiler](https://www.epa.gov/egrid) | 2023 |
| Hourly grid data | [EIA-930 Hourly Grid Monitor](https://www.eia.gov/electricity/gridmonitor/) | 2025 |
| Power plants | [EIA US Energy Atlas](https://atlas.eia.gov/datasets/eia::power-plants/about) | 2026 |
| Prices | [EIA retail sales](https://www.eia.gov/electricity/data.php) | 2001–2025 |

Not affiliated with the EPA or EIA. Data is presented as published; see the
site's methodology section for honest footnotes (utility-scale only, ZIP
boundary approximations, etc.).
