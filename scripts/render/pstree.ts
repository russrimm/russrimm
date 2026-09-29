import { domainColor, type BuildContext } from "../lib/context.ts";
import { esc, svgDoc, windowChrome } from "../lib/svg.ts";
import { PALETTES, textWidth, type Theme } from "../lib/tokens.ts";

const W = 1000;

export function renderPstree(ctx: BuildContext, theme: Theme): string {
  const p = PALETTES[theme];
  const { meta, pstree, domains } = ctx.profile;
  const rootX = 28;
  const firstY = 112;
  const rowH = 42;
  const trunkX = rootX + 12;
  const chipX = 110;
  const labels = pstree.map((n) => domains[n.domain]?.label ?? n.domain);
  const chipW = Math.max(...labels.map((l) => textWidth(l, 12.5))) + 28;
  const leafX = chipX + chipW + 34;
  const lastY = firstY + (pstree.length - 1) * rowH;
  const H = lastY + 40;

  let delay = 0.3;
  const step = (n: number) => (delay += n).toFixed(2);

  const trunkLen = lastY - firstY + 12;
  const trunk = `<path class="a draw" style="--len:${trunkLen};animation-delay:${step(0)}s" d="M${trunkX} ${firstY - 12}V${lastY}" stroke="${p.muted}" stroke-width="1.5" fill="none"/>`;

  const rows = pstree
    .map((node, i) => {
      const y = firstY + i * rowH;
      const color = domainColor(ctx, theme, node.domain);
      const label = labels[i] ?? node.domain;
      const branchLen = chipX - trunkX;
      const d0 = step(0.18);
      let lx = leafX;
      const leaves = node.children
        .map((leaf) => {
          const w = textWidth(leaf, 11.5) + 18;
          if (lx + w > W - 100) return "";
          const s = `<g class="a pop" style="animation-delay:${step(0.06)}s"><rect x="${lx}" y="${y - 11}" width="${w}" height="22" rx="6" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-opacity=".3"/><text x="${lx + w / 2}" y="${y + 4}" font-size="11.5" fill="${p.fg}" text-anchor="middle">${esc(leaf)}</text></g>`;
          lx += w + 8;
          return s;
        })
        .join("");
      const leafLen = leafX - (chipX + chipW) - 4;
      const count = ctx.profile.agents.filter((a) => a.domain === node.domain).length;
      const countTag = count
        ? `<text class="a pop" style="animation-delay:${step(0.05)}s" x="${W - 24}" y="${y + 4}" font-size="11" fill="${p.dim}" text-anchor="end">${count} agent${count === 1 ? "" : "s"} ↓</text>`
        : "";
      return `
      <path class="a draw" style="--len:${branchLen};animation-delay:${d0}s" d="M${trunkX} ${y}H${chipX}" stroke="${p.muted}" stroke-width="1.5" fill="none"/>
      <g class="a pop" style="animation-delay:${(Number(d0) + 0.15).toFixed(2)}s">
        <rect x="${chipX}" y="${y - 13}" width="${chipW}" height="26" rx="7" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-opacity=".7"/>
        <circle cx="${chipX + 12}" cy="${y}" r="3.5" fill="${color}"/>
        <text x="${chipX + 22}" y="${y + 4.5}" font-size="12.5" font-weight="700" fill="${color}">${esc(label)}</text>
      </g>
      <path class="a draw" style="--len:${leafLen};animation-delay:${(Number(d0) + 0.25).toFixed(2)}s" d="M${chipX + chipW + 2} ${y}H${leafX - 4}" stroke="${color}" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="${leafLen}" fill="none"/>
      ${leaves}
      ${countTag}`;
    })
    .join("");

  const style = `
    .draw { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: draw .45s ease-out forwards; }
    .pop  { opacity: 0; animation: reveal .35s ease-out forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes reveal { to { opacity: 1; } }`;

  const body = `
  ${windowChrome({
    width: W,
    height: H,
    title: `pstree — what ${meta.owner} runs on`,
    window: p.window,
    border: p.border,
    muted: p.muted,
    lights: [p.accent.red, p.accent.amber, p.accent.green],
  })}
  <text x="${rootX}" y="72" font-size="13" fill="${p.muted}"><tspan fill="${p.accent.green}">${esc(meta.prompt)}</tspan> <tspan fill="${p.fg}">pstree --domains ${esc(meta.owner)}</tspan></text>
  <g class="a pop" style="animation-delay:.15s">
    <text x="${rootX}" y="${firstY - 18}" font-size="14" font-weight="800" fill="${p.fg}">${esc(meta.owner)}</text>
  </g>
  ${trunk}
  ${rows}`;

  return svgDoc({
    width: W,
    height: H,
    label: `Domain tree: ${pstree.map((n, i) => `${labels[i]} (${n.children.join(", ")})`).join("; ")}`,
    style,
    body,
  });
}
