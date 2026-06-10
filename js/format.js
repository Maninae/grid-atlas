/* Number formatting and plain-language sentence builders (5th-grade level). */
import { FUELS, cleanShare, dominantFuel } from "./meta.js";

export const fmtPct = (v) => `${Math.round(v)}%`;
export const fmtNum = (v) => v.toLocaleString("en-US");

export function fmtMW(mw) {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1).replace(/\.0$/, "")} GW`;
  return `${Math.round(mw)} MW`;
}

/* ~1 MW of capacity serves very roughly 750 average US homes year-round
   (1 MW * 8760h * ~45% avg fleet capacity factor / 10,700 kWh per home).
   We say "roughly" and round hard — this is a feel number, not an invoice. */
export function homesServed(mw) {
  const homes = mw * 750;
  if (homes >= 950000) return `${(homes / 1e6).toFixed(1).replace(/\.0$/, "")} million homes`;
  if (homes >= 1000) return `${(Math.round(homes / 1000) * 1000).toLocaleString("en-US")} homes`;
  return `${Math.round(homes)} homes`;
}

/* CO2 equivalences a person can feel. EPA: ~400 g CO2 per mile driven. */
export function co2Sentence(gPerKwh) {
  const miles = gPerKwh / 400;
  if (gPerKwh < 5) return "almost nothing — this grid is nearly carbon-free";
  if (miles < 0.2) return "like driving a gas car a few blocks";
  if (miles < 0.4) return "like driving a gas car about a quarter mile";
  if (miles < 0.65) return "like driving a gas car about half a mile";
  if (miles < 0.9) return "like driving a gas car most of a mile";
  if (miles < 1.15) return "like driving a gas car about a mile";
  return `like driving a gas car about ${miles.toFixed(1).replace(/\.0$/, "")} miles`;
}

export function mixSentence(mix, placeName) {
  const dom = dominantFuel(mix);
  if (!dom) return "";
  const f = FUELS[dom];
  const pct = Math.round(mix[dom]);
  const clean = cleanShare(mix);
  let s = `${f.label} makes the most electricity in ${placeName} — about ${pct}% of it.`;
  const entries = Object.entries(mix).sort((a, b) => b[1] - a[1]);
  if (entries.length > 1) {
    const [secondFuel, secondPct] = entries[1];
    s += ` ${FUELS[secondFuel].label} comes next at ${Math.round(secondPct)}%.`;
  }
  s += ` Overall, about ${clean}% comes from clean sources.`;
  return s;
}

export function trendSentence(facts, stateName) {
  if (!facts || !facts.leaderThen) return "";
  const then = facts.leaderThen, now = facts.leaderNow;
  let s;
  if (then.fuel !== now.fuel) {
    s = `In ${then.year}, ${FUELS[then.fuel].label.toLowerCase()} made the most power in ${stateName}. ` +
        `Today it's ${FUELS[now.fuel].label.toLowerCase()}.`;
  } else {
    s = `${FUELS[now.fuel].label} has been ${stateName}'s top power source since at least ${then.year}.`;
  }
  if (facts.cleanNow - facts.cleanThen >= 5) {
    s += ` Clean power grew from ${Math.round(facts.cleanThen)}% to ${Math.round(facts.cleanNow)}%.`;
  } else if (facts.cleanThen - facts.cleanNow >= 5) {
    s += ` Clean power slipped from ${Math.round(facts.cleanThen)}% to ${Math.round(facts.cleanNow)}%.`;
  }
  return s;
}

export function rankSentence(rank, n, what) {
  if (!rank) return "";
  if (rank <= Math.ceil(n / 3)) return `That's cleaner than most ${what} — #${rank} of ${n}.`;
  if (rank > Math.floor((2 * n) / 3)) return `That's dirtier than most ${what} — #${rank} of ${n}.`;
  return `That's about the middle of the pack — #${rank} of ${n}.`;
}
