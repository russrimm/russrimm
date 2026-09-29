# Agent Console profile — developer notes

`README.md` and everything in `assets/generated/` are build output. Never edit them by hand.

## Run it

```bash
npm install
npm run build          # live data: GitHub GraphQL, blog RSS, Pulse 360° ping
npm run build:offline  # config only, no network
npm run typecheck
npm run lint
```

The build looks for a token in `GITHUB_TOKEN`, then `GH_TOKEN`, then `gh auth token`.
Without one it still succeeds, using config only (no stars, languages, or activity).
Every network step fails soft, so a flaky API never breaks the nightly run.

## The one edit point

`config/profile.yml` is the single source of truth:

| Key | Drives |
|---|---|
| `meta` | Hero, neofetch panel, footer, links |
| `domains` | Accent colors (cards, pstree, hero) |
| `pstree` | Animated domain tree |
| `agents` | Featured cards. Exactly one `featured: true` (wide anchor). An unpaired last card also renders wide. |
| `projects` | `ls -la ~/projects` tables |
| `book` | Book card |
| `monitor` | htop panel (excluded languages, row counts) |
| `stack`, `background` | Collapsible `cat stack.json` and `man russrimm` sections |

Card status: `auto` → `ACTIVE` when pushed within `rules.active_window_days`, otherwise `STABLE`.
Override with `active`, `stable`, `building`, or `planned`.

## Layout

```
config/profile.yml              single source of truth
templates/README.tpl.md         section order ({{HERO}}, {{REGISTRY}}, …)
scripts/build.ts                fetch data → render SVGs → assemble README
scripts/assemble.ts             template tokens → README.md
scripts/lib/                    config, GitHub GraphQL, RSS/ping, tokens, SVG helpers
scripts/render/                 hero, card, pstree, monitor, book, rule
assets/generated/               *-dark.svg / *-light.svg pairs (build output)
.github/workflows/refresh.yml   nightly + on push, commits only when output changes
```

## SVG rules

- Pure SVG + CSS (GitHub strips scripts). System monospace fonts only.
- Every section ships a dark and light variant via `<picture>` + `prefers-color-scheme`.
- Animations run once. Animated elements carry class `a`, so `prefers-reduced-motion`
  shows the final state immediately.
