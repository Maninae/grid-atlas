/* 10x10 waffle chart: 100 squares = 100% of electricity.
   Max 7 colors: the top 6 fuels keep their hue; everything smaller is grouped
   into one neutral "everything else" block so the chart reads at a glance. */
import { FUELS } from "../meta.js";

export function renderWaffle(el, mix) {
  el.innerHTML = "";
  const sorted = Object.entries(mix).sort((a, b) => b[1] - a[1]);

  // Build display rows: top 6 fuels + grouped remainder (if 2+ fuels remain)
  let rows = sorted.map(([f, v]) => ({
    key: f, value: v, color: FUELS[f].color,
    label: `${FUELS[f].emoji} ${FUELS[f].label}`, title: FUELS[f].blurb,
  }));
  if (sorted.length > 7) {
    const rest = sorted.slice(6);
    const restShare = rest.reduce((s, [, v]) => s + v, 0);
    const parts = rest
      .map(([f, v]) => `${FUELS[f].label.toLowerCase()} ${Math.round(v) || "<1"}%`)
      .join(", ");
    rows = rows.slice(0, 6);
    rows.push({
      key: "__rest", value: restShare, color: FUELS.other.color,
      label: "⚡ Everything else", title: parts, sub: parts,
    });
  }

  // Largest-remainder rounding so squares always total exactly 100
  rows.forEach((r) => { r.squares = Math.floor(r.value); });
  let used = rows.reduce((s, r) => s + r.squares, 0);
  const byRemainder = [...rows].sort(
    (a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)));
  for (let k = 0; used < 100 && k < byRemainder.length; k++, used++) {
    byRemainder[k].squares += 1;
  }

  const grid = document.createElement("div");
  grid.className = "waffle-grid";
  for (const r of rows) {
    for (let i = 0; i < r.squares; i++) {
      const sq = document.createElement("div");
      sq.className = "waffle-sq";
      sq.style.background = r.color;
      sq.title = `${r.label.replace(/^\S+ /, "")} — ${Math.round(r.value)}%` +
        (r.sub ? ` (${r.sub})` : "");
      grid.appendChild(sq);
    }
  }
  el.appendChild(grid);

  const legend = document.createElement("div");
  legend.className = "waffle-legend";
  for (const r of rows) {
    if (r.value < 0.5) continue;
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML =
      `<span class="legend-swatch" style="background:${r.color}"></span>` +
      `<span class="legend-label">${r.label}</span>` +
      `<span class="legend-value">${Math.round(r.value)}%</span>` +
      (r.sub ? `<span class="legend-sub">${r.sub}</span>` : "");
    item.title = r.title;
    legend.appendChild(item);
  }
  el.appendChild(legend);
}
