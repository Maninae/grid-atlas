/* The hero US choropleth. Switches metric on scroll steps, handles hover
   tooltips and state clicks. One instance, owned by main.js. */
import { FUELS, STATE_ABBREV, co2Color, cleanShare, dominantFuel } from "./meta.js";

const d3 = window.d3;
const topojson = window.topojson;

export class USMap {
  constructor(el, topo, states, onStateClick) {
    this.el = el;
    this.states = states;
    this.onStateClick = onStateClick;
    this.metric = "dominant";
    this.tooltip = d3.select(document.body).append("div").attr("class", "map-tip");

    const W = 975, H = 610;
    this.svg = d3.select(el).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%");

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
        if (ab && this.onStateClick) this.onStateClick(ab);
      })
      .on("keydown", (ev, d) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          const ab = STATE_ABBREV[d.properties.name];
          if (ab && this.onStateClick) this.onStateClick(ab);
        }
      });

    this.svg.append("path")
      .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
      .attr("class", "state-borders")
      .attr("d", path);

    this.legendEl = document.createElement("div");
    this.legendEl.className = "map-legend";
    el.appendChild(this.legendEl);

    this.setMetric("dominant");
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
    if (v == null) return "#E4DDD2";
    switch (this.metric) {
      case "dominant": return FUELS[v].color;
      case "clean": return d3.interpolateRgb("#EFE9DD", "#2E7D52")(Math.min(v / 100, 1));
      case "coal": return d3.interpolateRgb("#EFE9DD", "#564E46")(Math.min(v / 90, 1));
      case "co2": return co2Color(v);
      default: return "#E4DDD2";
    }
  }

  setMetric(metric) {
    this.metric = metric;
    this.paths.transition().duration(650)
      .attr("fill", (d) => this.colorFor(this.valueFor(d.properties.name)));
    this.renderLegend();
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
    if (this.metric === "dominant") {
      const fuels = ["gas", "coal", "nuclear", "hydro", "wind", "solar"];
      L.innerHTML = `<span class="map-legend-title">#1 power source</span>` +
        fuels.map((f) =>
          `<span class="legend-item"><span class="legend-swatch" style="background:${FUELS[f].color}"></span>${FUELS[f].label}</span>`
        ).join("");
    } else if (this.metric === "clean") {
      L.innerHTML = ramp("share of clean power", ["#EFE9DD", "#8FBF9F", "#2E7D52"], "0%", "100%");
    } else if (this.metric === "coal") {
      L.innerHTML = ramp("share from coal", ["#EFE9DD", "#A39A8E", "#564E46"], "0%", "90%");
    } else if (this.metric === "co2") {
      L.innerHTML = ramp("CO₂ per kWh", ["#3E9D63", "#E3C03F", "#B85C38", "#3D2B26"], "low", "high");
    }
  }
}

function ramp(title, colors, lo, hi) {
  return `<span class="map-legend-title">${title}</span>` +
    `<span class="legend-lo">${lo}</span>` +
    `<span class="legend-ramp" style="background:linear-gradient(90deg, ${colors.join(",")})"></span>` +
    `<span class="legend-hi">${hi}</span>`;
}
