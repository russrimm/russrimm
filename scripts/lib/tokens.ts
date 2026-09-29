export type Theme = "dark" | "light";
export const THEMES: Theme[] = ["dark", "light"];

export type AccentName = "purple" | "blue" | "cyan" | "pink" | "green" | "amber" | "red";

export interface Palette {
  bg: string;
  window: string;
  panel: string;
  border: string;
  fg: string;
  muted: string;
  dim: string;
  scan: string;
  accent: Record<AccentName, string>;
}

export const PALETTES: Record<Theme, Palette> = {
  dark: {
    bg: "#0D1117",
    window: "#0E1424",
    panel: "#121A2C",
    border: "#1E2637",
    fg: "#E6EDF3",
    muted: "#8B949E",
    dim: "#5B6573",
    scan: "#E6EDF3",
    accent: {
      purple: "#BC8CFF",
      blue: "#58A6FF",
      cyan: "#39C5CF",
      pink: "#F778BA",
      green: "#3FB950",
      amber: "#D29922",
      red: "#FF7B72",
    },
  },
  light: {
    bg: "#FFFFFF",
    window: "#F8FAFC",
    panel: "#FFFFFF",
    border: "#D0D7DE",
    fg: "#1F2328",
    muted: "#59636E",
    dim: "#8C959F",
    scan: "#1F2328",
    accent: {
      purple: "#8250DF",
      blue: "#0969DA",
      cyan: "#1B7C83",
      pink: "#BF3989",
      green: "#1A7F37",
      amber: "#9A6700",
      red: "#CF222E",
    },
  },
};

export const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/** Approximate advance width of one monospace glyph, as a fraction of font size. */
export const MONO_ADVANCE = 0.6;

export function textWidth(text: string, fontSize: number): number {
  return [...text].length * fontSize * MONO_ADVANCE;
}
