/* Fuel metadata, color palette, and friendly names. No logic, just facts. */

export const FUELS = {
  solar:      { label: "Solar",      color: "#EFAF3C", emoji: "☀️", clean: true,
                blurb: "Panels that turn sunlight into electricity." },
  wind:       { label: "Wind",       color: "#7CB8CF", emoji: "🌬️", clean: true,
                blurb: "Tall turbines spun by moving air." },
  hydro:      { label: "Hydro",      color: "#3E7CB1", emoji: "💧", clean: true,
                blurb: "Dams that catch the push of falling river water." },
  nuclear:    { label: "Nuclear",    color: "#9678B6", emoji: "⚛️", clean: true,
                blurb: "Splitting atoms to boil water and spin turbines. No carbon." },
  geothermal: { label: "Geothermal", color: "#C26E5A", emoji: "♨️", clean: true,
                blurb: "Heat from deep underground." },
  biomass:    { label: "Biomass",    color: "#8B9A47", emoji: "🌱", clean: false,
                blurb: "Burning wood, crop leftovers, or landfill gas." },
  gas:        { label: "Natural gas", color: "#E5854B", emoji: "🔥", clean: false,
                blurb: "Burning gas piped from underground. About half the CO2 of coal." },
  coal:       { label: "Coal",       color: "#564E46", emoji: "⛏️", clean: false,
                blurb: "The oldest way: burning mined coal. The most CO2 per unit of power." },
  oil:        { label: "Oil",        color: "#8A6A52", emoji: "🛢️", clean: false,
                blurb: "Burning petroleum. Rare for power in the US today." },
  battery:    { label: "Batteries",  color: "#3DB6A0", emoji: "🔋", clean: true,
                blurb: "Giant batteries that store extra power (often midday solar) and release it in the evening." },
  other:      { label: "Other",      color: "#B5AC9F", emoji: "⚡", clean: false,
                blurb: "Everything else: waste heat, miscellaneous fuels." },
  storage:    { label: "Storage",    color: "#3DB6A0", emoji: "🔋", clean: true,
                blurb: "Batteries and pumped-water storage. They save power for later instead of making it." },
};

export const FUEL_ORDER = ["solar", "wind", "hydro", "nuclear", "geothermal",
  "biomass", "gas", "coal", "oil", "battery", "other", "storage"];

/* CO2 intensity color ramp (g/kWh), Electricity-Maps-style semantics */
export const CO2_STOPS = [
  [0, "#3E9D63"], [150, "#7CB85C"], [300, "#E3C03F"],
  [450, "#DD8A3E"], [600, "#B85C38"], [800, "#6E4438"], [1000, "#3D2B26"],
];

/* eGRID subregion code -> plain-English place name */
export const SUBREGION_NAMES = {
  AKGD: "the Anchorage area",
  AKMS: "rural Alaska",
  AZNM: "Arizona & New Mexico",
  CAMX: "most of California",
  ERCT: "most of Texas",
  FRCC: "most of Florida",
  HIMS: "the smaller Hawaiian islands",
  HIOA: "Oahu",
  MROE: "eastern Wisconsin",
  MROW: "the Upper Midwest",
  NEWE: "New England",
  NYCW: "New York City & Westchester",
  NYLI: "Long Island",
  NYUP: "upstate New York",
  PRMS: "Puerto Rico",
  RFCE: "the eastern Mid-Atlantic",
  RFCM: "most of Michigan",
  RFCW: "the Ohio Valley & Great Lakes",
  RMPA: "Colorado & eastern Wyoming",
  SPNO: "Kansas & western Missouri",
  SPSO: "Oklahoma & the southern Plains",
  SRMV: "the lower Mississippi Valley",
  SRMW: "the central Midwest",
  SRSO: "Georgia, Alabama & the Gulf coast",
  SRTV: "the Tennessee Valley",
  SRVC: "the Carolinas & Virginia",
  NWPP: "the Pacific Northwest & Mountain West",
};

/* TopoJSON state name -> postal code */
export const STATE_ABBREV = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI",
  Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
  Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};

export function co2Color(g) {
  if (g == null) return "#E4DDD2";
  for (let i = CO2_STOPS.length - 1; i >= 0; i--) {
    const [lo, color] = CO2_STOPS[i];
    if (g >= lo) {
      if (i === CO2_STOPS.length - 1) return color;
      const [hi, next] = CO2_STOPS[i + 1];
      const t = (g - lo) / (hi - lo);
      return mixHex(color, next, t);
    }
  }
  return CO2_STOPS[0][1];
}

function mixHex(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function cleanShare(mix) {
  let s = 0;
  for (const [fuel, pct] of Object.entries(mix || {})) {
    if (FUELS[fuel] && FUELS[fuel].clean) s += pct;
  }
  return Math.round(s);
}

export function dominantFuel(mix) {
  let best = null, bestV = -1;
  for (const [fuel, pct] of Object.entries(mix || {})) {
    if (pct > bestV) { best = fuel; bestV = pct; }
  }
  return best;
}
