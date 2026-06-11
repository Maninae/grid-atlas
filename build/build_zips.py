"""zip.csv (EPA Power Profiler) + OpenEI 2024 utility rates -> data/zips.json

Output shape (compact to keep download small):
{ "subs":  ["AKGD", ...],                       # subregion codes, indexed
  "utils": ["Pacific Gas & Electric Co", ...],  # utility names, indexed
  "zips":  { "94110": [subIdx, utilIdx, "CA", rate_cents_per_kwh_or_null], ... } }

The 4th element is the 2024 average residential price (cents/kWh, 1-decimal float)
for the zip's predominant utility, or null when we can't match one. Source:
NREL/OpenEI iou_zipcodes_2024.csv + non_iou_zipcodes_2024.csv (CC-BY 4.0).
Match policy: join on (zip, eiaid); if no eiaid match, fall back to the mean
res_rate across all rows for that zip; else null.

Only the predominant utility/subregion per ZIP is kept (same as EPA's tool) —
EXCEPT Texas, which gets a 5th element: every Bundled-rate utility OpenEI lists
for the ZIP (predominant first), so the UI can offer a picker. Texas needs this
because geographic predominance routinely names a rural coop for suburban ZIPs
where most customers are on deregulated retail-choice plans (whose REP plan
prices exist in no public per-ZIP dataset — the UI adds an explicit
"retail choice" fallback option for them).
"""
import csv
import json
from collections import defaultdict

from common import DATA, RAW


def load_openei_rates():
    """Return ({(zip, eiaid): res_rate $/kWh}, {zip: mean_res_rate $/kWh},
    {tx_zip: {eiaid: (utility_name, res_rate $/kWh)}} for Bundled TX rows).

    Both OpenEI files share the same schema. Some zip+eiaid combos appear in
    multiple rows (e.g. Bundled + Delivery service for IOUs in retail-choice
    states). Residential customers on a default plan are billed bundled rates,
    so when both exist we keep the Bundled row; otherwise we average the rows.
    """
    # Group rows by key to handle service_type duplicates intelligently.
    key_rows = defaultdict(list)   # (zip, eiaid) -> list of (service_type, rate)
    zip_rows = defaultdict(list)   # zip -> list of rate  (for fallback mean)
    tx_opts = defaultdict(dict)    # zip -> {eiaid: (utility_name, bundled rate)}
    for fname in ("iou_zipcodes_2024.csv", "non_iou_zipcodes_2024.csv"):
        with open(RAW / fname, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                try:
                    rate = float(row["res_rate"])
                except (TypeError, ValueError):
                    continue
                if rate <= 0:
                    continue
                z = row["zip"].strip().zfill(5)
                eiaid = row["eiaid"].strip()
                stype = row.get("service_type", "").strip()
                key_rows[(z, eiaid)].append((stype, rate))
                zip_rows[z].append(rate)
                if row.get("state", "").strip() == "TX" and stype == "Bundled":
                    tx_opts[z][eiaid] = (row["utility_name"].strip(), rate)

    by_key = {}
    for key, rows in key_rows.items():
        bundled = [r for s, r in rows if s == "Bundled"]
        chosen = bundled[0] if bundled else (sum(r for _, r in rows) / len(rows))
        by_key[key] = chosen

    by_zip_mean = {z: sum(rs) / len(rs) for z, rs in zip_rows.items()}
    return by_key, by_zip_mean, tx_opts


def main():
    rates_by_key, rates_by_zip, tx_opts = load_openei_rates()

    subs, utils = [], []
    sub_idx, util_idx = {}, {}
    zips = {}
    n_eiaid_hit = n_zip_fallback = n_null = 0
    with open(RAW / "zip.csv", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row.get("Predominant Utility", "1") != "1":
                continue
            z = row["zip"].strip().zfill(5)
            sub = row["SUBRGN"].strip()
            util = row["UtilName"].strip()
            eiaid = row.get("eiaid", "").strip()
            if sub not in sub_idx:
                sub_idx[sub] = len(subs)
                subs.append(sub)
            if util not in util_idx:
                util_idx[util] = len(utils)
                utils.append(util)
            rate_d = rates_by_key.get((z, eiaid))
            if rate_d is not None:
                n_eiaid_hit += 1
            else:
                rate_d = rates_by_zip.get(z)
                if rate_d is not None:
                    n_zip_fallback += 1
                else:
                    n_null += 1
            rate_c = round(rate_d * 100, 1) if rate_d is not None else None
            entry = [sub_idx[sub], util_idx[util], row["state"].strip(), rate_c]
            if row["state"].strip() == "TX":
                # Utility picker options: predominant first, then every other
                # Bundled-rate utility OpenEI lists for this ZIP.
                options = [[util_idx[util], rate_c]]
                for oid, (oname, orate) in sorted(tx_opts.get(z, {}).items(),
                                                  key=lambda kv: kv[1][0]):
                    if oid == eiaid:
                        continue
                    if oname not in util_idx:
                        util_idx[oname] = len(utils)
                        utils.append(oname)
                    options.append([util_idx[oname], round(orate * 100, 1)])
                entry.append(options)
            zips[z] = entry

    out = {"subs": subs, "utils": utils, "zips": zips}
    path = DATA / "zips.json"
    path.write_text(json.dumps(out, separators=(",", ":")))
    total = len(zips)
    print(f"zips.json: {total:,} ZIPs, {len(subs)} subregions, "
          f"{len(utils):,} utilities, {path.stat().st_size/1e6:.2f} MB")
    print(f"  rate coverage: eiaid-matched {n_eiaid_hit:,} ({n_eiaid_hit/total:.1%}), "
          f"zip-mean fallback {n_zip_fallback:,} ({n_zip_fallback/total:.1%}), "
          f"null {n_null:,} ({n_null/total:.1%})")
    # Spot checks
    for z in ["94401", "95814", "94110", "78701", "25301", "30301", "98101", "10001"]:
        hit = zips.get(z)
        if not hit:
            print(f"  {z}: (not in crosswalk)")
            continue
        s, u, st, rate = hit[:4]
        rate_str = f"{rate}c/kWh" if rate is not None else "no rate"
        print(f"  {z}: {subs[s]} {st} ({utils[u]}) -> {rate_str}")


if __name__ == "__main__":
    main()
