// share.js — adds "Download as image" buttons to cards, map cells, and the
// day-on-grid sticky chart. Uses html2canvas (loaded globally in index.html)
// to rasterize the element, then composites a footer strip with a small
// Grid Atlas credit + data attribution before triggering a PNG download.

const SHARE_SELECTOR = ".card, .map-cell, .day-sticky";
const SCALE = 2;
const FOOTER_H = 72; // CSS px; doubled at SCALE=2

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function slugifyText(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function slugFor(el) {
  const heading = el.querySelector("h3, h4");
  if (heading) {
    // clone minus the (i) info buttons so their "i" doesn't leak into names
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(".info-btn").forEach((b) => b.remove());
    const s = slugifyText(clone.textContent.trim());
    if (s) return s;
  }
  if (el.id) {
    const s = slugifyText(el.id);
    if (s) return s;
  }
  return "chart";
}

function attachButton(el) {
  if (el.querySelector(":scope > .share-btn")) return;
  const btn = document.createElement("button");
  btn.className = "share-btn";
  btn.title = "Download as image";
  btn.setAttribute("aria-label", "Download this as an image");
  btn.textContent = "⤓"; // ⤓
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    exportElement(el, btn);
  });
  el.appendChild(btn);
}

async function exportElement(el, btn) {
  const originalText = btn.textContent;
  try {
    if (typeof html2canvas !== "function") {
      throw new Error("html2canvas not loaded");
    }
    const bg = cssVar("--card");
    const baseCanvas = await html2canvas(el, {
      scale: SCALE,
      backgroundColor: bg,
      logging: false,
      useCORS: true,
      ignoreElements: (n) =>
        n.classList &&
        (n.classList.contains("share-btn") || n.classList.contains("info-btn")),
    });

    const footerPx = FOOTER_H * SCALE;
    const out = document.createElement("canvas");
    out.width = baseCanvas.width;
    out.height = baseCanvas.height + footerPx;
    const ctx = out.getContext("2d");
    // body of the image
    ctx.drawImage(baseCanvas, 0, 0);
    // footer strip
    const paperDeep = cssVar("--paper-deep") || "#171D23";
    const rule = cssVar("--rule") || "#2A343D";
    const inkSoft = cssVar("--ink-soft") || "#9DAAB5";
    ctx.fillStyle = paperDeep;
    ctx.fillRect(0, baseCanvas.height, out.width, footerPx);
    // 1px (scaled) top border
    ctx.fillStyle = rule;
    ctx.fillRect(0, baseCanvas.height, out.width, 1 * SCALE);

    const padding = 28 * SCALE;
    let fontPx = 24 * SCALE;
    ctx.fillStyle = inkSoft;
    ctx.textBaseline = "middle";
    const midY = baseCanvas.height + footerPx / 2;

    const leftText = "⚡ Grid Atlas — maninae.github.io/grid-atlas";
    const rightText = "data: EPA eGRID & EIA";

    // Shrink the font so left + gap + right fit on one line. Narrow cards
    // (~340 CSS px) need ~10–12px text; wide cards stay at the full 24px.
    const setFont = (px) => {
      ctx.font = `500 ${px}px "Spline Sans Mono", ui-monospace, monospace`;
    };
    const gap = 24 * SCALE;
    const available = out.width - padding * 2 - gap;
    setFont(fontPx);
    let lw = ctx.measureText(leftText).width;
    let rw = ctx.measureText(rightText).width;
    const minFont = 8 * SCALE;
    while (lw + rw > available && fontPx > minFont) {
      fontPx -= 1 * SCALE;
      setFont(fontPx);
      lw = ctx.measureText(leftText).width;
      rw = ctx.measureText(rightText).width;
    }

    // If still too tight even at minFont, drop the URL from the left text.
    if (lw + rw > available) {
      const shortLeft = "⚡ Grid Atlas";
      ctx.textAlign = "left";
      ctx.fillText(shortLeft, padding, midY);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(leftText, padding, midY);
    }
    ctx.textAlign = "right";
    ctx.fillText(rightText, out.width - padding, midY);

    const blob = await new Promise((resolve) =>
      out.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) throw new Error("toBlob returned null");

    const slug = slugFor(el);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grid-atlas-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.warn("[share] export failed:", err);
    btn.textContent = "✕"; // ✕
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  }
}

function attachAll() {
  document.querySelectorAll(SHARE_SELECTOR).forEach(attachButton);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachAll);
} else {
  attachAll();
}

// Re-attach after dynamic region rendering. Cheap MutationObserver scoped to
// containers that hold target elements.
const mo = new MutationObserver(() => {
  attachAll();
});
mo.observe(document.body, { childList: true, subtree: true });
