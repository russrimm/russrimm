import type { BuildContext } from "../lib/context.ts";
import { esc, svgDoc } from "../lib/svg.ts";
import { PALETTES, textWidth, type AccentName, type Theme } from "../lib/tokens.ts";

const W = 1000;
const H = 46;

/** Section divider: `$ command` on the left, a live-looking status on the right, and a rule that draws in. */
export function renderRule(ctx: BuildContext, theme: Theme, command: string, status: string, color: AccentName = "green"): string {
  const p = PALETTES[theme];
  const prompt = ctx.profile.meta.prompt;
  const left = `${prompt} ${command}`;
  const lw = textWidth(left, 13.5) + 16;
  const sw = textWidth(status, 12) + 30;
  const ruleStart = 8 + lw;
  const ruleEnd = W - sw - 16;
  const len = Math.max(0, ruleEnd - ruleStart);
  const c = p.accent[color];
  const style = `
    .draw { stroke-dasharray: ${len}; stroke-dashoffset: ${len}; animation: draw 1s cubic-bezier(.2,.7,.2,1) .2s forwards; }
    .fade { opacity: 0; animation: reveal .4s ease-out .9s forwards; }
    .dot  { animation: blink 1.2s steps(1) 1.2s 5; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes reveal { to { opacity: 1; } }
    @keyframes blink { 50% { opacity: .2; } }`;
  const body = `
  <text x="8" y="28" font-size="13.5" fill="${p.muted}"><tspan fill="${p.accent.green}">${esc(prompt)}</tspan> <tspan fill="${p.fg}" font-weight="700">${esc(command)}</tspan></text>
  <line class="a draw" x1="${ruleStart}" y1="23.5" x2="${ruleEnd}" y2="23.5" stroke="${p.border}" stroke-width="1.5"/>
  <g class="a fade">
    <rect x="${W - sw - 6}" y="12" width="${sw}" height="22" rx="11" fill="${c}" fill-opacity=".1" stroke="${c}" stroke-opacity=".4"/>
    <circle class="a dot" cx="${W - sw + 8}" cy="23" r="3.5" fill="${c}"/>
    <text x="${W - sw + 18}" y="27.5" font-size="12" fill="${c}">${esc(status)}</text>
  </g>`;
  return svgDoc({ width: W, height: H, label: `${command} — ${status}`, style, body });
}
