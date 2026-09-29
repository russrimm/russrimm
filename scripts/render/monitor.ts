import { fmt, totals, type BuildContext } from "../lib/context.ts";
import { daysSince, ago } from "../lib/status.ts";
import { esc, svgDoc, truncate, windowChrome } from "../lib/svg.ts";
import { PALETTES, textWidth, type Theme } from "../lib/tokens.ts";

const W = 1000;

function pid(name: string): number {
  let h = 2166136261;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 1000 + (Math.abs(h) % 64000);
}

export function languageShares(ctx: BuildContext) {
  const exclude = new Set(ctx.profile.monitor.exclude_languages.map((l) => l.toLowerCase()));
  const sizes = new Map<string, { size: number; color: string | null }>();
  for (const r of ctx.gh?.repos ?? []) {
    for (const e of r.languages.edges) {
      if (exclude.has(e.node.name.toLowerCase())) continue;
      const cur = sizes.get(e.node.name) ?? { size: 0, color: e.node.color };
      cur.size += e.size;
      sizes.set(e.node.name, cur);
    }
  }
  const total = [...sizes.values()].reduce((n, v) => n + v.size, 0) || 1;
  return [...sizes.entries()]
    .map(([name, v]) => ({ name, color: v.color, pct: (v.size / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

export function renderMonitor(ctx: BuildContext, theme: Theme): string {
  const p = PALETTES[theme];
  const t = totals(ctx);
  const { monitor, meta, rules } = ctx.profile;
  const langs = languageShares(ctx).slice(0, monitor.top_languages);
  const repos = ctx.gh?.repos ?? [];
  const running = repos.filter((r) => daysSince(r.pushedAt, ctx.now) <= rules.active_window_days).length;
  const days = ctx.gh?.days ?? [];
  const sum = (n: number) => days.slice(-n).reduce((s, d) => s + d.count, 0);

  // Language "CPU" meters.
  const barX = 58;
  const barW = 300;
  const meters = (langs.length ? langs : [{ name: "offline", color: p.muted, pct: 0 }])
    .map((l, i) => {
      const y = 70 + i * 22;
      const w = Math.max(2, (barW * Math.min(l.pct, 100)) / 100);
      const color = l.color ?? p.accent.blue;
      return `
      <g class="a fade" style="animation-delay:${(0.2 + i * 0.08).toFixed(2)}s">
        <text x="28" y="${y + 13}" font-size="12" fill="${p.accent.cyan}">${i + 1}</text>
        <text x="${barX - 10}" y="${y + 13}" font-size="12.5" fill="${p.fg}" font-weight="700">[</text>
        <rect x="${barX}" y="${y + 3}" width="${barW}" height="12" rx="2" fill="${p.border}" opacity=".45"/>
        <rect class="a grow" style="animation-delay:${(0.35 + i * 0.1).toFixed(2)}s" x="${barX}" y="${y + 3}" width="${w.toFixed(1)}" height="12" rx="2" fill="${color}"/>
        <text x="${barX + barW + 4}" y="${y + 13}" font-size="12.5" fill="${p.fg}" font-weight="700">]</text>
        <text x="${barX + barW + 56}" y="${y + 13}" font-size="12" fill="${p.fg}" text-anchor="end">${l.pct.toFixed(1)}%</text>
        <text x="${barX + barW + 66}" y="${y + 13}" font-size="12" fill="${p.muted}">${esc(truncate(l.name, 14))}</text>
      </g>`;
    })
    .join("");

  // Right column: summary + 30-day activity sparkline.
  const rx = 540;
  const upYears = ctx.gh ? daysSince(ctx.gh.createdAt, ctx.now) / 365.25 : null;
  const uptime = upYears === null ? "—" : `${Math.floor(upYears)}y ${Math.floor((upYears % 1) * 12)}mo on GitHub`;
  const kv = (k: string, v: string, y: number, i: number) =>
    `<text class="a fade" style="animation-delay:${(0.3 + i * 0.08).toFixed(2)}s" x="${rx}" y="${y}" font-size="12.5" fill="${p.accent.cyan}">${esc(k)} <tspan fill="${p.fg}" font-weight="700">${v}</tspan></text>`;
  const summary = [
    kv("Tasks:", `${fmt(t.repos)}<tspan fill="${p.muted}" font-weight="400">, </tspan><tspan fill="${p.accent.green}">${ctx.gh ? running : "—"} running</tspan>`, 80, 0),
    kv("Load average:", `${ctx.gh ? sum(7) : "—"} <tspan fill="${p.muted}" font-weight="400">7d</tspan> ${ctx.gh ? sum(30) : "—"} <tspan fill="${p.muted}" font-weight="400">30d</tspan> ${ctx.gh ? sum(90) : "—"} <tspan fill="${p.muted}" font-weight="400">90d</tspan>`, 102, 1),
    kv("Uptime:", `${esc(uptime)} <tspan fill="${p.muted}" font-weight="400">· ${meta.years_in_it}+ yrs in IT</tspan>`, 124, 2),
    kv("Stars:", `${fmt(t.stars)} ★ <tspan fill="${p.muted}" font-weight="400">· forks</tspan> ${fmt(t.forks)} <tspan fill="${p.muted}" font-weight="400">· followers</tspan> ${fmt(t.followers)}`, 146, 3),
  ].join("");

  const last30 = days.slice(-30);
  const max = Math.max(1, ...last30.map((d) => d.count));
  const sparkTop = 174;
  const sparkH = 26;
  const bw = 11;
  const spark = last30
    .map((d, i) => {
      const h = Math.max(2, (d.count / max) * sparkH);
      const color = d.count === 0 ? p.border : p.accent.green;
      return `<rect class="a rise" style="animation-delay:${(0.5 + i * 0.02).toFixed(2)}s" x="${rx + i * (bw + 3)}" y="${(sparkTop + sparkH - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="1.5" fill="${color}" opacity="${d.count === 0 ? 0.7 : 0.35 + 0.65 * (d.count / max)}"><title>${d.date}: ${d.count}</title></rect>`;
    })
    .join("");
  const sparkLabel = last30.length
    ? `<text x="${rx + 30 * (bw + 3) - 3}" y="${sparkTop - 4}" font-size="10.5" fill="${p.dim}" text-anchor="end">contributions · last 30 days · peak ${max}</text>`
    : `<text x="${rx}" y="${sparkTop + 20}" font-size="11" fill="${p.dim}">activity unavailable offline</text>`;

  // Process table: most recently pushed repos.
  const procs = [...repos].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt)).slice(0, monitor.top_processes);
  const cols = { pid: 28, user: 88, s: 176, stars: 214, forks: 262, lang: 310, upd: 430, cmd: 520 };
  const headY = 226;
  const header = `
    <rect x="16" y="${headY - 14}" width="${W - 32}" height="20" fill="${p.accent.green}" opacity=".9"/>
    <text y="${headY}" font-size="12" font-weight="700" fill="${theme === "dark" ? "#0D1117" : "#FFFFFF"}">
      <tspan x="${cols.pid}">PID</tspan><tspan x="${cols.user}">USER</tspan><tspan x="${cols.s}">S</tspan><tspan x="${cols.stars}">★</tspan><tspan x="${cols.forks}">⑂</tspan><tspan x="${cols.lang}">LANG</tspan><tspan x="${cols.upd}">PUSHED</tspan><tspan x="${cols.cmd}">COMMAND</tspan>
    </text>`;
  const rows = procs
    .map((r, i) => {
      const y = headY + 22 + i * 20;
      const state = daysSince(r.pushedAt, ctx.now) <= 7 ? "R" : "S";
      const sel = i === 0 ? `<rect x="16" y="${y - 14}" width="${W - 32}" height="20" fill="${p.accent.blue}" opacity=".18"/>` : "";
      const lang = r.primaryLanguage;
      return `
      <g class="a fade" style="animation-delay:${(0.8 + i * 0.1).toFixed(2)}s">
        ${sel}
        <text y="${y}" font-size="12" fill="${p.fg}">
          <tspan x="${cols.pid}" fill="${p.muted}">${pid(r.name)}</tspan><tspan x="${cols.user}">${esc(meta.owner)}</tspan><tspan x="${cols.s}" fill="${state === "R" ? p.accent.green : p.muted}" font-weight="700">${state}</tspan><tspan x="${cols.stars}">${r.stargazerCount}</tspan><tspan x="${cols.forks}">${r.forkCount}</tspan><tspan x="${cols.lang}" fill="${lang?.color ?? p.muted}">${esc(truncate(lang?.name ?? "—", 14))}</tspan><tspan x="${cols.upd}" fill="${p.muted}">${ago(r.pushedAt, ctx.now)}</tspan><tspan x="${cols.cmd}" fill="${i === 0 ? p.accent.blue : p.fg}" font-weight="${i === 0 ? 700 : 400}">${esc(truncate(r.name, 38))}</tspan><tspan fill="${p.dim}"> ${esc(truncate(r.description ?? "", Math.max(0, 62 - Math.min(38, r.name.length))))}</tspan>
        </text>
      </g>`;
    })
    .join("");

  const tableBottom = headY + 22 + Math.max(procs.length, 1) * 20;
  const fy = tableBottom + 8;
  const H = fy + 34;
  const keys: [string, string][] = [
    ["F1", "Blog"],
    ["F2", "Pulse360"],
    ["F3", "Book"],
    ["F4", "LinkedIn"],
    ["F5", "Refresh:nightly"],
    ["F10", "Quit"],
  ];
  let kx = 16;
  const fkeys = keys
    .map(([k, v]) => {
      const kw = textWidth(k, 12) + 6;
      const vw = textWidth(v, 12) + 14;
      const s = `<rect x="${kx}" y="${fy}" width="${kw}" height="18" fill="${p.fg}" opacity=".9"/><text x="${kx + 3}" y="${fy + 13}" font-size="12" font-weight="700" fill="${p.window}">${k}</text><rect x="${kx + kw}" y="${fy}" width="${vw}" height="18" fill="${p.accent.cyan}" opacity=".25"/><text x="${kx + kw + 4}" y="${fy + 13}" font-size="12" fill="${p.fg}">${esc(v)}</text>`;
      kx += kw + vw + 4;
      return s;
    })
    .join("");

  const style = `
    .fade { opacity: 0; animation: reveal .4s ease-out forwards; }
    .grow { transform-box: fill-box; transform-origin: left center; transform: scaleX(0); animation: grow .9s cubic-bezier(.2,.7,.2,1) forwards; }
    .rise { transform-box: fill-box; transform-origin: center bottom; transform: scaleY(0); animation: rise .6s cubic-bezier(.2,.7,.2,1) forwards; }
    @keyframes reveal { to { opacity: 1; } }
    @keyframes grow { to { transform: scaleX(1); } }
    @keyframes rise { to { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .grow, .rise { transform: none !important; } }`;

  const body = `
  ${windowChrome({
    width: W,
    height: H,
    title: `htop — ${meta.owner}@foundry`,
    window: p.window,
    border: p.border,
    muted: p.muted,
    lights: [p.accent.red, p.accent.amber, p.accent.green],
    right: `<text x="${W - 24}" y="26.5" font-size="11.5" fill="${p.dim}" text-anchor="end">languages by bytes · public, non-fork repos</text>`,
  })}
  ${meters}
  <line x1="516" y1="62" x2="516" y2="200" stroke="${p.border}"/>
  ${summary}
  ${sparkLabel}
  ${spark}
  ${header}
  ${rows}
  ${fkeys}`;

  return svgDoc({
    width: W,
    height: H,
    label: `System monitor: top languages ${langs.map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(", ")}; ${fmt(t.repos)} public repos, ${fmt(t.stars)} stars.`,
    style,
    body,
  });
}
