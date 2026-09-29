import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { AccentName } from "./tokens.ts";

export type StatusSetting = "auto" | "active" | "stable" | "building" | "planned";

export interface Meta {
  owner: string;
  name: string;
  prompt: string;
  title: string;
  focus: string;
  employer: string;
  location: string;
  years_in_it: number;
  site: string;
  linkedin: string;
  rss: string;
  timezone: string;
}

export interface Domain {
  label: string;
  color: AccentName;
}

export interface Agent {
  id: string;
  title: string;
  featured?: boolean;
  domain: string;
  tagline: string;
  stack: string[];
  ping?: string;
  status: StatusSetting;
}

export interface ProjectItem {
  id: string;
  title: string;
  tagline: string;
}

export interface Profile {
  meta: Meta;
  bio: string[];
  domains: Record<string, Domain>;
  pstree: { domain: string; children: string[] }[];
  agents: Agent[];
  projects: { category: string; items: ProjectItem[] }[];
  book: {
    title: string;
    subtitle: string;
    pitch: string;
    chapters: number;
    appendices: number;
    highlights: string[];
    url: string;
  };
  monitor: { exclude_languages: string[]; top_languages: number; top_processes: number };
  feed: { count: number };
  stack: Record<string, string[] | string>;
  background: string[];
  rules: { active_window_days: number };
}

const ACCENTS: AccentName[] = ["purple", "blue", "cyan", "pink", "green", "amber", "red"];
const STATUSES: StatusSetting[] = ["auto", "active", "stable", "building", "planned"];

export function loadProfile(path = "config/profile.yml"): Profile {
  const profile = parse(readFileSync(path, "utf8")) as Profile;
  validate(profile);
  return profile;
}

function validate(p: Profile): void {
  const errors: string[] = [];
  for (const key of ["owner", "name", "prompt", "title", "site", "rss"] as const) {
    if (!p.meta?.[key]) errors.push(`meta.${key} is required`);
  }
  for (const [id, d] of Object.entries(p.domains ?? {})) {
    if (!ACCENTS.includes(d.color)) errors.push(`domains.${id}.color must be one of ${ACCENTS.join(", ")}`);
  }
  const featured = (p.agents ?? []).filter((a) => a.featured);
  if (featured.length !== 1) errors.push(`exactly one agent must be featured (found ${featured.length})`);
  const seen = new Set<string>();
  for (const a of p.agents ?? []) {
    if (seen.has(a.id)) errors.push(`duplicate agent id ${a.id}`);
    seen.add(a.id);
    if (!p.domains[a.domain]) errors.push(`agent ${a.id}: unknown domain ${a.domain}`);
    if (!STATUSES.includes(a.status)) errors.push(`agent ${a.id}: invalid status ${a.status}`);
    if (!a.tagline) errors.push(`agent ${a.id}: tagline is required`);
  }
  for (const node of p.pstree ?? []) {
    if (!p.domains[node.domain]) errors.push(`pstree: unknown domain ${node.domain}`);
  }
  if (errors.length) throw new Error(`config/profile.yml is invalid:\n  - ${errors.join("\n  - ")}`);
}
