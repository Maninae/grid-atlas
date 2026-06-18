/* US choropleth, one instance per metric (the 2x2 map grid). Handles hover
   tooltips and state clicks; all instances share one tooltip element. */
import { FUELS, STATE_ABBREV, co2Color, cleanShare, dominantFuel } from "./meta.js";

// Fixed ramps, identical in both themes, aligned so darker = dirtier energy
// (a theme-dependent clean ramp once flipped that meaning in dark mode).
const CLEAN_LO = "#232C33", CLEAN_HI = "#3ECF8E";
const COAL_LO = "#F2F0EB", COAL_HI = "#403326";

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

    // Paths are deliberately NOT focusable: focusable SVG paths get
    // OS/browser focus rings on click (the "blue box") that CSS cannot
    // always suppress (Safari, macOS Full Keyboard Access). Keyboard users
    // select states via the all-51 chip buttons in the showcase section.
    this.paths = this.svg.append("g").selectAll("path")
      .data(features).join("path")
      .attr("d", path)
      .attr("class", "state")
      .attr("aria-label", (d) => d.properties.name)
      .on("mousemove", (ev, d) => this.showTip(ev, d))
      .on("mouseleave", () => this.tooltip.style("opacity", 0))
      .on("click", (ev, d) => {
        const ab = STATE_ABBREV[d.properties.name];
        if (ab && onStateClick) onStateClick(ab);
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
    return { noData: cs.getPropertyValue("--map-nodata").trim() };
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
      case "clean": return d3.interpolateRgb(CLEAN_LO, CLEAN_HI)(Math.min(v / 100, 1));
      case "coal": return d3.interpolateRgb(COAL_LO, COAL_HI)(Math.min(v / 100, 1));
      case "co2": return co2Color(v);
      default: return t.noData;
    }
  }

  setSelected(ab, flash = false) {
    this.paths.classed("selected", (d) => STATE_ABBREV[d.properties.name] === ab);
    this.paths.classed("flash", false);
    if (!flash || !ab) return;
    // Off-white glow on the newly selected state, fading back to its color.
    // Class is dropped and reflow forced so re-clicking restarts the animation.
    const target = this.paths.filter((d) => STATE_ABBREV[d.properties.name] === ab);
    target.each(function () { void this.getBoundingClientRect(); });
    target.classed("flash", true)
      .on("animationend.flash", function () { d3.select(this).classed("flash", false); });
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
      .html(`<strong>${name}</strong><br>${line}<br><span class="tip-cta">click to explore</span>`);
    // keep the tooltip in the viewport when hovering a state near the bottom edge
    const tipH = this.tooltip.node().offsetHeight || 90;
    const maxTop = window.scrollY + window.innerHeight - tipH - 12;
    const top = Math.max(window.scrollY + 8, Math.min(ev.pageY - 10, maxTop));
    this.tooltip.style("top", `${top}px`);
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
      const mid = d3.interpolateRgb(CLEAN_LO, CLEAN_HI)(0.5);
      L.innerHTML = ramp([CLEAN_LO, mid, CLEAN_HI], "0%", "100% clean");
    } else if (this.metric === "coal") {
      L.innerHTML = ramp([COAL_LO, "#9A8B79", COAL_HI], "0% coal", "100%");
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
