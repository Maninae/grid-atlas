/* "A day on your grid" showcase: sticky stacked-area chart whose hour band
   highlights follow the reader's scroll through three story steps. */
import { renderStackedArea } from "./charts/area.js";

const DAY_ORDER = ["nuclear", "geothermal", "hydro", "wind", "solar",
  "battery", "gas", "coal", "oil", "other"];

let ctx = null;          // {svg, x, plot} from the last render
let dims = null;         // the two dimming rects
let lastBand = null;     // [h0, h1] of the active step

export function initDayScrolly() {
  const steps = Array.from(document.querySelectorAll(".dstep"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          steps.forEach((s) => s.classList.toggle("active", s === e.target));
          setBand(+e.target.dataset.h0, +e.target.dataset.h1);
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  steps.forEach((s) => io.observe(s));
}

export function renderDayChart(op) {
  document.getElementById("day-operator").textContent = op.name;
  const series = {};
  op.fuels.forEach((f, fi) => {
    const vals = op.hours.map((row) => row[fi]);
    if (vals.some((v) => v > 0.4)) series[f] = vals;
  });
  ctx = renderStackedArea(document.getElementById("day-chart"), {
    xs: [...Array(24).keys()],
    series,
    order: DAY_ORDER,
    maxH: 470,
    xTickFormat: (h) =>
      h === 0 ? "midnight" : h === 12 ? "noon"
        : h % 6 === 0 ? (h < 12 ? `${h}am` : `${h - 12}pm`) : "",
  });
  dims = null;
  if (lastBand) setBand(lastBand[0], lastBand[1], true);
}

function setBand(h0, h1, instant = false) {
  lastBand = [h0, h1];
  if (!ctx) return;
  const { svg, x, plot } = ctx;
  if (!dims) {
    dims = [svg.append("rect"), svg.append("rect")].map((r) =>
      r.attr("class", "dim")
        .attr("y", plot.top)
        .attr("height", plot.bottom - plot.top));
    instant = true;
  }
  const apply = (sel) => (instant ? sel : sel.transition().duration(420));
  apply(dims[0])
    .attr("x", plot.left)
    .attr("width", Math.max(x(h0) - plot.left, 0));
  apply(dims[1])
    .attr("x", x(h1))
    .attr("width", Math.max(plot.right - x(h1), 0));
}
