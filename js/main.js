/* Boot: load data, wire the map grid + zip forms + region panel. */
import { USMap } from "./usmap.js";
import { initZipForm } from "./lookup.js";
import { initInfoPopups } from "./infopopup.js";
import { initDayScrolly } from "./dayscrolly.js";
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

  // ≥1200px the maps + at-a-glance render side by side, so a map click needs no
  // scroll — the detail is already beside the maps. Below that, keep the
  // partial-scroll + "see below" cue (desktop) / full scroll (mobile).
  const SIDE_BY_SIDE = window.matchMedia("(min-width: 1200px)");

  // Map clicks stay put (no jarring scroll); instead the page pulses, the
  // state flashes in all four maps, and a "see it below" cue offers the jump.
  const onStateClick = (ab) => select({ state: ab }, { scroll: false, flash: true });
  const maps = [
    ["map-dominant", "dominant"], ["map-clean", "clean"],
    ["map-coal", "coal"], ["map-co2", "co2"],
  ].map(([id, metric]) => new USMap($(id), topo, states, { metric, onStateClick }));

  const onZip = (zip, res) => select({ zip, ...res });
  initZipForm($("zip-form"), $("zip-input"), $("zip-error"), onZip);
  initZipForm($("zip-form-mini"), $("zip-input-mini"), $("zip-mini-error"), onZip);

  // slide the topbar in once the hero (with the big ZIP form) scrolls away
  new IntersectionObserver(
    ([e]) => $("topbar").classList.toggle("visible", !e.isIntersecting),
    { threshold: 0 }
  ).observe(document.querySelector(".hero"));

  initInfoPopups();
  initDayScrolly();

  // Theme toggle: dark <-> light, persisted in localStorage. Maps re-rasterize
  // their computed ramps via refresh(); CSS vars handle the rest.
  const toggle = $("theme-toggle");
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("ga-theme", t);
    toggle.textContent = t === "dark" ? "☀️" : "🌙";
    document.querySelector('meta[name="theme-color"]').content =
      t === "dark" ? "#11161B" : "#F1F3F2";
    maps.forEach((m) => m.refresh());
  };
  toggle.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙";
  toggle.addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

  // Scroll cue: a dismissible pill instead of auto-scrolling on map clicks.
  const cue = $("scroll-cue");
  let cueTimer;
  const hideCue = () => { clearTimeout(cueTimer); cue.classList.remove("visible"); };
  function showCue(stateName, scrollDelta = 0) {
    // Skip if the region panel will already be (partly) on screen once the
    // in-flight partial scroll (scrollDelta px) settles
    if ($("region-panel").getBoundingClientRect().top - scrollDelta < window.innerHeight - 160) return;
    cue.textContent = `See ${stateName} below ↓`;
    cue.classList.add("visible");
    clearTimeout(cueTimer);
    cueTimer = setTimeout(hideCue, 4500);
  }
  cue.addEventListener("click", () => {
    $("region-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    hideCue();
  });
  // The moment the user takes over scrolling, the cue has done its job.
  // (User-input events only — our own smooth scrollIntoView must not dismiss it.)
  window.addEventListener("wheel", hideCue, { passive: true });
  window.addEventListener("touchmove", hideCue, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (["ArrowDown", "PageDown", " ", "End"].includes(e.key)) hideCue();
  });

  // "Working" pulse on the page background (dark theme only — see base.css)
  document.body.addEventListener("animationend", (e) => {
    if (e.animationName === "bg-pulse") document.body.classList.remove("bg-pulse");
  });
  function pulseBackground() {
    document.body.classList.remove("bg-pulse");
    void document.body.offsetWidth; // restart the animation if mid-flight
    document.body.classList.add("bg-pulse");
  }

  function select(sel, { scroll = true, flash = false } = {}) {
    selection = sel;
    maps.forEach((m) => m.setSelected(sel.state, flash));
    renderRegion(sel, data);
    if (sel.state !== "US") {
      history.replaceState(null, "", sel.zip ? `#${sel.zip}` : `#${sel.state}`);
    }
    if (scroll) {
      $("region-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (flash && sel.state !== "US") {
      pulseBackground();
      if (SIDE_BY_SIDE.matches) {
        // Wide: the detail is already beside the maps — nothing to scroll to.
      } else if (window.matchMedia("(max-width: 760px)").matches) {
        // Mobile: one map per screen anyway, so just go to the panel
        $("region-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Desktop: partial scroll — pin the top of the 4 maps to the top of
        // the window so they stay in view while the region panel peeks below
        const grid = document.querySelector(".map-grid");
        const delta = grid.getBoundingClientRect().top - 52; // 52 = scroll-margin-top
        grid.scrollIntoView({ behavior: "smooth", block: "start" });
        showCue(states[sel.state].name, delta);
      }
    }
  }

  // Deep links: #94110 or #CA — otherwise default to the national view
  const h = location.hash.replace("#", "").toUpperCase();
  if (/^\d{5}$/.test(h)) {
    const { lookupZip } = await import("./lookup.js");
    const res = await lookupZip(h);
    if (res) select({ zip: h, ...res }, { scroll: false });
    else select({ state: "US" }, { scroll: false });
  } else if (states[h]) {
    select({ state: h }, { scroll: false });
  } else {
    select({ state: "US" }, { scroll: false });
  }

  // Back/forward + pasted-hash navigation without a reload
  window.addEventListener("hashchange", async () => {
    const hh = location.hash.replace("#", "").toUpperCase();
    if (/^\d{5}$/.test(hh)) {
      const { lookupZip } = await import("./lookup.js");
      const res = await lookupZip(hh);
      if (res) select({ zip: hh, ...res });
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
