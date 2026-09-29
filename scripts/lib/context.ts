import type { Agent, Profile } from "./config.ts";
import type { GitHubData, RepoData } from "./github.ts";
import type { PingResult, Post } from "./net.ts";
import { PALETTES, type AccentName, type Palette, type Theme } from "./tokens.ts";

export interface BuildContext {
  profile: Profile;
  gh: GitHubData | null;
  posts: Post[] | null;
  pings: Record<string, PingResult>;
  now: Date;
}

export function repo(ctx: BuildContext, name: string): RepoData | undefined {
  return ctx.gh?.repos.find((r) => r.name.toLowerCase() === name.toLowerCase());
}

export function totals(ctx: BuildContext) {
  const repos = ctx.gh?.repos ?? [];
  return {
    repos: ctx.gh?.publicRepos ?? null,
    stars: ctx.gh ? repos.reduce((n, r) => n + r.stargazerCount, 0) : null,
    forks: ctx.gh ? repos.reduce((n, r) => n + r.forkCount, 0) : null,
    commits: ctx.gh?.totalCommits ?? null,
    followers: ctx.gh?.followers ?? null,
  };
}

export function slug(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Featured card first (wide), then pairs; an unpaired trailing card also renders wide. */
export function cardLayout(ctx: BuildContext): { agent: Agent; wide: boolean }[] {
  const featured = ctx.profile.agents.filter((a) => a.featured);
  const rest = ctx.profile.agents.filter((a) => !a.featured);
  return [
    ...featured.map((agent) => ({ agent, wide: true })),
    ...rest.map((agent, i) => ({ agent, wide: rest.length % 2 === 1 && i === rest.length - 1 })),
  ];
}

export function fmt(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

export function accent(p: Palette, name: AccentName | "muted"): string {
  return name === "muted" ? p.muted : p.accent[name];
}

export function domainColor(ctx: BuildContext, theme: Theme, domain: string): string {
  const d = ctx.profile.domains[domain];
  return d ? PALETTES[theme].accent[d.color] : PALETTES[theme].muted;
}
