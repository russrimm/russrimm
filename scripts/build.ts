import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadProfile } from "./lib/config.ts";
import { cardLayout, slug, type BuildContext } from "./lib/context.ts";
import { fetchGitHubData } from "./lib/github.ts";
import { fetchPosts, ping, type PingResult } from "./lib/net.ts";
import { THEMES, type Theme } from "./lib/tokens.ts";
import { assembleReadme } from "./assemble.ts";
import { renderBook } from "./render/book.ts";
import { renderCard } from "./render/card.ts";
import { renderHero } from "./render/hero.ts";
import { renderMonitor } from "./render/monitor.ts";
import { renderPstree } from "./render/pstree.ts";
import { renderRule } from "./render/rule.ts";

const OUT = "assets/generated";
const offline = process.argv.includes("--offline");

function resolveToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const profile = loadProfile();
  const now = new Date();

  const pingTargets = profile.agents.map((a) => a.ping).filter((u): u is string => Boolean(u));
  const [gh, posts, pingResults] = offline
    ? [null, null, [] as PingResult[]]
    : await Promise.all([
        fetchGitHubData(profile.meta.owner, resolveToken()),
        fetchPosts(profile.meta.rss, profile.feed.count),
        Promise.all(pingTargets.map((u) => ping(u, now))),
      ]);
  const pings = Object.fromEntries(pingTargets.map((u, i) => [u, pingResults[i]!]).filter(([, r]) => r)) as Record<string, PingResult>;
  const ctx: BuildContext = { profile, gh, posts, pings, now };

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const write = (name: string, theme: Theme, svg: string) => writeFileSync(join(OUT, `${name}-${theme}.svg`), `${svg}\n`);

  for (const theme of THEMES) {
    write("hero", theme, renderHero(ctx, theme));
    write("pstree", theme, renderPstree(ctx, theme));
    write("monitor", theme, renderMonitor(ctx, theme));
    write("book", theme, renderBook(ctx, theme));
    for (const { agent, wide } of cardLayout(ctx)) write(`card-${slug(agent.id)}`, theme, renderCard(ctx, agent, theme, wide));
    write("rule-agents", theme, renderRule(ctx, theme, "ls ~/agents --featured", `${profile.agents.length} loaded`, "blue"));
    write("rule-feed", theme, renderRule(ctx, theme, "tail -f ~/blog/posts.log", posts ? `streaming · ${posts.length} latest` : "feed offline", posts ? "green" : "amber"));
    write("rule-projects", theme, renderRule(ctx, theme, "ls -la ~/projects", `${profile.projects.reduce((n, c) => n + c.items.length, 0)} more`, "purple"));
  }

  writeFileSync("README.md", assembleReadme(ctx, readFileSync("templates/README.tpl.md", "utf8")));

  const files = readdirSync(OUT).length;
  console.log(`✓ built ${files} SVGs + README.md (${gh ? "live GitHub data" : "config only"}, ${posts ? `${posts.length} posts` : "no feed"}, ${Object.keys(pings).length} ping)`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
