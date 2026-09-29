import { domainColor, fmt, totals, type BuildContext } from "../lib/context.ts";
import { esc, svgDoc, windowChrome } from "../lib/svg.ts";
import { PALETTES, type Theme } from "../lib/tokens.ts";

const W = 1000;
const H = 340;
const DISCLAIMER = "// personal projects and opinions — not official Microsoft guidance";

export function renderHero(ctx: BuildContext, theme: Theme): string {
  const p = PALETTES[theme];
  const { meta } = ctx.profile;
  const t = totals(ctx);
  const dark = theme === "dark";
  const featured = ctx.profile.agents.length;
  const since = ctx.gh ? new Date(ctx.gh.createdAt).getFullYear() : null;

  const domains = ctx.profile.pstree.map((n) => n.domain);
  const loading = domains
    .map((k, i) => `${i ? `<tspan fill="${p.dim}"> · </tspan>` : ""}<tspan fill="${domainColor(ctx, theme, k)}">${esc(k)}</tspan>`)
    .join("");

  const ok = `<tspan fill="${p.accent.green}">[ ok ]</tspan>`;
  const boot = [
    `<tspan fill="${p.accent.green}">${esc(meta.prompt)}</tspan> <tspan fill="${p.fg}">./boot --console --profile ${esc(meta.owner)}</tspan>`,
    `${ok} mounting ~/agents <tspan fill="${p.dim}">.........</tspan> <tspan fill="${p.fg}">${featured} featured</tspan>`,
    `${ok} syncing github <tspan fill="${p.dim}">............</tspan> <tspan fill="${p.fg}">${fmt(t.repos)} repos · ${fmt(t.stars)} ★</tspan>`,
    `loading: ${loading}`,
  ];
  const bootLines = boot
    .map((line, i) => {
      const d = (0.25 + i * 0.6).toFixed(2);
      return `<text class="a l" style="animation-delay:${d}s,${d}s" x="36" y="${80 + i * 26}" font-size="13.5" fill="${p.muted}">${line}</text>`;
    })
    .join("");

  const fetchRows: [string, string][] = [
    ["OS", `${meta.employer} Cloud`],
    ["Role", meta.title.replace("Cloud Solution Architect", "CSA")],
    ["Focus", meta.focus],
    ["Uptime", `${meta.years_in_it}+ yrs in IT`],
    ["Shell", "agentic · copilot"],
    ["Repos", `${fmt(t.repos)} public${since ? ` · since ${since}` : ""}`],
    ["Stars", `${fmt(t.stars)} ★ · ${fmt(t.forks)} forks`],
    ["Commits", `${fmt(t.commits)} · last 12 mo`],
    ["Locale", `${meta.location} · en-US`],
  ];
  const px = 652;
  const fetchText = fetchRows
    .map(
      ([k, v], i) =>
        `<text class="a nf" style="animation-delay:${(2.3 + i * 0.07).toFixed(2)}s" x="${px + 18}" y="${114 + i * 21}" font-size="12.5"><tspan fill="${p.accent.blue}" font-weight="700">${esc(k)}</tspan><tspan x="${px + 92}" fill="${p.fg}">${esc(v)}</tspan></text>`,
    )
    .join("");
  const swatches = (["red", "amber", "green", "cyan", "blue", "purple", "pink"] as const)
    .map(
      (c, i) =>
        `<rect class="a nf" style="animation-delay:${(3 + i * 0.06).toFixed(2)}s" x="${px + 18 + i * 22}" y="${114 + fetchRows.length * 21 - 4}" width="18" height="10" rx="2" fill="${p.accent[c]}"/>`,
    )
    .join("");

  const style = `
    .l  { opacity: 0; animation: reveal .01s linear forwards, type .5s steps(32) forwards; }
    .wm { opacity: 0; letter-spacing: .12em; animation: resolve .8s cubic-bezier(.2,.7,.2,1) 2.7s forwards; }
    .s1 { opacity: 0; animation: reveal .45s ease-out 3.1s forwards; }
    .s2 { opacity: 0; animation: reveal .45s ease-out 3.35s forwards; }
    .s3 { opacity: 0; animation: reveal .45s ease-out 3.6s forwards; }
    .nf { opacity: 0; animation: reveal .35s ease-out forwards; }
    .panel { opacity: 0; animation: reveal .5s ease-out 2.1s forwards; }
    .cur { animation: blink 1s steps(1) 3.8s 6; }
    .shine { transform: translateX(-160px); animation: sweep 1.3s ease-in-out 3.5s 1 forwards; }
    @keyframes reveal  { to { opacity: 1; } }
    @keyframes type    { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
    @keyframes resolve { from { opacity: 0; letter-spacing: .4em; } to { opacity: 1; letter-spacing: .12em; } }
    @keyframes blink   { 50% { fill-opacity: 0; } }
    @keyframes sweep   { to { transform: translateX(620px); } }
    @media (prefers-reduced-motion: reduce) { .shine { display: none; } .wm { letter-spacing: .12em; } }`;

  const name = esc(meta.name.toUpperCase());
  const body = `
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.accent.blue}" stop-opacity="${dark ? 0.45 : 0.16}"/>
      <stop offset="100%" stop-color="${p.accent.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.accent.purple}" stop-opacity="${dark ? 0.3 : 0.1}"/>
      <stop offset="100%" stop-color="${p.accent.purple}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${dark ? "#FFFFFF" : p.accent.blue}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${dark ? "#FFFFFF" : p.accent.blue}" stop-opacity="${dark ? 0.9 : 0.7}"/>
      <stop offset="1" stop-color="${dark ? "#FFFFFF" : p.accent.blue}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="${p.scan}" opacity="${dark ? 0.025 : 0.02}"/>
    </pattern>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="${p.border}" stroke-width=".6"/>
    </pattern>
    <clipPath id="wmclip"><text x="36" y="228" font-size="42" font-weight="800" letter-spacing=".12em">${name}</text></clipPath>
  </defs>
  ${windowChrome({
    width: W,
    height: H,
    title: meta.prompt,
    window: p.window,
    border: p.border,
    muted: p.muted,
    lights: [p.accent.red, p.accent.amber, p.accent.green],
    right: `<text x="${W - 24}" y="26.5" font-size="11.5" fill="${p.dim}" text-anchor="end">tty1 · ${esc(ctx.now.toISOString().slice(0, 10))}</text>`,
  })}
  <rect x="2" y="43" width="${W - 4}" height="${H - 45}" fill="url(#grid)" opacity="${dark ? 0.45 : 0.5}"/>
  <circle cx="250" cy="220" r="170" fill="url(#glow)"/>
  <circle cx="600" cy="110" r="150" fill="url(#glow2)"/>
  ${bootLines}
  <text class="a wm" x="36" y="228" font-size="42" font-weight="800" fill="${p.fg}">${name}</text>
  <g clip-path="url(#wmclip)"><rect class="shine" x="0" y="180" width="140" height="60" fill="url(#sheen)"/></g>
  <text class="a s1" x="38" y="260" font-size="14.5" fill="${p.muted}">${esc(meta.title)} · <tspan fill="${p.accent.blue}" font-weight="700">${esc(meta.focus)}</tspan> @ ${esc(meta.employer)}</text>
  <text class="a s2" x="38" y="286" font-size="12.5" fill="${p.muted}"><tspan fill="${p.accent.purple}">foundry</tspan> × <tspan fill="${p.accent.blue}">copilot studio</tspan> × <tspan fill="${p.accent.pink}">power platform</tspan> × <tspan fill="${p.accent.green}">azure</tspan></text>
  <text class="a s3" x="38" y="314" font-size="11.5" fill="${p.dim}">${esc(DISCLAIMER)} <tspan class="cur" fill="${p.accent.blue}">▋</tspan></text>
  <g class="a panel">
    <rect x="${px}" y="62" width="${W - px - 24}" height="${fetchRows.length * 21 + 78}" rx="10" fill="${p.panel}" stroke="${p.border}"/>
    <text x="${px + 18}" y="88" font-size="12.5" font-weight="700"><tspan fill="${p.accent.green}">${esc(meta.owner)}</tspan><tspan fill="${p.muted}">@</tspan><tspan fill="${p.accent.green}">foundry</tspan><tspan fill="${p.dim}" font-weight="400"> — neofetch</tspan></text>
    <line x1="${px + 18}" y1="97" x2="${W - 42}" y2="97" stroke="${p.border}"/>
  </g>
  ${fetchText}
  ${swatches}
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="11" fill="url(#scan)" pointer-events="none"/>`;

  return svgDoc({
    width: W,
    height: H,
    label: `${meta.name} — ${meta.title}, ${meta.focus} at ${meta.employer}. Personal projects and opinions, not official Microsoft guidance.`,
    style,
    body,
  });
}
