/* ZIP lookup: lazy-loads zips.json on first focus, resolves a ZIP to
   { sub, utility, state } or null. */
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
  const [subIdx, utilIdx, state] = hit;
  return { sub: d.subs[subIdx], utility: d.utils[utilIdx], state };
}

export function initZipForm(formEl, inputEl, errEl, onResolve) {
  inputEl.addEventListener("focus", preloadZips, { once: true });
  formEl.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const zip = inputEl.value.trim().padStart(5, "0");
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
