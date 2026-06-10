/* 10x10 waffle chart: 100 squares = 100% of electricity. Countable, honest. */
import { FUELS } from "../meta.js";

export function renderWaffle(el, mix) {
  el.innerHTML = "";
  const entries = Object.entries(mix)
    .sort((a, b) => b[1] - a[1]);

  // Largest-remainder rounding so squares always total exactly 100
  const floored = entries.map(([f, v]) => [f, Math.floor(v)]);
  let used = floored.reduce((s, [, v]) => s + v, 0);
  const rema = entries
    .map(([f, v], i) => [i, v - Math.floor(v)])
    .sort((a, b) => b[1] - a[1]);
  for (let k = 0; used < 100 && k < rema.length; k++, used++) {
    floored[rema[k][0]][1] += 1;
  }

  const grid = document.createElement("div");
  grid.className = "waffle-grid";
  for (const [fuel, count] of floored) {
    for (let i = 0; i < count; i++) {
      const sq = document.createElement("div");
      sq.className = "waffle-sq";
      sq.style.background = FUELS[fuel].color;
      sq.title = `${FUELS[fuel].label} — ${Math.round(mix[fuel])}%`;
      grid.appendChild(sq);
    }
  }
  el.appendChild(grid);

  const legend = document.createElement("div");
  legend.className = "waffle-legend";
  for (const [fuel, v] of entries) {
    if (v < 0.5) continue;
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML =
      `<span class="legend-swatch" style="background:${FUELS[fuel].color}"></span>` +
      `<span class="legend-label">${FUELS[fuel].emoji} ${FUELS[fuel].label}</span>` +
      `<span class="legend-value">${Math.round(v)}%</span>`;
    item.title = FUELS[fuel].blurb;
    legend.appendChild(item);
  }
  el.appendChild(legend);
}
