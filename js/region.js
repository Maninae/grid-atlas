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

/* The build bakes facts per state; the US entry derives them client-side. */
function deriveFacts(trend) {
  const first = {}, last = {};
  for (const [cat, vals] of Object.entries(trend.series)) {
    first[cat] = vals[0];
    last[cat] = vals[vals.length - 1];
  }
  const argmax = (o) => Object.keys(o).reduce((a, b) => (o[a] >= o[b] ? a : b));
  const clean = (o) => Object.entries(o)
    .filter(([f]) => FUELS[f] && FUELS[f].clean)
    .reduce((s, [, v]) => s + v, 0);
  return {
    leaderThen: { year: trend.years[0], fuel: argmax(first), share: first[argmax(first)] },
    leaderNow: { year: trend.years.at(-1), fuel: argmax(last), share: last[argmax(last)] },
    cleanThen: clean(first),
    cleanNow: clean(last),
  };
}

export function renderRegion(sel, data) {
  const { states, subregions, typicalday, plants, topo, stories } = data;
  const state = states[sel.state];
  if (!state) return;
  const sub = sel.sub ? subregions[sel.sub] : null;
  const isUS = sel.state === "US";
  const stateName = isUS ? "the United States" : state.name;

  $("region-panel").hidden = false;
  $("region-deep").hidden = false; // the full-width deep-dive section below the glance

  // ---------- header ----------
  const place = sub ? SUBREGION_NAMES[sel.sub] || sub.fullName : stateName;
  $("region-kicker").textContent = sel.zip
    ? `ZIP ${sel.zip} · ${state.name}`
    : isUS ? "United States" : state.name;
  $("region-title").textContent = sel.zip
    ? `Your power comes from ${place}`
    : isUS ? "How America makes electricity"
    : `How ${state.name} makes electricity`;
  // Texas ZIPs get a utility picker: the crosswalk's "predominant utility" is
  // a land-area pick that often names a rural coop for deregulated suburbs,
  // so let people correct it — or say they shop for their own plan.
  const txZip = !!(sel.zip && sel.state === "TX" && sel.options);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  $("region-sub").innerHTML = sub
    ? `Your electricity is a blend from a grid region the EPA calls <strong>${sel.sub}</strong> ` +
      `(${sub.fullName}) <button class="info-btn" data-info="region" aria-label="What is a grid region?">i</button>` +
      (txZip
        ? ` &nbsp;·&nbsp; <label for="util-select">Utility:</label> ` +
          `<select id="util-select" aria-label="Pick who you buy electricity from">` +
          sel.options.map((o, i) =>
            `<option value="${i}"${!sel.choice && sel.utility === o.utility ? " selected" : ""}>${esc(o.utility)}</option>`).join("") +
          `<option value="choice"${sel.choice ? " selected" : ""}>I pick my own plan (retail choice)</option>` +
          `</select> <button class="info-btn" data-info="txchoice" aria-label="Why a choice here?">i</button>`
        : sel.utility ? ` &nbsp;·&nbsp; Your utility: <strong>${esc(sel.utility)}</strong>` : "")
    : isUS
    ? `The whole country at a glance. Type your ZIP code above — or click a state on the maps — to see <em>your</em> grid.`
    : `Statewide numbers. Type a ZIP above for your exact grid region.`;
  const utilSelect = $("util-select");
  if (utilSelect) {
    utilSelect.addEventListener("change", () => {
      if (utilSelect.value === "choice") {
        sel.choice = true; sel.utility = null; sel.rate = null;
      } else {
        const o = sel.options[+utilSelect.value];
        sel.choice = false; sel.utility = o.utility; sel.rate = o.rate;
      }
      renderRegion(sel, data);
    });
  }

  // ---------- mix waffle ----------
  const mix = sub ? sub.mix : state.mix;
  const mixPlace = sub ? place : stateName;
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
  // ZIP -> subregion -> operator is exact; a plain state click falls back to
  // its dominant operator (state2op). US shows the national curve.
  const opCode = sub ? typicalday.sub2op[sel.sub]
    : isUS ? "US"
    : typicalday.state2op[sel.state] || null;
  const dayWrap = $("day-scrolly");
  if (opCode && typicalday.operators[opCode]) {
    dayWrap.hidden = false;
    renderDayChart(typicalday.operators[opCode]);
  } else {
    dayWrap.hidden = true; // no hourly data (AK/HI/PR island grids)
    $("day-operator").textContent = ""; // don't leave a stale operator name for screen readers
  }
  // Show the "island grids aren't tracked" note whenever we expected a curve
  // for a real place but have none (AK/HI state or ZIP).
  $("day-missing").hidden = !(!opCode && !isUS);

  // ---------- trend ----------
  renderStackedArea($("trend-chart"), {
    xs: state.trend.years, series: state.trend.series, order: TREND_ORDER,
    maxH: 400,
  });
  $("trend-title").textContent = `${stateName[0].toUpperCase() + stateName.slice(1)}, ${state.trend.years[0]} → ${state.trend.years.at(-1)}`;
  const facts = (state.facts && state.facts.leaderThen)
    ? state.facts : deriveFacts(state.trend);
  $("trend-sentence").textContent = trendSentence(facts, stateName);

  // ---------- price ----------
  const us = states.US;
  const years = us.price.years;
  const latest = state.price.res.at(-1);
  const usLatest = us.price.res.at(-1);
  if (isUS) {
    renderLines($("price-chart"), {
      xs: years, yUnit: "¢",
      lines: [{ label: "US", values: us.price.res, color: "var(--price-state)", bold: true }],
    });
    $("price-sentence").textContent =
      `Home electricity in America costs about ${latest.toFixed(1)}¢ per kilowatt-hour on average — ` +
      `up from ${us.price.res[0].toFixed(1)}¢ in ${years[0]}.`;
  } else {
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
    if (sel.zip && typeof sel.rate === "number" && sel.rate > 0) {
      const rateStr = sel.rate.toFixed(1).replace(/\.0$/, "");
      const cmp = sel.rate > latest * 1.07 ? "above"
        : sel.rate < latest * 0.93 ? "below"
        : "right around";
      $("price-sentence").textContent =
        `Homes served by ${sel.utility} pay about ${rateStr}¢ per kilowatt-hour on average — ` +
        `${cmp} the ${state.name} average of ${latest.toFixed(1)}¢. ` +
        `(2024 utility average — your plan may differ.)`;
    } else {
      $("price-sentence").textContent =
        `Home electricity in ${state.name} costs about ${latest.toFixed(1)}¢ per kilowatt-hour — ` +
        (latest > usLatest * 1.07 ? `above the US average of ${usLatest.toFixed(1)}¢.`
          : latest < usLatest * 0.93 ? `below the US average of ${usLatest.toFixed(1)}¢.`
          : `right around the US average of ${usLatest.toFixed(1)}¢.`) +
        (sel.zip && sel.state === "TX" && sel.choice
          ? ` With retail choice, your exact rate depends on the plan you picked.`
          : ``);
    }
  }

  // ---------- plants ----------
  renderPlantsMap($("plants-map"), topo, plants, sel.state);
  const topPlants = isUS
    ? plants.filter((p) => p[2] !== "storage").slice(0, 6)
        .map((p) => [p[0], p[2], p[3]])
    : state.topPlants;
  const list = $("plants-list");
  list.innerHTML = topPlants.map(([name, fuel, mw]) => `
    <li>
      <span class="plant-dot" style="background:${FUELS[fuel].color}"></span>
      <span class="plant-name">${name}</span>
      <span class="plant-meta">${FUELS[fuel].emoji} ${FUELS[fuel].label} · ${fmtMW(mw)} · ~${homesServed(mw)}</span>
    </li>`).join("");
  $("plants-title").textContent = isUS
    ? "The biggest power plants in America"
    : `The biggest power plants in ${state.name}`;

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
