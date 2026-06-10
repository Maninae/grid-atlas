/* Dot strip: every US grid region plotted by CO2 g/kWh, yours highlighted.
   Relative position beats raw numbers for a general audience. */
import { co2Color } from "../meta.js";

const d3 = window.d3;

export function renderDotStrip(el, { items, highlight, usValue }) {
  el.innerHTML = "";
  const W = el.clientWidth || 560;
  const H = 92;
  const m = { left: 14, right: 14 };

  const svg = d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%");

  const max = Math.max(...items.map((d) => d.value)) * 1.05;
  const x = d3.scaleLinear().domain([0, max]).range([m.left, W - m.right]);

  svg.append("line")
    .attr("x1", m.left).attr("x2", W - m.right).attr("y1", 46).attr("y2", 46)
    .attr("stroke", "#3A4A40");

  if (usValue != null) {
    svg.append("line")
      .attr("x1", x(usValue)).attr("x2", x(usValue))
      .attr("y1", 28).attr("y2", 64)
      .attr("stroke", "#7E8C82").attr("stroke-dasharray", "3 3");
    svg.append("text").attr("class", "strip-note")
      .attr("x", x(usValue)).attr("y", 78).attr("text-anchor", "middle")
      .text("US average");
  }

  svg.selectAll("circle.dot")
    .data(items.filter((d) => d.id !== highlight))
    .join("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d.value)).attr("cy", 46).attr("r", 5.5)
    .attr("fill", (d) => co2Color(d.value))
    .attr("opacity", 0.55)
    .append("title").text((d) => `${d.label}: ${Math.round(d.value)} g CO₂ per kWh`);

  const me = items.find((d) => d.id === highlight);
  if (me) {
    svg.append("circle")
      .attr("cx", x(me.value)).attr("cy", 46).attr("r", 9)
      .attr("fill", co2Color(me.value))
      .attr("stroke", "#EAF1EC").attr("stroke-width", 2);
    svg.append("text").attr("class", "strip-you")
      .attr("x", x(me.value)).attr("y", 18).attr("text-anchor", "middle")
      .text("you");
    svg.append("line")
      .attr("x1", x(me.value)).attr("x2", x(me.value))
      .attr("y1", 22).attr("y2", 34)
      .attr("stroke", "#EAF1EC").attr("stroke-width", 1.5);
  }

  svg.append("text").attr("class", "strip-note")
    .attr("x", m.left).attr("y", 78).text("← cleaner");
  svg.append("text").attr("class", "strip-note")
    .attr("x", W - m.right).attr("y", 78).attr("text-anchor", "end")
    .text("dirtier →");
}
