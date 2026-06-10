"""zip.csv (EPA Power Profiler) -> data/zips.json

Output shape (compact to keep download small):
{ "subs": ["AKGD", ...],                      # subregion codes, indexed
  "utils": ["Pacific Gas & Electric Co", ...],# utility names, indexed
  "zips": { "94110": [subIdx, utilIdx, "CA"], ... } }
Only the predominant utility/subregion per ZIP is kept (same as EPA's tool).
"""
import csv
import json

from common import DATA, RAW


def main():
    subs, utils = [], []
    sub_idx, util_idx = {}, {}
    zips = {}
    with open(RAW / "zip.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("Predominant Utility", "1") != "1":
                continue
            z = row["zip"].strip()
            sub = row["SUBRGN"].strip()
            util = row["UtilName"].strip()
            if sub not in sub_idx:
                sub_idx[sub] = len(subs)
                subs.append(sub)
            if util not in util_idx:
                util_idx[util] = len(utils)
                utils.append(util)
            zips[z] = [sub_idx[sub], util_idx[util], row["state"].strip()]

    out = {"subs": subs, "utils": utils, "zips": zips}
    path = DATA / "zips.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    print(f"zips.json: {len(zips):,} ZIPs, {len(subs)} subregions, "
          f"{len(utils):,} utilities, {path.stat().st_size/1e6:.2f} MB")
    # Spot checks
    for z in ["94110", "78701", "25301", "30301", "98101", "10001"]:
        s, u, st = zips[z]
        print(f"  {z}: {subs[s]} {st} ({utils[u]})")


if __name__ == "__main__":
    main()
