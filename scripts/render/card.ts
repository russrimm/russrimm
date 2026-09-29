import type { Agent } from "../lib/config.ts";
import { accent, domainColor, fmt, repo, type BuildContext } from "../lib/context.ts";
import { ago, deriveStatus, STATUS_STYLE } from "../lib/status.ts";
import { esc, svgDoc, truncate, wrap } from "../lib/svg.ts";
import { PALETTES, textWidth, type Palette, type Theme } from "../lib/tokens.ts";

const STYLE = `
  .rail { stroke-dasharray: 400; stroke-dashoffset: 400; animation: draw .9s cubic-bezier(.2,.7,.2,1) .1s forwards; }
  .fade { opacity: 0; animation: reveal .5s ease-out forwards; }
  .ring { opacity: 0; transform-box: fill-box; transform-origin: center; animation: pulse 1.8s ease-out 1s 4; }
  @keyframes draw   { to { stroke-dashoffset: 0; } }
  @keyframes reveal { to { opacity: 1; } }
  @keyframes pulse  { 0% { opacity: .7; transform: scale(1); } 100% { opacity: 0; transform: scale(3.2); } }
  @media (prefers-reduced-motion: reduce) { .ring { display: none; } }`;

function chips(items: string[], x: number, y: number, maxX: number, p: Palette, color: string): string {
  const out: string[] = [];
  let cx = x;
  for (const [i, item] of items.entries()) {
    const w = textWidth(item, 11) + 16;
    const remaining = items.length - i;
    const moreW = textWidth(`+${remaining}`, 11) + 16;
    if (cx + w > maxX - (remaining > 1 ? moreW + 6 : 0)) {
      out.push(chip(`+${remaining}`, cx, y, moreW, p, p.muted));
      break;
    }
    out.push(chip(item, cx, y, w, p, color));
    cx += w + 6;
  }
  return out.join("");
}

function chip(label: string, x: number, y: number, w: number, p: Palette, color: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-opacity=".35"/><text x="${x + w / 2}" y="${y + 14}" font-size="11" fill="${p.fg}" text-anchor="middle">${esc(label)}</text>`;
}

export function renderCard(ctx: BuildContext, agent: Agent, theme: Theme, wide: boolean): string {
  const p = PALETTES[theme];
  const W = wide ? 1000 : 490;
  const H = wide ? 220 : 204;
  const r = repo(ctx, agent.id);
  const status = deriveStatus(agent.status, r, ctx.now, ctx.profile.rules.active_window_days);
  const st = STATUS_STYLE[status];
  const stColor = accent(p, st.accent);
  const rail = domainColor(ctx, theme, agent.domain);
  const x0 = 38;
  const colRight = wide ? 640 : W - 22;
  const perLine = Math.floor((colRight - x0) / (12.5 * 0.6));

  const statusText = `${st.glyph} ${st.label}`;
  const statusW = textWidth(statusText, 11.5) + 20;
  const statusX = W - 22 - statusW;
  const idMax = Math.floor((statusX - 12 - x0 - textWidth("AGENT: ", 12)) / (12.5 * 0.6));

  const tagline = wrap(agent.tagline, perLine, 2)
    .map((line, i) => `<text x="${x0}" y="${100 + i * 19}" font-size="12.5" fill="${p.muted}">${esc(line)}</text>`)
    .join("");

  const lang = r?.primaryLanguage;
  const footerParts: string[] = [];
  if (r) {
    footerParts.push(`<tspan fill="${p.accent.amber}">★</tspan> ${fmt(r.stargazerCount)}`);
    footerParts.push(`<tspan fill="${p.muted}">⑂</tspan> ${fmt(r.forkCount)}`);
    if (lang) footerParts.push(`<tspan fill="${lang.color ?? p.muted}">●</tspan> ${esc(lang.name)}`);
    footerParts.push(`pushed ${ago(r.pushedAt, ctx.now)}`);
  } else {
    footerParts.push("live stats refresh nightly");
  }
  const homepage = r?.homepageUrl || agent.ping;
  const host = (() => {
    try {
      return homepage ? new URL(homepage).host.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();
  const cta = host ? (wide ? `→ repo · live ↗ ${host}` : "↗ live · → repo") : "→ repo";

  let ringDot = "";
  if (status === "active") {
    const dotX = statusX + 10 + textWidth("●", 11.5) / 2;
    ringDot = `<circle class="a ring" cx="${dotX}" cy="36" r="3.5" fill="none" stroke="${stColor}" stroke-width="1.5"/>`;
  }

  let side = "";
  const sx = 668;
  const panel = (lines: string) => `
    <g class="a fade" style="animation-delay:.5s">
      <rect x="${sx}" y="64" width="${W - sx - 22}" height="${H - 86}" rx="10" fill="${p.window}" stroke="${p.border}"/>
      ${lines}
    </g>`;
  const row = (y: number, k: string, v: string) =>
    `<text x="${sx + 16}" y="${y}" font-size="12" fill="${p.muted}">${esc(k)} <tspan x="${sx + 96}" fill="${p.fg}">${v}</tspan></text>`;
  if (wide && agent.ping) {
    const pr = ctx.pings[agent.ping];
    const pingHost = new URL(agent.ping).host;
    const up = pr?.ok ?? false;
    const upColor = pr ? (up ? p.accent.green : p.accent.red) : p.muted;
    const upLabel = pr ? (up ? "● online" : "○ unreachable") : "○ not checked";
    side = panel(`
      <text x="${sx + 16}" y="88" font-size="12" fill="${p.muted}"><tspan fill="${p.accent.green}">$</tspan> curl -sI ${esc(pingHost)}</text>
      <text x="${sx + 16}" y="114" font-size="13" fill="${p.fg}" font-weight="700">HTTP ${pr?.status ?? "—"} <tspan fill="${upColor}">${esc(upLabel)}</tspan></text>
      ${row(136, "latency", pr?.ms != null ? `${pr.ms} ms` : "—")}
      ${row(156, "checked", esc(pr?.checkedAt ?? "—"))}
      ${row(176, "cadence", "nightly probe")}
      ${up ? `<circle class="a ring" cx="${sx + 16 + textWidth(`HTTP ${pr?.status ?? "—"} `, 13) + 4}" cy="109.5" r="3.5" fill="none" stroke="${p.accent.green}" stroke-width="1.5"/>` : ""}`);
  } else if (wide) {
    side = panel(`
      <text x="${sx + 16}" y="88" font-size="12" fill="${p.muted}"><tspan fill="${p.accent.green}">$</tspan> gh repo view ${esc(truncate(agent.id, 22))}</text>
      ${row(114, "language", lang ? `<tspan fill="${lang.color ?? p.fg}">●</tspan> ${esc(lang.name)}` : "—")}
      ${row(136, "stars", r ? `${fmt(r.stargazerCount)} ★ · ${fmt(r.forkCount)} forks` : "—")}
      ${row(156, "pushed", r ? `${r.pushedAt.slice(0, 10)} (${ago(r.pushedAt, ctx.now)})` : "—")}
      ${row(176, "release", esc(r?.latestRelease?.tagName ?? "none yet"))}`);
  }

  const body = `
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${p.panel}" stroke="${p.border}"/>
  ${agent.featured ? `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="none" stroke="${rail}" stroke-opacity=".35"/>` : ""}
  <line class="a rail" x1="20" y1="20" x2="20" y2="${H - 20}" stroke="${rail}" stroke-width="4" stroke-linecap="round"/>
  <text x="${x0}" y="40" font-size="12" fill="${p.muted}" letter-spacing=".5">AGENT: <tspan fill="${p.fg}" font-weight="700" font-size="12.5">${esc(truncate(agent.id, idMax))}</tspan></text>
  <rect x="${statusX}" y="26" width="${statusW}" height="20" rx="10" fill="${stColor}" fill-opacity=".12" stroke="${stColor}" stroke-opacity=".4"/>
  <text x="${statusX + statusW / 2}" y="40" font-size="11.5" font-weight="700" fill="${stColor}" text-anchor="middle" letter-spacing=".5">${esc(statusText)}</text>
  ${ringDot}
  <line x1="${x0}" y1="56" x2="${wide ? 644 : W - 22}" y2="56" stroke="${p.border}"/>
  <g class="a fade" style="animation-delay:.25s">
    <text x="${x0}" y="80" font-size="15.5" font-weight="700" fill="${p.fg}">${esc(truncate(agent.title, Math.floor((colRight - x0) / (15.5 * 0.6))))}${agent.featured ? `<tspan fill="${rail}" font-size="12" font-weight="400">  ◂ start here</tspan>` : ""}</text>
    ${tagline}
    ${chips(agent.stack, x0, 138, colRight, p, rail)}
  </g>
  <text class="a fade" style="animation-delay:.45s" x="${x0}" y="${H - 22}" font-size="12" fill="${p.muted}">${footerParts.join(`<tspan fill="${p.dim}">  ·  </tspan>`)}</text>
  <text class="a fade" style="animation-delay:.45s" x="${colRight}" y="${H - 22}" font-size="12" fill="${rail}" text-anchor="end">${esc(cta)}</text>
  ${side}`;

  const label = `${agent.title} (${agent.id}) — ${st.label.toLowerCase()}. ${agent.tagline}`;
  return svgDoc({ width: W, height: H, label, style: STYLE, body });
}
