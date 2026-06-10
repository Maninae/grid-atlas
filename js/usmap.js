/* US choropleth, one instance per metric (the 2x2 map grid). Handles hover
   tooltips and state clicks; all instances share one tooltip element. */
import { FUELS, STATE_ABBREV, co2Color, cleanShare, dominantFuel } from "./meta.js";

const d3 = window.d3;
const topojson = window.topojson;

export class USMap {
  constructor(el, topo, states, { metric, onStateClick }) {
    this.states = states;
    this.metric = metric;
    this.tooltip = d3.select(document.body).selectAll("div.map-tip").data([0])
      .join("div").attr("class", "map-tip");

    const W = 975, H = 610;
    this.svg = d3.select(el).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
      .attr("class", "usmap-svg metric-" + metric);

    const features = topojson.feature(topo, topo.objects.states).features;
    const path = d3.geoPath(); // states-albers-10m is pre-projected

    this.paths = this.svg.append("g").selectAll("path")
      .data(features).join("path")
      .attr("d", path)
      .attr("class", "state")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => d.properties.name)
      .on("mousemove", (ev, d) => this.showTip(ev, d))
      .on("mouseleave", () => this.tooltip.style("opacity", 0))
      .on("click", (ev, d) => {
        const ab = STATE_ABBREV[d.properties.name];
        if (ab && onStateClick) onStateClick(ab);
      })
      .on("keydown", (ev, d) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          const ab = STATE_ABBREV[d.properties.name];
          if (ab && onStateClick) onStateClick(ab);
        }
      });

    this.svg.append("path")
      .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
      .attr("class", "state-borders")
      .attr("d", path);

    this.legendEl = document.createElement("div");
    this.legendEl.className = "map-legend";
    el.appendChild(this.legendEl);
    this.refresh();
  }

  themeVals() {
    const cs = getComputedStyle(document.documentElement);
    return {
      rampBase: cs.getPropertyValue("--ramp-base").trim(),
      cleanHi: cs.getPropertyValue("--clean-hi").trim(),
      noData: cs.getPropertyValue("--map-nodata").trim(),
    };
  }

  refresh() {
    this.theme = this.themeVals();
    this.paths.style("fill", (d) => this.colorFor(this.valueFor(d.properties.name)));
    this.renderLegend();
  }

  valueFor(name) {
    const ab = STATE_ABBREV[name];
    const s = ab && this.states[ab];
    if (!s) return null;
    switch (this.metric) {
      case "dominant": return dominantFuel(s.mix);
      case "clean": return cleanShare(s.mix);
      case "coal": return s.mix.coal || 0;
      case "co2": return s.co2_g_kwh;
      default: return null;
    }
  }

  colorFor(v) {
    const t = this.theme || this.themeVals();
    if (v == null) return t.noData;
    switch (this.metric) {
      case "dominant": return FUELS[v].color;
      case "clean": return d3.interpolateRgb(t.rampBase, t.cleanHi)(Math.min(v / 100, 1));
      case "coal": return d3.interpolateRgb("#F2F0EB", "#403326")(Math.min(v / 100, 1));
      case "co2": return co2Color(v);
      default: return t.noData;
    }
  }

  setSelected(ab) {
    this.paths.classed("selected", (d) => STATE_ABBREV[d.properties.name] === ab);
  }

  showTip(ev, d) {
    const name = d.properties.name;
    const ab = STATE_ABBREV[name];
    const s = ab && this.states[ab];
    if (!s) return;
    const dom = dominantFuel(s.mix);
    let line;
    switch (this.metric) {
      case "clean": line = `${cleanShare(s.mix)}% clean power`; break;
      case "coal": line = `${Math.round(s.mix.coal || 0)}% coal`; break;
      case "co2": line = `${Math.round(s.co2_g_kwh)} g CO₂ per kWh`; break;
      default: line = `#1 source: ${FUELS[dom].emoji} ${FUELS[dom].label} (${Math.round(s.mix[dom])}%)`;
    }
    this.tooltip
      .style("opacity", 1)
      .style("left", `${ev.pageX + 14}px`)
      .style("top", `${ev.pageY - 10}px`)
      .html(`<strong>${name}</strong><br>${line}<br><span class="tip-cta">click to explore</span>`);
  }

  renderLegend() {
    const L = this.legendEl;
    const t = this.theme || this.themeVals();
    if (this.metric === "dominant") {
      const fuels = ["gas", "coal", "nuclear", "hydro", "wind", "solar"];
      L.innerHTML = fuels.map((f) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${FUELS[f].color}"></span>${FUELS[f].label}</span>`
      ).join("");
    } else if (this.metric === "clean") {
      const mid = d3.interpolateRgb(t.rampBase, t.cleanHi)(0.5);
      L.innerHTML = ramp([t.rampBase, mid, t.cleanHi], "0%", "100% clean");
    } else if (this.metric === "coal") {
      L.innerHTML = ramp(["#F2F0EB", "#9A8B79", "#403326"], "0% coal", "100%");
    } else if (this.metric === "co2") {
      L.innerHTML = ramp(["#3ECF8E", "#E3C03F", "#D2603A", "#8E2F2A"], "low CO₂", "high");
    }
  }
}

function ramp(colors, lo, hi) {
  return `<span class="legend-lo">${lo}</span>` +
    `<span class="legend-ramp" style="background:linear-gradient(90deg, ${colors.join(",")})"></span>` +
    `<span class="legend-hi">${hi}</span>`;
}
