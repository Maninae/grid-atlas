/* Scroll-driven steps: as each .step crosses mid-viewport, fire its action. */
export function initScrolly(stepsSelector, onStep) {
  const steps = Array.from(document.querySelectorAll(stepsSelector));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          steps.forEach((s) => s.classList.toggle("active", s === e.target));
          onStep(e.target.dataset.step, e.target);
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  steps.forEach((s) => io.observe(s));
}
