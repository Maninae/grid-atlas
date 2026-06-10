"""EPA subregion.json -> data/subregions.json + data/subregions-geo.json

subregions.json: per-subregion fuel mix, CO2 rate (g/kWh + lb/MWh), grid loss,
full name, operator for typical-day lookup, and US comparison stats.
subregions-geo.json: GeoJSON boundaries with coordinates rounded to 2 decimals
(~1 km precision, plenty for a national overlay) to shrink the file.
"""
import json

from common import DATA, RAW, LB_PER_MWH_TO_G_PER_KWH, SUBREGION_TO_OPERATOR

# EPA fuelMix keys -> our categories
MIX_MAP = {
    "coal": "coal", "oil": "oil", "gas": "gas", "nuclear": "nuclear",
    "hydro": "hydro", "biomass": "biomass", "wind": "wind", "solar": "solar",
    "geothermal": "geothermal", "otherFossilFuel": "other",
    "otherUnknownFuel": "other",
}


def round_coords(obj, nd=2):
    if isinstance(obj, list):
        if obj and all(isinstance(x, (int, float)) for x in obj):
            return [round(x, nd) for x in obj]
        return [round_coords(x, nd) for x in obj]
    return obj


def main():
    src = json.loads((RAW / "subregion.json").read_text())
    subs = {}
    geo_features = []
    for f in src["features"]:
        p = f["properties"]
        if p.get("type") != "subregion":
            continue
        code = p["name"]
        mix = {}
        for k, v in p["fuelMix"].items():
            cat = MIX_MAP[k]
            mix[cat] = round(mix.get(cat, 0) + v, 1)
        co2_lb = p["emissionFactor"]["co2EmissionRate"]["value"]
        subs[code] = {
            "name": code,
            "fullName": p["fullName"],
            "dataYear": p["dataYear"],
            "mix": mix,
            "co2_lb_mwh": round(co2_lb, 1),
            "co2_g_kwh": round(co2_lb * LB_PER_MWH_TO_G_PER_KWH, 1),
            "gridLoss": p["gridLoss"]["value"],
            "operator": SUBREGION_TO_OPERATOR.get(code),
        }
        geo_features.append({
            "type": "Feature",
            "properties": {"code": code},
            "geometry": round_coords(f["geometry"]),
        })

    # Rank for "cleaner than X of Y US grid regions"
    ordered = sorted(subs.values(), key=lambda s: s["co2_g_kwh"])
    for rank, s in enumerate(ordered):
        s["co2_rank"] = rank + 1          # 1 = cleanest
        s["co2_n"] = len(ordered)

    (DATA / "subregions.json").write_text(
        json.dumps(subs, separators=(",", ":")))
    geo = {"type": "FeatureCollection", "features": geo_features}
    (DATA / "subregions-geo.json").write_text(
        json.dumps(geo, separators=(",", ":")))

    print(f"subregions.json: {len(subs)} subregions")
    for code in ["CAMX", "ERCT", "RFCW", "NWPP"]:
        s = subs[code]
        print(f"  {code}: {s['co2_g_kwh']} g/kWh, rank {s['co2_rank']}/{s['co2_n']}, "
              f"mix top: {sorted(s['mix'].items(), key=lambda x: -x[1])[:3]}")
    print(f"subregions-geo.json: {(DATA/'subregions-geo.json').stat().st_size/1e6:.2f} MB")


if __name__ == "__main__":
    main()
