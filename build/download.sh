#!/bin/bash
# Downloads all raw inputs for the Grid Atlas data pipeline into build/raw/.
# Everything is free, public-domain (or CC-BY) US government / EPA / EIA data.
set -euo pipefail
cd "$(dirname "$0")/raw"

# EPA Power Profiler's own data files (public domain, USEPA GitHub)
curl -sL -o zip.csv "https://raw.githubusercontent.com/USEPA/power-profiler/master/app/data/zip.csv"
curl -sL -o subregion.json "https://raw.githubusercontent.com/USEPA/power-profiler/master/app/data/subregion.json"

# eGRID2023 summary tables (CO2 rates by state/subregion)
curl -sL -o summary_tables.xlsx "https://www.epa.gov/system/files/documents/2025-06/summary_tables_rev2.xlsx"

# EIA net generation by state x fuel, annual 1990-2024
curl -sL -o annual_generation_state.xls "https://www.eia.gov/electricity/data/state/annual_generation_state.xls"

# EIA-930 hourly balancing-authority data, full year 2025 (~90 MB total)
curl -sL -o eia930_2025H1.csv "https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_BALANCE_2025_Jan_Jun.csv"
curl -sL -o eia930_2025H2.csv "https://www.eia.gov/electricity/gridmonitor/sixMonthFiles/EIA930_BALANCE_2025_Jul_Dec.csv"

# All operable US power plants (EIA US Energy Atlas FeatureServer), paginated
for i in 0 2000 4000 6000 8000 10000 12000; do
  curl -sG "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/Power_Plants_in_the_US/FeatureServer/0/query" \
    --data-urlencode "where=1=1" \
    --data-urlencode "outFields=Plant_Code,Plant_Name,Utility_Na,City,County,State,Zip,PrimSource,tech_desc,Total_MW,Longitude,Latitude,Period" \
    --data-urlencode "f=json" \
    --data-urlencode "resultOffset=$i" \
    --data-urlencode "resultRecordCount=2000" \
    -o "plants_$i.json"
done

echo "Done. Now run the build_*.py scripts (see CLAUDE.md)."
