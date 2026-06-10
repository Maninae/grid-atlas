"""EIA-930 hourly CSVs (2025 full year) -> data/typicalday.json

For each grid-operator group (see common.OPERATORS): average MW per fuel for
each local hour of day across all of 2025, converted to share-of-generation.
Negative values (storage charging, metering noise) are clamped to zero.

Output: { "operators": { "CISO": {"name": ..., "fuels": [...],
                                   "hours": [[h0 shares...], ...24 rows] } },
          "sub2op": { "CAMX": "CISO", ... } }
Shares are percentages rounded to 0.1.
"""
import csv
import json
from collections import defaultdict

from common import DATA, OPERATORS, RAW, SUBREGION_TO_OPERATOR

COLMAP = {
    "Net Generation (MW) from Coal (Adjusted)": "coal",
    "Net Generation (MW) from Natural Gas (Adjusted)": "gas",
    "Net Generation (MW) from Nuclear (Adjusted)": "nuclear",
    "Net Generation (MW) from All Petroleum Products (Adjusted)": "oil",
    "Net Generation (MW) from Hydropower Excluding Pumped Storage (Adjusted)": "hydro",
    "Net Generation (MW) from Solar without Integrated Battery Storage (Adjusted)": "solar",
    "Net Generation (MW) from Solar witho Integrated Battery Storage (Adjusted)": "solar",  # sic, EIA typo for "with"
    "Net Generation (MW) from Wind without Integrated Battery Storage (Adjusted)": "wind",
    "Net Generation (MW) from Wind with Integrated Battery Storage (Adjusted)": "wind",
    "Net Generation (MW) from Battery Storage (Adjusted)": "battery",
    "Net Generation (MW) from Other Energy Storage (Adjusted)": "battery",
    "Net Generation (MW) from Unknown Energy Storage (Adjusted)": "battery",
    "Net Generation (MW) from Pumped Storage  (Adjusted)": "battery",  # double space sic
    "Net Generation (MW) from Geothermal (Adjusted)": "geothermal",
    "Net Generation (MW) from Other Fuel Sources (Adjusted)": "other",
    "Net Generation (MW) from Unknown Fuel Sources (Adjusted)": "other",
}
FUEL_ORDER = ["solar", "wind", "hydro", "nuclear", "geothermal",
              "gas", "coal", "oil", "battery", "other"]

BA_TO_OP = {}
for op, (_, bas) in OPERATORS.items():
    for ba in bas:
        BA_TO_OP[ba] = op


def parse_mw(v):
    if not v or v in ("", "NA"):
        return 0.0
    try:
        return float(v.replace(",", ""))
    except ValueError:
        return 0.0


def main():
    # sums[op][hour][fuel] accumulate MW; counts[op][hour] hours observed
    sums = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    counts = defaultdict(lambda: defaultdict(int))

    for fname in ["eia930_2025H1.csv", "eia930_2025H2.csv"]:
        with open(RAW / fname, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ba = row["Balancing Authority"]
                op = BA_TO_OP.get(ba)
                if not op:
                    continue
                # "Local Time at End of Hour" like "1/1/2025 1:00:00 AM"
                t = row["Local Time at End of Hour"]
                try:
                    clock = t.split(" ", 1)[1]
                    hh = int(clock.split(":", 1)[0])
                    if "PM" in t and hh != 12:
                        hh += 12
                    if "AM" in t and hh == 12:
                        hh = 0
                except (IndexError, ValueError):
                    continue
                hh = hh % 24  # hour ending
                any_val = False
                for col, fuel in COLMAP.items():
                    v = parse_mw(row.get(col, ""))
                    if v != 0:
                        any_val = True
                    # CAISO reports its grid batteries under "Other Fuel
                    # Sources" in EIA-930 (its battery column is empty);
                    # verified against H1/H2 2025. Relabel for honesty.
                    if ba == "CISO" and fuel == "other":
                        fuel = "battery"
                    sums[op][hh][fuel] += max(v, 0.0)
                if any_val:
                    counts[op][hh] += 1

    operators = {}
    for op, (label, _bas) in OPERATORS.items():
        if op not in sums:
            print(f"  !! no 930 data for {op}")
            continue
        hours = []
        for hh in range(24):
            tot = sum(sums[op][hh].values())
            if tot <= 0:
                hours.append([0.0] * len(FUEL_ORDER))
                continue
            hours.append([round(100.0 * sums[op][hh][f] / tot, 1)
                          for f in FUEL_ORDER])
        operators[op] = {"name": label, "fuels": FUEL_ORDER, "hours": hours}

    out = {"operators": operators,
           "sub2op": {k: v for k, v in SUBREGION_TO_OPERATOR.items() if v},
           "year": 2025}
    path = DATA / "typicalday.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    print(f"typicalday.json: {len(operators)} operators, "
          f"{path.stat().st_size/1024:.0f} KB")
    for op in ["CISO", "ERCO", "PJM"]:
        h = operators[op]["hours"]
        fi = FUEL_ORDER.index
        print(f"  {op}: solar 4am {h[4][fi('solar')]}% / noon {h[12][fi('solar')]}% / "
              f"8pm {h[20][fi('solar')]}% ; gas noon {h[12][fi('gas')]}% / 8pm {h[20][fi('gas')]}%")


if __name__ == "__main__":
    main()
