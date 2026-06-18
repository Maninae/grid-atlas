/* Stacked area chart of fuel shares — used for both the 20-year trend
   (x = years) and the typical day (x = hours). Expects shares summing ~100. */
import { FUELS } from "../meta.js";

const d3 = window.d3;

export function renderStackedArea(el, { xs, series, xLabel, xTickFormat, order, maxH }) {
  el.innerHTML = "";
  const fuels = (order || Object.keys(series)).filter((f) => series[f]);
  const W = el.clientWidth || 600;
  const H = Math.min(maxH || 340, Math.max(240, W * 0.5));
  const m = { top: 10, right: 12, bottom: 28, left: 44 };

  const svg = d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%");

  const rows = xs.map((x, i) => {
    const r = { x };
    for (const f of fuels) r[f] = Math.max(series[f][i] || 0, 0);
    return r;
  });
  const stack = d3.stack().keys(fuels)
    .offset(d3.stackOffsetExpand);          // normalize to 0..1 → honest 100%
  const layers = stack(rows);

  const xScale = d3.scaleLinear().domain(d3.extent(xs)).range([m.left, W - m.right]);
  const yScale = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);

  const area = d3.area()
    .x((d) => xScale(d.data.x))
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.6));

  svg.selectAll("path.layer").data(layers).join("path")
    .attr("class", "layer")
    .attr("d", area)
    .attr("fill", (d) => FUELS[d.key].color)
    .append("title")
    .text((d) => FUELS[d.key].label);

  // Direct labels on the fattest stretch of each band (no legend hunting)
  for (const layer of layers) {
    let best = -1, bestI = 0;
    layer.forEach((pt, i) => {
      const h = pt[1] - pt[0];
      if (h > best) { best = h; bestI = i; }
    });
    if (best > 0.055) {
      const pt = layer[bestI];
      svg.append("text")
        .attr("class", "band-label")
        .attr("x", xScale(pt.data.x))
        .attr("y", yScale((pt[0] + pt[1]) / 2))
        // anchor by position so a band label never spills past the plot edge (e.g. "Batteries")
        .attr("text-anchor",
          xScale(pt.data.x) > W - m.right - 38 ? "end"
          : xScale(pt.data.x) < m.left + 38 ? "start" : "middle")
        .attr("dy", "0.35em")
        .attr("fill", pickText(FUELS[layer.key].color))
        .text(FUELS[layer.key].label);
    }
  }

  const xAxis = d3.axisBottom(xScale)
    .ticks(Math.min(8, xs.length))
    .tickFormat(xTickFormat || d3.format("d"))
    .tickSizeOuter(0);
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${H - m.bottom})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(yScale).tickValues([0, 0.25, 0.5, 0.75, 1])
    .tickFormat(d3.format(".0%")).tickSizeOuter(0);
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${m.left},0)`)
    .call(yAxis);

  if (xLabel) {
    svg.append("text").attr("class", "axis-label")
      .attr("x", W / 2).attr("y", H - 2).attr("text-anchor", "middle")
      .text(xLabel);
  }

  return { svg, x: xScale, y: yScale,
           plot: { left: m.left, right: W - m.right,
                   top: m.top, bottom: H - m.bottom } };
}

function pickText(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? "#15201A" : "#EAF1EC";
}
