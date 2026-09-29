import type { StatusSetting } from "./config.ts";
import type { RepoData } from "./github.ts";
import type { AccentName } from "./tokens.ts";

export type Status = Exclude<StatusSetting, "auto">;

export const STATUS_STYLE: Record<Status, { glyph: string; label: string; accent: AccentName | "muted" }> = {
  active: { glyph: "●", label: "ACTIVE", accent: "green" },
  stable: { glyph: "◆", label: "STABLE", accent: "blue" },
  building: { glyph: "◑", label: "BUILDING", accent: "amber" },
  planned: { glyph: "○", label: "PLANNED", accent: "muted" },
};

const DAY = 86_400_000;

export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
}

/**
 * auto → ACTIVE when pushed within the active window, otherwise STABLE.
 * Repos that are missing (or data unavailable) fall back to STABLE rather than failing the build.
 */
export function deriveStatus(setting: StatusSetting, repo: RepoData | undefined, now: Date, activeWindowDays: number): Status {
  if (setting !== "auto") return setting;
  if (!repo) return "stable";
  return daysSince(repo.pushedAt, now) <= activeWindowDays ? "active" : "stable";
}

export function ago(iso: string, now: Date): string {
  const d = daysSince(iso, now);
  if (d === 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
