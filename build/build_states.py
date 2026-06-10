"""Builds data/states.json — the per-state core of the site.

Sources:
  - raw/annual_generation_state.xls  (EIA, 1990-2024 final) -> trend 2001-2024
  - EIA API v2 electric-power-operational-data, annual 2025  -> 2025 mix
  - EIA API v2 retail-sales, annual residential price 2001-2025
  - raw/summary_tables.xlsx Table 3 (eGRID2023)              -> state CO2 lb/MWh
  - data/plants.json                                          -> top plants per state

Per state: { name, trend: {years, series}, mix: {fuel: %} (latest year),
             totalTwh, co2_g_kwh, co2_rank/co2_n, price: {years, res},
             topPlants, facts }
"US" holds the national equivalent.
"""
import json
import time
import urllib.parse
import urllib.request

import pandas as pd

from common import (API_FUEL_MAP, CLEAN, DATA, FUELS, LB_PER_MWH_TO_G_PER_KWH,
                    RAW, STATE_NAMES, XLS_SOURCE_MAP)

API = "https://api.eia.gov/v2"
KEY = "DEMO_KEY"
START_YEAR = 2001
FINAL_YEAR = 2025  # from EIA API (full-year annual data confirmed available)


def api_get(route, params):
    qs = urllib.parse.urlencode([("api_key", KEY)] + params)
    url = f"{API}/{route}/data?{qs}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                d = json.loads(r.read())
            return d["response"]
        except Exception as e:  # rate limit / transient
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def shares_from_totals(totals):
    """{fuel: MWh} -> {fuel: share %} with negatives clamped."""
    pos = {k: max(v, 0.0) for k, v in totals.items()}
    s = sum(pos.values())
    if s <= 0:
        return {}
    return {k: round(100.0 * v / s, 1) for k, v in pos.items() if v > 0.0005 * s}


def load_xls_trends():
    df = pd.read_excel(RAW / "annual_generation_state.xls", header=1)
    df = df[df["TYPE OF PRODUCER"] == "Total Electric Power Industry"]
    df = df[df["YEAR"] >= START_YEAR]
    df["STATE"] = df["STATE"].str.strip()
    df = df[df["ENERGY SOURCE"] != "Total"]
    df["cat"] = df["ENERGY SOURCE"].map(XLS_SOURCE_MAP)
    assert df["cat"].notna().all(), df[df["cat"].isna()]["ENERGY SOURCE"].unique()
    g = df.groupby(["STATE", "YEAR", "cat"])["GENERATION (Megawatthours)"].sum()
    out = {}  # state -> year -> {cat: MWh}
    for (st, yr, cat), mwh in g.items():
        out.setdefault(st, {}).setdefault(int(yr), {})[cat] = float(mwh)
    return out


def load_2025():
    resp = api_get("electricity/electric-power-operational-data", [
        ("frequency", "annual"), ("data[0]", "generation"),
        ("facets[sectorid][]", "99"), ("start", "2025"), ("end", "2025"),
        ("length", "5000"),
    ] + [("facets[fueltypeid][]", f) for f in list(API_FUEL_MAP) + ["ALL"]])
    rows = resp["data"]
    print(f"  API 2025 generation rows: {len(rows)} (total={resp['total']})")
    out, totals_all = {}, {}
    for r in rows:
        loc, fid = r["location"], r["fueltypeid"]
        mwh = float(r["generation"] or 0) * 1000.0  # thousand MWh -> MWh
        if fid == "ALL":
            totals_all[loc] = mwh
            continue
        cat = API_FUEL_MAP[fid]
        out.setdefault(loc, {})[cat] = out.setdefault(loc, {}).get(cat, 0) + mwh
    # validate component sum vs ALL
    for loc, cats in out.items():
        if loc in totals_all and totals_all[loc] > 0:
            diff = abs(sum(cats.values()) - totals_all[loc]) / totals_all[loc]
            assert diff < 0.02, (loc, diff)
    return out


def load_prices():
    resp = api_get("electricity/retail-sales", [
        ("frequency", "annual"), ("data[0]", "price"),
        ("facets[sectorid][]", "RES"),
        ("start", str(START_YEAR)), ("end", str(FINAL_YEAR)),
        ("length", "5000"),
    ])
    rows = resp["data"]
    print(f"  API price rows: {len(rows)} (total={resp['total']})")
    out = {}  # state -> {year: price}
    for r in rows:
        if r["price"] is None:
            continue
        out.setdefault(r["stateid"], {})[int(r["period"])] = float(r["price"])
    return out


def load_co2():
    df = pd.read_excel(RAW / "summary_tables.xlsx", sheet_name="Table 3",
                       header=None)
    out = {}
    for _, row in df.iterrows():
        st, co2 = row[1], row[2]
        if isinstance(st, str) and st.strip() in STATE_NAMES and \
                isinstance(co2, (int, float)):
            out[st.strip()] = float(co2)
    assert len(out) >= 50, len(out)
    # national rate from Table 1 footer? Use generation-weighted mean of states
    # only as fallback; eGRID US rate is published as 771.9 lb/MWh for 2023 —
    # compute it properly from Table 4 net generation weights instead.
    t4 = pd.read_excel(RAW / "summary_tables.xlsx", sheet_name="Table 4",
                       header=None)
    weights = {}
    for _, row in t4.iterrows():
        st, gen = row[1], row[3]
        if isinstance(st, str) and st.strip() in STATE_NAMES and \
                isinstance(gen, (int, float)):
            weights[st.strip()] = float(gen)
    us = sum(out[s] * weights[s] for s in out if s in weights) / \
        sum(weights[s] for s in out if s in weights)
    return out, us


def top_plants(n=6):
    d = json.loads((DATA / "plants.json").read_text())
    by_state = {}
    for name, st, fuel, mw, lon, lat, util in d["plants"]:
        if fuel == "storage":
            continue  # storage moves power around; it doesn't generate
        by_state.setdefault(st, [])
        if len(by_state[st]) < n:
            by_state[st].append([name, fuel, mw])
    return by_state


def make_facts(trend_years, series, mix, plants):
    facts = {}
    if plants:
        p = plants[0]
        facts["biggestPlant"] = {"name": p[0], "fuel": p[1], "mw": p[2]}
    first, last = {}, {}
    for cat in series:
        first[cat] = series[cat][0] if series[cat] else 0
        last[cat] = series[cat][-1] if series[cat] else 0
    if first and last:
        lead_then = max(first, key=first.get)
        lead_now = max(last, key=last.get)
        facts["leaderThen"] = {"year": trend_years[0], "fuel": lead_then,
                               "share": first[lead_then]}
        facts["leaderNow"] = {"year": trend_years[-1], "fuel": lead_now,
                              "share": last[lead_now]}
    clean_then = sum(v for k, v in first.items() if k in CLEAN)
    clean_now = sum(v for k, v in last.items() if k in CLEAN)
    facts["cleanThen"] = round(clean_then, 1)
    facts["cleanNow"] = round(clean_now, 1)
    return facts


def main():
    print("Loading XLS trends (2001-2024)...")
    xls = load_xls_trends()
    print("Fetching 2025 generation from EIA API...")
    gen25 = load_2025()
    print("Fetching residential prices from EIA API...")
    prices = load_prices()
    print("Loading eGRID state CO2 rates...")
    co2, us_co2 = load_co2()
    plants = top_plants()

    # CO2 rank among states
    rank = {st: i + 1 for i, (st, _) in
            enumerate(sorted(co2.items(), key=lambda kv: kv[1]))}

    states = {}
    years = list(range(START_YEAR, FINAL_YEAR + 1))
    for st, name in STATE_NAMES.items():
        per_year = xls.get(st, {})
        if st in gen25:
            per_year = dict(per_year)
            per_year[2025] = gen25[st]
        if not per_year:
            print(f"  !! no generation data for {st}")
            continue
        # share series per category
        series = {cat: [] for cat in FUELS}
        for yr in years:
            sh = shares_from_totals(per_year.get(yr, {}))
            for cat in FUELS:
                series[cat].append(sh.get(cat, 0.0))
        series = {c: v for c, v in series.items() if any(x > 0 for x in v)}
        latest_total = sum(max(v, 0) for v in per_year.get(2025, {}).values())
        mix = shares_from_totals(per_year.get(2025, {}))
        pr = prices.get(st, {})
        states[st] = {
            "name": name,
            "mix": mix,
            "mixYear": 2025,
            "totalTwh": round(latest_total / 1e6, 1),
            "trend": {"years": years, "series": series},
            "co2_lb_mwh": round(co2.get(st, 0), 1),
            "co2_g_kwh": round(co2.get(st, 0) * LB_PER_MWH_TO_G_PER_KWH, 1),
            "co2_rank": rank.get(st), "co2_n": len(rank),
            "price": {"years": [y for y in years if y in pr],
                      "res": [pr[y] for y in years if y in pr]},
            "topPlants": plants.get(st, []),
        }
        states[st]["facts"] = make_facts(years, series, mix, plants.get(st, []))

    # National
    us_per_year = {}
    for st in STATE_NAMES:
        for yr, cats in xls.get(st, {}).items():
            for cat, mwh in cats.items():
                us_per_year.setdefault(yr, {})[cat] = \
                    us_per_year.setdefault(yr, {}).get(cat, 0) + mwh
    if "US" in gen25:
        us_per_year[2025] = gen25["US"]
    us_series = {cat: [] for cat in FUELS}
    for yr in years:
        sh = shares_from_totals(us_per_year.get(yr, {}))
        for cat in FUELS:
            us_series[cat].append(sh.get(cat, 0.0))
    us_pr = prices.get("US", {})
    states["US"] = {
        "name": "United States",
        "mix": shares_from_totals(us_per_year.get(2025, {})),
        "mixYear": 2025,
        "totalTwh": round(sum(max(v, 0) for v in us_per_year.get(2025, {}).values()) / 1e6, 0),
        "trend": {"years": years, "series": us_series},
        "co2_lb_mwh": round(us_co2, 1),
        "co2_g_kwh": round(us_co2 * LB_PER_MWH_TO_G_PER_KWH, 1),
        "price": {"years": [y for y in years if y in us_pr],
                  "res": [us_pr[y] for y in years if y in us_pr]},
        "topPlants": [],
        "facts": {},
    }

    path = DATA / "states.json"
    path.write_text(json.dumps(states, separators=(",", ":")))
    print(f"states.json: {len(states)} entries, {path.stat().st_size/1e6:.2f} MB")
    for st in ["CA", "TX", "WV", "WA", "GA", "US"]:
        s = states[st]
        top3 = sorted(s["mix"].items(), key=lambda x: -x[1])[:3]
        last_price = s["price"]["res"][-1] if s["price"]["res"] else None
        print(f"  {st}: 2025 mix {top3} | CO2 {s['co2_g_kwh']} g/kWh | "
              f"price {last_price} c/kWh | {s['totalTwh']} TWh")


if __name__ == "__main__":
    main()
