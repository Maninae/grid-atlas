/* State-zoomed dot map of power plants, sized by capacity, colored by fuel.
   The us-atlas "albers" topojson is pre-projected with d3.geoAlbersUsa()'s
   default transform, so we can project plant lon/lats with the same. */
import { FUELS, STATE_ABBREV } from "../meta.js";
import { fmtMW, homesServed } from "../format.js";

const d3 = window.d3;
const topojson = window.topojson;

let proj = null;

export function renderPlantsMap(el, topo, plants, stateAb) {
  el.innerHTML = "";
  if (!proj) proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);

  const features = topojson.feature(topo, topo.objects.states).features;
  const feature = features.find((f) => STATE_ABBREV[f.properties.name] === stateAb);
  if (!feature) return;

  const path = d3.geoPath();
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  const W = 520, H = 400, pad = 24;
  const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0));
  const tx = (W - k * (x0 + x1)) / 2;
  const ty = (H - k * (y0 + y1)) / 2;

  const svg = d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%");
  const g = svg.append("g").attr("transform", `translate(${tx},${ty}) scale(${k})`);

  g.append("path").datum(feature)
    .attr("d", path)
    .attr("fill", "#F1EBDF")
    .attr("stroke", "#C9BFAE")
    .attr("stroke-width", 1.2 / k);

  const inState = plants.filter((p) => p[1] === stateAb);
  const r = d3.scaleSqrt()
    .domain([0, Math.max(...inState.map((p) => p[3]), 100)])
    .range([0, 16 / Math.sqrt(k)]);

  const tip = d3.select(document.body).selectAll("div.map-tip").data([0])
    .join("div").attr("class", "map-tip");

  g.selectAll("circle")
    .data(inState.filter((p) => proj([p[4], p[5]])))
    .join("circle")
    .attr("cx", (p) => proj([p[4], p[5]])[0])
    .attr("cy", (p) => proj([p[4], p[5]])[1])
    .attr("r", (p) => Math.max(r(p[3]), 1.2 / k))
    .attr("fill", (p) => FUELS[p[2]].color)
    .attr("fill-opacity", 0.72)
    .attr("stroke", "#FFFFFF")
    .attr("stroke-width", 0.5 / k)
    .on("mousemove", (ev, p) => {
      tip.style("opacity", 1)
        .style("left", `${ev.pageX + 14}px`)
        .style("top", `${ev.pageY - 10}px`)
        .html(`<strong>${p[0]}</strong><br>${FUELS[p[2]].emoji} ${FUELS[p[2]].label} · ${fmtMW(p[3])}` +
              `<br><span class="tip-cta">can power ~${homesServed(p[3])}</span>`);
    })
    .on("mouseleave", () => tip.style("opacity", 0));

  // small fuel legend under the map, only fuels present
  const present = [...new Set(inState.slice(0, 400).map((p) => p[2]))];
  const legend = document.createElement("div");
  legend.className = "plants-legend";
  legend.innerHTML = present.map((f) =>
    `<span class="legend-item"><span class="legend-swatch" style="background:${FUELS[f].color}"></span>${FUELS[f].label}</span>`
  ).join("");
  el.appendChild(legend);
}
