/* Renders the "your grid" panel after a ZIP or state is chosen.
   Composes the chart modules; owns no global state beyond the DOM it fills. */
import { FUELS, SUBREGION_NAMES, co2Color } from "./meta.js";
import { co2Sentence, fmtMW, homesServed, mixSentence, trendSentence } from "./format.js";
import { renderWaffle } from "./charts/waffle.js";
import { renderStackedArea } from "./charts/area.js";
import { renderDotStrip } from "./charts/dotstrip.js";
import { renderLines } from "./charts/line.js";
import { renderPlantsMap } from "./charts/plantsmap.js";
import { renderDayChart } from "./dayscrolly.js";

const $ = (id) => document.getElementById(id);

const TREND_ORDER = ["coal", "oil", "gas", "other", "biomass", "geothermal",
  "nuclear", "hydro", "wind", "solar"];

export function renderRegion(sel, data) {
  const { states, subregions, typicalday, plants, topo, stories } = data;
  const state = states[sel.state];
  if (!state) return;
  const sub = sel.sub ? subregions[sel.sub] : null;

  $("region-panel").hidden = false;

  // ---------- header ----------
  const place = sub ? SUBREGION_NAMES[sel.sub] || sub.fullName : state.name;
  $("region-kicker").textContent = sel.zip
    ? `ZIP ${sel.zip} · ${state.name}`
    : state.name;
  $("region-title").textContent = sel.zip
    ? `Your power comes from ${place}`
    : `How ${state.name} makes electricity`;
  $("region-sub").innerHTML = sub
    ? `Your electricity is a blend from a grid region the EPA calls <strong>${sel.sub}</strong> ` +
      `(${sub.fullName}) <button class="info-btn" data-info="region" aria-label="What is a grid region?">i</button>` +
      (sel.utility ? ` &nbsp;·&nbsp; Your utility: <strong>${sel.utility}</strong>` : "")
    : `Statewide numbers. Type a ZIP above for your exact grid region.`;

  // ---------- mix waffle ----------
  const mix = sub ? sub.mix : state.mix;
  const mixPlace = sub ? place : state.name;
  renderWaffle($("mix-waffle"), mix);
  $("mix-sentence").textContent = mixSentence(mix, mixPlace);
  $("mix-year").textContent = sub ? `${sub.dataYear} data` : `${state.mixYear} data`;

  // ---------- CO2 ----------
  const co2 = sub ? sub.co2_g_kwh : state.co2_g_kwh;
  const big = $("co2-number");
  big.textContent = Math.round(co2);
  big.style.color = co2Color(co2);
  $("co2-sentence").textContent =
    `Every kilowatt-hour you use here releases about ${Math.round(co2)} grams of CO₂ — ` +
    co2Sentence(co2) + ".";
  const items = sub
    ? Object.entries(subregions).map(([code, s]) => ({
        id: code, label: SUBREGION_NAMES[code] || code, value: s.co2_g_kwh }))
    : Object.entries(states).filter(([ab]) => ab !== "US").map(([ab, s]) => ({
        id: ab, label: s.name, value: s.co2_g_kwh }));
  renderDotStrip($("co2-strip"), {
    items, highlight: sub ? sel.sub : sel.state, usValue: states.US.co2_g_kwh,
  });
  $("co2-strip-caption").textContent = sub
    ? "Each dot is one of America's 27 grid regions."
    : "Each dot is a state.";

  // ---------- typical day (sticky scrolly showcase) ----------
  const opCode = sub ? typicalday.sub2op[sel.sub] : null;
  const dayWrap = $("day-scrolly");
  if (opCode && typicalday.operators[opCode]) {
    dayWrap.hidden = false;
    renderDayChart(typicalday.operators[opCode]);
  } else {
    dayWrap.hidden = true; // no hourly data (AK/HI/PR) or state-only view
  }

  // ---------- trend ----------
  renderStackedArea($("trend-chart"), {
    xs: state.trend.years, series: state.trend.series, order: TREND_ORDER,
    maxH: 400,
  });
  $("trend-title").textContent = `${state.name}, ${state.trend.years[0]} → ${state.trend.years.at(-1)}`;
  $("trend-sentence").textContent = trendSentence(state.facts, state.name);

  // ---------- price ----------
  const us = states.US;
  const years = us.price.years;
  const stVals = years.map((y) => {
    const i = state.price.years.indexOf(y);
    return i >= 0 ? state.price.res[i] : null;
  });
  renderLines($("price-chart"), {
    xs: years, yUnit: "¢",
    lines: [
      { label: "US", values: us.price.res, color: "var(--price-us)", dash: true },
      { label: sel.state, values: stVals, color: "var(--price-state)", bold: true },
    ],
  });
  const latest = state.price.res.at(-1);
  const usLatest = us.price.res.at(-1);
  $("price-sentence").textContent =
    `Home electricity in ${state.name} costs about ${latest.toFixed(1)}¢ per kilowatt-hour — ` +
    (latest > usLatest * 1.07 ? `above the US average of ${usLatest.toFixed(1)}¢.`
      : latest < usLatest * 0.93 ? `below the US average of ${usLatest.toFixed(1)}¢.`
      : `right around the US average of ${usLatest.toFixed(1)}¢.`);

  // ---------- plants ----------
  renderPlantsMap($("plants-map"), topo, plants, sel.state);
  const list = $("plants-list");
  list.innerHTML = state.topPlants.map(([name, fuel, mw]) => `
    <li>
      <span class="plant-dot" style="background:${FUELS[fuel].color}"></span>
      <span class="plant-name">${name}</span>
      <span class="plant-meta">${FUELS[fuel].emoji} ${FUELS[fuel].label} · ${fmtMW(mw)} · ~${homesServed(mw)}</span>
    </li>`).join("");
  $("plants-title").textContent = `The biggest power plants in ${state.name}`;

  // ---------- story ----------
  const storyCard = $("story-card");
  const story = stories[sel.state];
  if (story) {
    storyCard.hidden = false;
    $("story-title").textContent = `How ${state.name}'s grid got this way`;
    $("story-summary").textContent = story.summary;
    $("story-timeline").innerHTML = story.events.map((e) => `
      <li class="tl-event tl-${e.type}">
        <span class="tl-year">${e.year}</span>
        <div class="tl-body">
          <h4>${e.title} <a class="tl-src" href="${e.source}" target="_blank" rel="noopener" title="source">↗</a></h4>
          <p>${e.text}</p>
        </div>
      </li>`).join("");
    const sp = story.signature_plant;
    $("story-plant").innerHTML =
      `<span class="sig-kicker">Signature plant</span> <strong>${sp.name}</strong> — ` +
      `${sp.fuel}, ${fmtMW(sp.capacity_mw)}. ${sp.fact}`;
  } else {
    storyCard.hidden = true;
  }
}
