/* Simple multi-line chart — used for electricity price history. */
const d3 = window.d3;

export function renderLines(el, { xs, lines, yUnit }) {
  el.innerHTML = "";
  const W = el.clientWidth || 600;
  const H = Math.min(300, Math.max(220, W * 0.4));
  const m = { top: 14, right: 86, bottom: 28, left: 40 };

  const svg = d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%");

  const allVals = lines.flatMap((l) => l.values).filter((v) => v != null);
  const x = d3.scaleLinear().domain(d3.extent(xs)).range([m.left, W - m.right]);
  const y = d3.scaleLinear()
    .domain([0, Math.max(...allVals) * 1.12]).nice()
    .range([H - m.bottom, m.top]);

  const line = d3.line()
    .defined((d) => d != null)
    .x((d, i) => x(xs[i]))
    .y((d) => y(d))
    .curve(d3.curveMonotoneX);

  for (const l of lines) {
    svg.append("path")
      .attr("d", line(l.values))
      .attr("fill", "none")
      .attr("stroke-width", l.bold ? 3 : 1.8)
      .attr("stroke-dasharray", l.dash ? "4 4" : null)
      .style("stroke", l.color);
    const lastIdx = l.values.length - 1;
    svg.append("text").attr("class", "line-label")
      .attr("x", x(xs[lastIdx]) + 6)
      .attr("y", y(l.values[lastIdx]))
      .attr("dy", "0.35em")
      .text(l.label)
      .style("fill", l.color);
  }

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")).tickSizeOuter(0));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v}${yUnit || ""}`).tickSizeOuter(0));
}
