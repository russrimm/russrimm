import type { BuildContext } from "../lib/context.ts";
import { esc, svgDoc, windowChrome, wrap } from "../lib/svg.ts";
import { PALETTES, textWidth, type Theme } from "../lib/tokens.ts";

const W = 1000;
const H = 300;

export function renderBook(ctx: BuildContext, theme: Theme): string {
  const p = PALETTES[theme];
  const { book, meta } = ctx.profile;
  const dark = theme === "dark";
  const file = `~/books/${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;

  // Cover.
  const cx = 44;
  const cy = 62;
  const cw = 160;
  const ch = 214;
  const titleLines = wrap(book.title.toUpperCase(), 11, 4);
  const cover = `
  <g class="a float">
    <rect x="${cx + 8}" y="${cy + 10}" width="${cw}" height="${ch}" rx="6" fill="#000" opacity="${dark ? 0.45 : 0.15}" filter="url(#blur)"/>
    <rect x="${cx + cw - 2}" y="${cy + 4}" width="8" height="${ch - 8}" rx="2" fill="${dark ? "#D8DEE6" : "#E9EDF2"}"/>
    <path d="M${cx + cw} ${cy + 8}h6M${cx + cw} ${cy + 20}h6M${cx + cw} ${cy + ch - 20}h6" stroke="${dark ? "#9AA4B2" : "#C3CAD3"}" stroke-width=".6"/>
    <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="6" fill="url(#cover)"/>
    <rect x="${cx}" y="${cy}" width="12" height="${ch}" rx="3" fill="#000" opacity=".22"/>
    <rect x="${cx + 12}" y="${cy}" width="1.2" height="${ch}" fill="#fff" opacity=".25"/>
    <circle cx="${cx + cw - 30}" cy="${cy + 42}" r="48" fill="url(#orb)"/>
    <path d="M${cx + 26} ${cy + 150} q 30 -40 60 0 t 60 0" stroke="#fff" stroke-opacity=".35" fill="none" stroke-width="1.2"/>
    <path d="M${cx + 26} ${cy + 160} q 30 -34 60 0 t 60 0" stroke="#fff" stroke-opacity=".2" fill="none" stroke-width="1.2"/>
    ${titleLines.map((l, i) => `<text x="${cx + 26}" y="${cy + 46 + i * 21}" font-size="17" font-weight="800" fill="#FFFFFF" letter-spacing=".06em">${esc(l)}</text>`).join("")}
    <text x="${cx + 26}" y="${cy + ch - 20}" font-size="10" fill="#FFFFFF" opacity=".85" letter-spacing=".22em">${esc(meta.name.toUpperCase())}</text>
    <g clip-path="url(#coverclip)"><rect class="sheen" x="${cx - 80}" y="${cy - 20}" width="60" height="${ch + 40}" fill="url(#sheen)"/></g>
  </g>`;

  // Details.
  const dx = 250;
  const pitch = wrap(book.pitch, Math.floor((W - dx - 30) / (12.5 * 0.6)), 2)
    .map((l, i) => `<text x="${dx}" y="${156 + i * 19}" font-size="12.5" fill="${p.muted}">${esc(l)}</text>`)
    .join("");
  const hl = book.highlights
    .slice(0, 4)
    .map((h, i) => {
      const [num, ...rest] = h.split(" ");
      const x = dx + (i % 2) * 360;
      const y = 214 + Math.floor(i / 2) * 22;
      return `<text class="a fade" style="animation-delay:${(0.9 + i * 0.1).toFixed(2)}s" x="${x}" y="${y}" font-size="12" fill="${p.fg}"><tspan fill="${p.accent.purple}" font-weight="700">ch.${esc(num ?? "")}</tspan> ${esc(rest.join(" "))}</text>`;
    })
    .join("");

  const barX = dx + textWidth("progress ", 12);
  const barW = 300;
  const style = `
    .float { opacity: 0; transform: translateY(10px); animation: float .8s cubic-bezier(.2,.7,.2,1) .2s forwards; }
    .fade  { opacity: 0; animation: reveal .45s ease-out forwards; }
    .fill  { transform-box: fill-box; transform-origin: left center; transform: scaleX(0); animation: fill 1.4s cubic-bezier(.2,.7,.2,1) 1.3s forwards; }
    .sheen { opacity: 0; animation: sheen 1.4s ease-in-out 1s 1 forwards; }
    @keyframes float { to { opacity: 1; transform: translateY(0); } }
    @keyframes reveal { to { opacity: 1; } }
    @keyframes fill { to { transform: scaleX(1); } }
    @keyframes sheen { 0% { opacity: .9; transform: translateX(0); } 100% { opacity: 0; transform: translateX(300px); } }
    @media (prefers-reduced-motion: reduce) { .float, .fill { transform: none !important; } .sheen { display: none; } }`;

  const body = `
  <defs>
    <linearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3B1D8F"/>
      <stop offset=".55" stop-color="#1E3A8A"/>
      <stop offset="1" stop-color="#0E7490"/>
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#F0ABFC" stop-opacity=".9"/>
      <stop offset=".45" stop-color="#A78BFA" stop-opacity=".45"/>
      <stop offset="1" stop-color="#A78BFA" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="coverclip"><rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="6"/></clipPath>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  ${windowChrome({
    width: W,
    height: H,
    title: `less ${file}`,
    window: p.window,
    border: p.border,
    muted: p.muted,
    lights: [p.accent.red, p.accent.amber, p.accent.green],
    right: `<text x="${W - 24}" y="26.5" font-size="11.5" fill="${p.dim}" text-anchor="end">(END)</text>`,
  })}
  ${cover}
  <text class="a fade" style="animation-delay:.3s" x="${dx}" y="78" font-size="12.5" fill="${p.muted}"><tspan fill="${p.accent.green}">${esc(meta.prompt)}</tspan> <tspan fill="${p.fg}">cat ${esc(file)} | head</tspan></text>
  <g class="a fade" style="animation-delay:.5s">
    <text x="${dx}" y="112" font-size="24" font-weight="800" fill="${p.fg}">${esc(book.title)}</text>
    <text x="${dx}" y="134" font-size="13.5" fill="${p.accent.purple}">${esc(book.subtitle)} <tspan fill="${p.muted}">— by ${esc(meta.name)}</tspan></text>
  </g>
  <g class="a fade" style="animation-delay:.7s">${pitch}</g>
  ${hl}
  <g class="a fade" style="animation-delay:1.2s">
    <text x="${dx}" y="274" font-size="12" fill="${p.muted}">progress</text>
    <rect x="${barX}" y="264" width="${barW}" height="12" rx="3" fill="${p.border}" opacity=".6"/>
    <rect class="a fill" x="${barX}" y="264" width="${barW}" height="12" rx="3" fill="url(#cover)"/>
    <text x="${barX + barW + 10}" y="274" font-size="12" fill="${p.fg}" font-weight="700">100% <tspan fill="${p.accent.green}" font-weight="400">published</tspan> <tspan fill="${p.muted}" font-weight="400">· ${book.chapters} chapters · ${book.appendices} appendices</tspan></text>
  </g>`;

  return svgDoc({
    width: W,
    height: H,
    label: `${book.title}: ${book.subtitle}, by ${meta.name}. ${book.pitch}`,
    style,
    body,
  });
}
