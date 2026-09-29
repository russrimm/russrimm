import { cardLayout, fmt, repo, slug, type BuildContext } from "./lib/context.ts";
import { ago } from "./lib/status.ts";

const GEN = "assets/generated";

function picture(name: string, alt: string, width: string): string {
  const src = (t: string) => `${GEN}/${name}-${t}.svg`;
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${src("dark")}"><source media="(prefers-color-scheme: light)" srcset="${src("light")}"><img alt="${attr(alt)}" src="${src("light")}" width="${width}"></picture>`;
}

function attr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function md(s: string): string {
  return s.replace(/([\\`*_[\]<>|])/g, "\\$1");
}

function repoUrl(ctx: BuildContext, id: string): string {
  return `https://github.com/${ctx.profile.meta.owner}/${id}`;
}

function registry(ctx: BuildContext): string {
  const card = (id: string, title: string, width: string) =>
    `<a href="${repoUrl(ctx, id)}">${picture(`card-${slug(id)}`, `${title} — open repository`, width)}</a>`;
  const out = [`<p>\n${picture("rule-agents", "ls ~/agents --featured", "100%")}\n</p>`];
  let pair: string[] = [];
  const flush = () => {
    if (pair.length) out.push(`<p align="center">\n${pair.join("\n")}\n</p>`);
    pair = [];
  };
  for (const { agent, wide } of cardLayout(ctx)) {
    if (wide) {
      flush();
      out.push(`<p align="center">\n${card(agent.id, agent.title, "100%")}\n</p>`);
    } else {
      pair.push(card(agent.id, agent.title, "49%"));
      if (pair.length === 2) flush();
    }
  }
  flush();
  return out.join("\n\n");
}

function feed(ctx: BuildContext): string {
  const header = `<p>\n${picture("rule-feed", "tail -f ~/blog/posts.log", "100%")}\n</p>`;
  if (!ctx.posts?.length) {
    return `${header}\n\n<code>--:--</code> &nbsp;Feed unavailable at build time. Read the latest at [russrimmerman.com](${ctx.profile.meta.site}).`;
  }
  const lines = ctx.posts.map((p) => `<code>${p.date}</code> &nbsp;[${md(p.title)}](${p.link})`);
  return `${header}\n\n${lines.join("<br>\n")}\n\n<sub>↳ [all posts](${ctx.profile.meta.site}/blog/) · [RSS](${ctx.profile.meta.rss})</sub>`;
}

function projects(ctx: BuildContext): string {
  const out = [`<p>\n${picture("rule-projects", "ls -la ~/projects", "100%")}\n</p>`];
  for (const cat of ctx.profile.projects) {
    out.push(`#### \`./${cat.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}\``);
    const rows = cat.items.map((item) => {
      const r = repo(ctx, item.id);
      const live = r?.homepageUrl ? ` · [live ↗](${r.homepageUrl})` : "";
      const stats = r ? fmt(r.stargazerCount) : "—";
      const lang = r?.primaryLanguage?.name ?? "—";
      const pushed = r ? ago(r.pushedAt, ctx.now).replace(" ", "&nbsp;") : "—";
      return `| **[${md(item.title)}](${repoUrl(ctx, item.id)})**${live} | ${md(item.tagline)} | ${stats} | ${lang} | ${pushed} |`;
    });
    out.push(["| Project | What it is | ★ | Lang | Pushed |", "|---|---|---:|---|---|", ...rows].join("\n"));
  }
  out.push(
    "<sub>Some of these are deliberate prototypes for fast validation; others are hardened for enterprise, mission-critical use. Each repo's README says which, along with its architecture, prerequisites, and deployment path.</sub>",
  );
  return out.join("\n\n");
}

function stack(ctx: BuildContext): string {
  const keys = Object.keys(ctx.profile.stack);
  const pad = Math.max(...keys.map((k) => k.length)) + 3;
  const lines = keys.map((k, i) => {
    const v = ctx.profile.stack[k];
    const val = Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v);
    return `  ${`"${k}":`.padEnd(pad)} ${val}${i < keys.length - 1 ? "," : ""}`;
  });
  return `<details>\n<summary><code>▸ cat stack.json</code></summary>\n\n\`\`\`json\n{\n${lines.join("\n")}\n}\n\`\`\`\n</details>`;
}

function background(ctx: BuildContext): string {
  const items = ctx.profile.background.map((b) => `- ${b}`).join("\n");
  return `<details>\n<summary><code>▸ man ${ctx.profile.meta.owner}</code></summary>\n\n${items}\n\nIf you're working on **agentic automation, Microsoft Foundry adoption, Power Platform strategy, or cloud modernization**, I'd love to compare notes.\n</details>`;
}

export function assembleReadme(ctx: BuildContext, template: string): string {
  const { meta, book } = ctx.profile;
  const tokens: Record<string, string> = {
    HERO: picture("hero", `${meta.name} — ${meta.title}, ${meta.focus} at ${meta.employer}`, "100%"),
    BIO: ctx.profile.bio.join("\n\n"),
    LINKS: [
      `[\`~/site\` russrimmerman.com](${meta.site})`,
      `[\`~/in\` LinkedIn](${meta.linkedin})`,
      `[\`~/pulse\` Pulse 360°](https://www.mspulse360.app)`,
      `[\`~/book\` ${book.title}](${book.url})`,
    ].join(" &nbsp;·&nbsp; "),
    PSTREE: picture("pstree", "pstree of focus domains", "100%"),
    REGISTRY: registry(ctx),
    MONITOR: picture("monitor", "htop-style system monitor with live GitHub stats", "100%"),
    BOOK: `<a href="${book.url}">${picture("book", `${book.title} — ${book.subtitle}`, "100%")}</a>`,
    FEED: feed(ctx),
    PROJECTS: projects(ctx),
    STACK: stack(ctx),
    BACKGROUND: background(ctx),
    FOOTER: `<sub>\`${meta.prompt}\` &nbsp;[russrimmerman.com](${meta.site}) &nbsp;·&nbsp; [in/russrimm](${meta.linkedin}) &nbsp;·&nbsp; 📍 ${meta.location} &nbsp;·&nbsp; rebuilt ${ctx.now.toISOString().slice(0, 10)} by [\`refresh.yml\`](.github/workflows/refresh.yml)</sub>`,
  };
  const body = template.replace(/<!--\s*TEMPLATE[\s\S]*?-->\n*/g, "");
  const out = body.replace(/\{\{([A-Z_]+)\}\}/g, (m, key: string) => {
    if (!(key in tokens)) throw new Error(`Unknown template token ${m}`);
    return tokens[key] ?? "";
  });
  return `<!-- Generated by scripts/build.ts from templates/README.tpl.md and config/profile.yml. Do not edit by hand. -->\n\n${out}`;
}
