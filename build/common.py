"""Shared constants for the Grid Atlas data pipeline. Python 3.9."""
from pathlib import Path

BUILD = Path(__file__).resolve().parent
RAW = BUILD / "raw"
DATA = BUILD.parent / "data"

# Canonical fuel categories, in display order (cleanest-feeling first).
FUELS = ["solar", "wind", "hydro", "nuclear", "geothermal", "biomass",
         "gas", "coal", "oil", "other"]
CLEAN = {"solar", "wind", "hydro", "nuclear", "geothermal"}

# EIA annual_generation_state.xls "ENERGY SOURCE" -> category
XLS_SOURCE_MAP = {
    "Coal": "coal",
    "Natural Gas": "gas",
    "Nuclear": "nuclear",
    "Hydroelectric Conventional": "hydro",
    "Wind": "wind",
    "Solar Thermal and Photovoltaic": "solar",
    "Geothermal": "geothermal",
    "Wood and Wood Derived Fuels": "biomass",
    "Other Biomass": "biomass",
    "Petroleum": "oil",
    "Other": "other",
    "Other Gases": "other",
    "Pumped Storage": "other",
}

# EIA API v2 fueltypeid -> category (disjoint set; sums to ~ALL)
API_FUEL_MAP = {
    "COW": "coal", "NG": "gas", "NUC": "nuclear", "HYC": "hydro",
    "WND": "wind", "SUN": "solar", "GEO": "geothermal", "BIO": "biomass",
    "PET": "oil", "OOG": "other", "HPS": "other", "OTH": "other",
}

LB_PER_MWH_TO_G_PER_KWH = 453.59237 / 1000.0  # lb/MWh -> g/kWh

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "Washington, D.C.", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

# eGRID subregion -> grid operator group for typical-day curves (EIA-930 BAs).
# Approximate by design: a subregion's daily rhythm is shown via its dominant
# grid operator(s). Documented in build/CLAUDE.md.
OPERATORS = {
    "CISO":      ("the California grid (CAISO + munis)", ["CISO", "BANC", "LDWP", "IID", "TIDC"]),
    "ERCO":      ("ERCOT, the Texas grid", ["ERCO"]),
    "ISNE":      ("ISO New England", ["ISNE"]),
    "NYIS":      ("the New York grid (NYISO)", ["NYIS"]),
    "PJM":       ("PJM, the Mid-Atlantic grid", ["PJM"]),
    "MISO":      ("MISO, the Midwest grid", ["MISO"]),
    "SWPP":      ("Southwest Power Pool", ["SWPP"]),
    "SOCO":      ("Southern Company", ["SOCO"]),
    "TVA":       ("the Tennessee Valley Authority", ["TVA"]),
    "CAROLINAS": ("Carolinas & Virginia utilities", ["DUK", "CPLE", "CPLW", "SC", "SCEG", "DOM"]),
    "FLA":       ("Florida utilities", ["FPL", "FPC", "TEC", "JEA", "SEC", "FMPP", "GVL", "TAL", "HST", "NSB"]),
    "SOUTHWEST": ("Arizona & New Mexico utilities", ["AZPS", "SRP", "TEPC", "PNM", "EPE", "WALC"]),
    "NORTHWEST": ("Northwest utilities", ["BPAT", "PACW", "PGE", "PSEI", "SCL", "TPWR", "AVA", "CHPD", "DOPD", "GCPD", "IPCO", "NWMT", "PACE", "AVRN"]),
    "ROCKIES":   ("Colorado & Wyoming utilities", ["PSCO", "WACM", "WAUW"]),
}

SUBREGION_TO_OPERATOR = {
    "CAMX": "CISO", "ERCT": "ERCO", "NEWE": "ISNE",
    "NYCW": "NYIS", "NYLI": "NYIS", "NYUP": "NYIS",
    "RFCE": "PJM", "RFCW": "PJM", "RFCM": "MISO",
    "MROE": "MISO", "MROW": "MISO", "SRMV": "MISO", "SRMW": "MISO",
    "SPNO": "SWPP", "SPSO": "SWPP",
    "SRSO": "SOCO", "SRTV": "TVA", "SRVC": "CAROLINAS", "FRCC": "FLA",
    "AZNM": "SOUTHWEST", "NWPP": "NORTHWEST", "RMPA": "ROCKIES",
    # No hourly EIA-930 data: Alaska, Hawaii, Puerto Rico
    "AKGD": None, "AKMS": None, "HIMS": None, "HIOA": None, "PRMS": None,
}
