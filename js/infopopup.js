/* The (i) deep-dive popovers: first-principles explanation + external link.
   Markup: <button class="info-btn" data-info="kwh">i</button> */

const INFO = {
  kwh: {
    title: "What's a kilowatt-hour?",
    body: "A kilowatt-hour (kWh) is the basic unit on your power bill. It's enough electricity to run a microwave for about an hour, or a modern fridge for most of a day. A typical US home uses about 30 kWh per day.",
    link: ["https://en.wikipedia.org/wiki/Kilowatt-hour", "Wikipedia: kilowatt-hour"],
  },
  co2kwh: {
    title: "CO₂ per kilowatt-hour",
    body: "Making electricity from coal or gas releases carbon dioxide, the main gas warming the planet. Dividing a grid's total CO₂ by the electricity it makes gives grams of CO₂ per kWh — a fair way to compare grids of any size. Solar, wind, hydro, and nuclear release almost none while running.",
    link: ["https://www.epa.gov/egrid", "EPA eGRID (the data source)"],
  },
  region: {
    title: "What's a grid region?",
    body: "Electricity doesn't stop at city or state lines — it flows across big connected territories. The EPA divides the country into 27 grid regions based on which power plants actually feed which areas. Your ZIP code sits inside one of them, so your electricity is a blend of everything generating there.",
    link: ["https://www.epa.gov/egrid/egrid-mapping-files", "EPA: eGRID subregion maps"],
  },
  operator: {
    title: "Who runs the grid?",
    body: "Every second, supply must match demand, so each area has a grid operator — an organization balancing the flow like air-traffic control for electrons. Some are huge (PJM serves 65 million people); Texas runs its own (ERCOT), mostly disconnected from everyone else.",
    link: ["https://www.eia.gov/electricity/gridmonitor/about", "EIA: how the grid is monitored"],
  },
  rooftop: {
    title: "Where's rooftop solar?",
    body: "These numbers count power plants — including big solar farms — but not panels on people's roofs, which are measured separately and less precisely. In sunny states, rooftop panels add several extra percent of solar on top of what you see here.",
    link: ["https://www.eia.gov/todayinenergy/detail.php?id=60341", "EIA: small-scale solar estimates"],
  },
  clean: {
    title: "What counts as \"clean\"?",
    body: "Here, \"clean\" means sources that release little or no CO₂ while making power: solar, wind, hydro, nuclear, and geothermal. People debate the edges (nuclear waste, dams and rivers), but for carbon in the air, these five are the low-CO₂ club.",
    link: ["https://ourworldindata.org/safest-sources-of-energy", "Our World in Data: comparing energy sources"],
  },
  typicalday: {
    title: "How we made this chart",
    body: "We averaged every hour of 2025 from the grid operator's logs (about 8,760 hours). So this is a \"typical\" day — solar's midday bulge and the evening gas ramp show clearly, though any single real day will look messier. Data: US Energy Information Administration, Form 930.",
    link: ["https://www.eia.gov/electricity/gridmonitor/", "EIA Hourly Grid Monitor"],
  },
  egridyear: {
    title: "Why 2023 for CO₂?",
    body: "The EPA's eGRID is the official source for emissions by grid region, and its newest release covers 2023 (published mid-2025 — counting every plant's smokestack takes a while). Fuel-mix numbers on this site are fresher (2025) because the EIA publishes generation data monthly.",
    link: ["https://www.epa.gov/egrid", "EPA eGRID"],
  },
  price: {
    title: "What's in the price?",
    body: "This is the average residential price per kWh — everything on the bill (making power, the wires, the utility's costs) divided by the electricity sold. Your own rate depends on your utility and plan.",
    link: ["https://www.eia.gov/electricity/data.php", "EIA electricity data"],
  },
  homes: {
    title: "\"Powers X homes\" — how we count",
    body: "A plant's megawatts (MW) tell you its maximum output, not what it produces around the clock — the sun sets, plants rest for repairs. We assume an average plant delivers about 45% of its maximum over a year, and a typical US home uses about 10,700 kWh a year. It's a feel-for-the-size number, not an exact one.",
    link: ["https://www.eia.gov/tools/faqs/faq.php?id=97&t=3", "EIA: home electricity use"],
  },
};

let openPop = null;

export function initInfoPopups() {
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".info-btn");
    if (!btn) {
      if (openPop && !ev.target.closest(".info-pop")) closePop();
      return;
    }
    ev.preventDefault();
    const key = btn.dataset.info;
    if (openPop && openPop.dataset.key === key) { closePop(); return; }
    closePop();
    const info = INFO[key];
    if (!info) return;
    const pop = document.createElement("div");
    pop.className = "info-pop";
    pop.dataset.key = key;
    pop.innerHTML =
      `<h4>${info.title}</h4><p>${info.body}</p>` +
      `<a href="${info.link[0]}" target="_blank" rel="noopener">${info.link[1]} ↗</a>`;
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    const pw = Math.min(340, window.innerWidth - 24);
    pop.style.width = `${pw}px`;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${r.bottom + 10 + window.scrollY}px`;
    openPop = pop;
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closePop();
  });
}

function closePop() {
  if (openPop) { openPop.remove(); openPop = null; }
}
