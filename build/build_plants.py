"""plants_*.json (EIA Atlas FeatureServer pages) -> data/plants.json

Compact array of all operable US plants:
  [name, state, fuel, total_mw, lon, lat, utility]
Fuel comes from PrimSource (EIA's primary source label).
"""
import json

from common import DATA, RAW, STATE_NAMES

NAME_TO_ABBREV = {v: k for k, v in STATE_NAMES.items()}
NAME_TO_ABBREV["District of Columbia"] = "DC"
NAME_TO_ABBREV["Puerto Rico"] = "PR"

# PrimSource -> our categories (keep batteries/pumped storage distinct: they
# store power rather than make it, and the map labels them honestly)
PRIM_MAP = {
    "coal": "coal", "natural gas": "gas", "nuclear": "nuclear",
    "petroleum": "oil", "hydroelectric": "hydro", "solar": "solar",
    "wind": "wind", "geothermal": "geothermal", "biomass": "biomass",
    "pumped storage": "storage", "batteries": "storage", "other": "other",
}


def main():
    plants = []
    for off in range(0, 14000, 2000):
        path = RAW / f"plants_{off}.json"
        if not path.exists():
            continue
        d = json.loads(path.read_text())
        for feat in d.get("features", []):
            a = feat["attributes"]
            mw = a.get("Total_MW") or 0
            lon, lat = a.get("Longitude"), a.get("Latitude")
            if not lon or not lat or mw <= 0:
                continue
            fuel = PRIM_MAP.get((a.get("PrimSource") or "other").lower(), "other")
            st = NAME_TO_ABBREV.get(a.get("State", ""), a.get("State", ""))
            plants.append([
                a.get("Plant_Name", "").strip(),
                st,
                fuel,
                round(mw, 1),
                round(lon, 3),
                round(lat, 3),
                (a.get("Utility_Na") or "").strip(),
            ])

    plants.sort(key=lambda p: -p[3])
    out = {"fields": ["name", "state", "fuel", "mw", "lon", "lat", "utility"],
           "plants": plants}
    path = DATA / "plants.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    print(f"plants.json: {len(plants):,} plants, {path.stat().st_size/1e6:.2f} MB")
    print("  top 5:", [(p[0], p[1], p[2], p[3]) for p in plants[:5]])


if __name__ == "__main__":
    main()
