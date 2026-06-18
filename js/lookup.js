/* ZIP lookup: lazy-loads zips.json on first focus, resolves a ZIP to
   { sub, utility, state, rate, options? } or null. `rate` is the 2024 average
   residential price in cents/kWh (NREL/OpenEI), null when no utility-level rate
   was available. Texas entries carry `options` — every bundled-rate utility
   known for the ZIP (predominant first) so the UI can offer a picker, since
   geographic predominance often misassigns deregulated suburbs to coops. */
let zipsPromise = null;

export function preloadZips() {
  if (!zipsPromise) {
    zipsPromise = fetch("data/zips.json").then((r) => r.json());
  }
  return zipsPromise;
}

export async function lookupZip(zip) {
  const d = await preloadZips();
  const hit = d.zips[zip];
  if (!hit) return null;
  const [subIdx, utilIdx, state, rate, opts] = hit;
  return {
    sub: d.subs[subIdx], utility: d.utils[utilIdx], state, rate,
    options: opts ? opts.map(([u, r]) => ({ utility: d.utils[u], rate: r })) : null,
  };
}

export function initZipForm(formEl, inputEl, errEl, onResolve) {
  inputEl.addEventListener("focus", preloadZips, { once: true });
  formEl.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    let zip = inputEl.value.trim();
    if (/^\d{4}$/.test(zip)) zip = "0" + zip; // tolerate a dropped leading zero (2139 → 02139)
    if (!/^\d{5}$/.test(zip)) {
      errEl.textContent = "Please type a 5-digit ZIP code.";
      return;
    }
    const res = await lookupZip(zip);
    if (!res) {
      errEl.textContent = "Hmm, we don't know that ZIP. Try another?";
      return;
    }
    errEl.textContent = "";
    onResolve(zip, res);
  });
}
