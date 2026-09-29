import { MONO } from "./tokens.ts";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** Greedy word wrap by character count (monospace layout). */
export function wrap(text: string, maxChars: number, maxLines = Infinity): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if ([...next].length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1] ?? "";
    while ([...last].length > maxChars - 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.replace(/[\s,.;:—-]+$/, "")}…`;
    return kept;
  }
  return lines;
}

export function truncate(text: string, maxChars: number): string {
  if (maxChars <= 1) return "";
  const chars = [...text];
  return chars.length <= maxChars ? text : `${chars.slice(0, maxChars - 1).join("").trimEnd()}…`;
}

export function minify(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s*\n\s*</g, "><")
    .replace(/\n\s*/g, " ")
    .trim();
}

export interface SvgDoc {
  width: number;
  height: number;
  label: string;
  style?: string;
  body: string;
}

/**
 * Wrap content in an SVG root with shared reduced-motion handling.
 * Every animated element carries class `a` so reduced motion can show its final state.
 */
export function svgDoc({ width, height, label, style = "", body }: SvgDoc): string {
  return minify(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${MONO}" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <style>
    ${style}
    @media (prefers-reduced-motion: reduce) {
      .a { animation: none !important; opacity: 1 !important; clip-path: none !important; stroke-dashoffset: 0 !important; }
    }
  </style>
  ${body}
</svg>`);
}

/** Terminal window chrome: frame, traffic lights, and a title. Returns the y where content starts. */
export function windowChrome(opts: {
  width: number;
  height: number;
  title: string;
  window: string;
  border: string;
  muted: string;
  lights: [string, string, string];
  right?: string;
}): string {
  const { width, height, title, window, border, muted, lights, right = "" } = opts;
  return `
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${window}" stroke="${border}"/>
  <circle cx="24" cy="22" r="5" fill="${lights[0]}" opacity=".9"/>
  <circle cx="42" cy="22" r="5" fill="${lights[1]}" opacity=".9"/>
  <circle cx="60" cy="22" r="5" fill="${lights[2]}" opacity=".9"/>
  <text x="80" y="26.5" font-size="12.5" fill="${muted}" letter-spacing=".4">${esc(title)}</text>
  ${right}
  <line x1="1" y1="42" x2="${width - 1}" y2="42" stroke="${border}"/>`;
}
