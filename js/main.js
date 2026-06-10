/* Boot: load data, wire the map grid + zip forms + region panel. */
import { USMap } from "./usmap.js";
import { initZipForm } from "./lookup.js";
import { initInfoPopups } from "./infopopup.js";
import { renderRegion } from "./region.js";
import { cleanShare } from "./meta.js";

const $ = (id) => document.getElementById(id);

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

async function boot() {
  const [topo, states, subregions, typicalday, stories, plantsFile] =
    await Promise.all([
      loadJSON("data/us-states.json"),
      loadJSON("data/states.json"),
      loadJSON("data/subregions.json"),
      loadJSON("data/typicalday.json"),
      loadJSON("data/stories.json"),
      loadJSON("data/plants.json"),
    ]);
  const data = { topo, states, subregions, typicalday, stories,
                 plants: plantsFile.plants };

  // Fill hero stat sentences from live data (no hardcoded numbers drifting)
  const us = states.US;
  $("stat-clean").textContent = `${cleanShare(us.mix)}%`;
  $("stat-coal-then").textContent = `${Math.round(us.trend.series.coal[0])}%`;
  $("stat-coal-now").textContent = `${Math.round(us.trend.series.coal.at(-1))}%`;

  let selection = null;

  const onStateClick = (ab) => select({ state: ab });
  const maps = [
    ["map-dominant", "dominant"], ["map-clean", "clean"],
    ["map-coal", "coal"], ["map-co2", "co2"],
  ].map(([id, metric]) => new USMap($(id), topo, states, { metric, onStateClick }));

  const onZip = (zip, res) =>
    select({ zip, sub: res.sub, utility: res.utility, state: res.state });
  initZipForm($("zip-form"), $("zip-input"), $("zip-error"), onZip);
  initZipForm($("zip-form-mini"), $("zip-input-mini"), $("zip-mini-error"), onZip);

  // slide the topbar in once the hero (with the big ZIP form) scrolls away
  new IntersectionObserver(
    ([e]) => $("topbar").classList.toggle("visible", !e.isIntersecting),
    { threshold: 0 }
  ).observe(document.querySelector(".hero"));

  initInfoPopups();

  function select(sel, scroll = true) {
    selection = sel;
    maps.forEach((m) => m.setSelected(sel.state));
    renderRegion(sel, data);
    history.replaceState(null, "", sel.zip ? `#${sel.zip}` : `#${sel.state}`);
    if (scroll) {
      $("region-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Deep links: #94110 or #CA
  const h = location.hash.replace("#", "").toUpperCase();
  if (/^\d{5}$/.test(h)) {
    const { lookupZip } = await import("./lookup.js");
    const res = await lookupZip(h);
    if (res) select({ zip: h, sub: res.sub, utility: res.utility, state: res.state }, false);
  } else if (states[h]) {
    select({ state: h }, false);
  }

  // Back/forward + pasted-hash navigation without a reload
  window.addEventListener("hashchange", async () => {
    const hh = location.hash.replace("#", "").toUpperCase();
    if (/^\d{5}$/.test(hh)) {
      const { lookupZip } = await import("./lookup.js");
      const res = await lookupZip(hh);
      if (res) select({ zip: hh, sub: res.sub, utility: res.utility, state: res.state });
    } else if (states[hh]) {
      select({ state: hh });
    }
  });

  // Showcase chips jump straight to a state
  document.querySelectorAll("[data-state-link]").forEach((el) => {
    el.addEventListener("click", () => select({ state: el.dataset.stateLink }));
  });

  // Re-render charts on resize (debounced) so SVGs stay crisp
  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => { if (selection) renderRegion(selection, data); }, 250);
  });

  document.body.classList.add("loaded");
}

boot().catch((err) => {
  console.error(err);
  const el = document.createElement("p");
  el.className = "boot-error";
  el.textContent = "Something went wrong loading the data. Try refreshing?";
  document.body.prepend(el);
});
