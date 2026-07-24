# Phase 2 — The Explorer

A localhost site for reading and navigating a slipbox, which also exports to a
static site anyone can host. Spec agreed 2026-07-24; not yet built.

```
slipbox serve     # http://localhost:3000, live-reloads as notes are written
slipbox build     # -> ./out, a static site (Vercel, GitHub Pages, S3, anywhere)
```

## Goals

1. **Read the slipbox properly.** Long-form, low-chrome, generous whitespace. The
   notes are prose; the site should feel like reading, not like an admin panel.
2. **Navigate the network.** Backlinks and provenance on every page, plus a real
   graph view — the connections are the point of a Zettelkasten.
3. **Watch it grow.** The agent writes notes while you watch the page update.
4. **Publish anywhere.** Static output, no server required.

## Non-goals (v1)

Editing notes in the browser (markdown files are the source of truth — edit those),
authentication, multi-slipbox switching, comments, and rendering source texts.

## Decisions

| Decision | Choice |
| --- | --- |
| Framework | **Next.js**, App Router, `output: 'export'` |
| Distribution | **Bundled in `@slipbox/web`** — nothing scaffolded into the user's repo |
| Published content | **Notes only** — sources are linked out, never rendered |
| Graph | **Full interactive global graph** on its own page |
| Search | **Client-side prebuilt index** (works on any static host) |
| Typography | **Serif body, sans metadata**, system font stacks (zero font loading) |
| Home page | **Recent notes feed** |
| Theme | **Light + dark**, follows system, manual toggle, persisted |
| Live reload | **Yes**, plus a `slipbox_serve` tool so the agent can launch it |
| Demos | **GitHub Pages site per example** (ai, odyssey, sv-titans) |

Deferred to a later pass: tag index pages, prev/next within a source, rendering
source captures, in-browser editing.

## Architecture

### The core problem

The Next app lives in `node_modules/@slipbox/web`, but the content lives in the
user's slipbox directory, and the build output must land there too. Writing build
artifacts into `node_modules` is wrong: it breaks on global installs, and two
slipboxes building at once would collide.

**Resolution — a hidden working copy.** On first `serve`/`build`, the CLI
materializes the app into `<slipbox>/.slipbox-site/` (gitignored), symlinks its
`node_modules` back to the package's real dependencies, and runs Next there with
`SLIPBOX_ROOT` pointed at the slipbox. It stays invisible in the sense the user
never edits or commits it, and it's refreshed whenever the package version changes.

```
my-slipbox/
  .slipbox                  config + house style
  references/  literature-notes/  permanent-notes/  maps/
  .slipbox-site/            <- hidden working copy (gitignored, auto-managed)
    app/ components/ styles/
    node_modules -> …/node_modules/@slipbox/web/node_modules   (symlink)
    .next/                  build cache
  out/                      <- `slipbox build` output (static site)
```

> **Risk — de-risk this first.** Whether `next dev`/`next build` run cleanly from a
> copied directory with symlinked `node_modules` is the one genuinely uncertain
> part of this plan (module resolution, Next's project-root assumptions, pnpm's
> nested symlinks, Windows junctions). Milestone 1 is a throwaway spike proving it;
> if it fights us, the fallback is running Next from the package directory with
> `distDir` redirected, and failing that, scaffolding visibly into `site/`.

### Data layer

At build time the app reads the slipbox from `SLIPBOX_ROOT`:

1. **Load** every `.md` under the four note dirs (paths come from `.slipbox`, not
   hardcoded), parsing frontmatter + body.
2. **Resolve links.** Notes reference each other as `[[references/<id>]]` (or
   markdown links when `link_style: markdown`). A resolver maps a link target to a
   route; unresolvable targets render as muted, non-clickable text rather than
   dead links — a broken link should be visible, not silent.
3. **Derive backlinks** by inverting all links — both the `links:` frontmatter and
   inline wikilinks in bodies.
4. **Emit** `search-index.json` and `graph.json` as static assets.

Everything is computed once at build; the exported site is pure static files.

### Routes

| Route | Page |
| --- | --- |
| `/` | Recent notes feed |
| `/notes/<id>` | Literature note |
| `/references/` · `/references/<id>` | Source index · reference |
| `/permanent/<id>` | Permanent note |
| `/maps/<id>` | Map of Content |
| `/graph` | Interactive graph |
| `/search` | Search (index also powers an inline overlay) |

All routes are pre-rendered via `generateStaticParams`.

## Templates

Four note templates, sharing one layout (header, content column, footer).

**Reference** — the source record.
Title · kind badge (pdf/web/youtube/book) · author · date. Links to the original
`origin` **and** the Wayback `archived` snapshot when present. Body is the
whole-source summary, followed by *"Notes from this source"* listing its literature
notes, then backlinks.

**Literature note** — one idea.
Title, then a **provenance line** — the source, its author, and the original /
archived links — so you always know where the idea came from. Body prose. Tags as
chips (display-only in v1). Backlinks panel. Chunk seqs (`chunks: [3,4]`) shown as
quiet metadata for traceability, not as rendered passages.

**Permanent note** — title, prose, outgoing links, backlinks, tags. Template built
now so it's ready when Phase 5 lands.

**Map of Content** — title, framing prose, and grouped links out to the notes it
gathers, plus backlinks. Ready for Phase 4.

Every template gets the **backlinks panel** ("Linked from") — the core Zettelkasten
navigation move.

## Design

Whitespace and readability first. The visual system is deliberately small: one
measure, one type scale, two typefaces, a handful of colour tokens.

- **Measure** ~68ch for prose. Wide margins; the page should feel unhurried.
- **Body** system serif stack — `Charter, "Bitstream Charter", "Iowan Old Style",
  "Source Serif 4", Georgia, serif` — at ~1.15rem, line-height 1.65. No font
  loading, so text paints instantly.
- **Metadata, nav, tags, UI** system sans, smaller and muted; metadata never
  competes with prose.
- **Vertical rhythm** on a consistent spacing scale; headings get space above,
  not just below.
- **Colour** ink on warm off-white in light; warm near-black in dark. One accent,
  used sparingly for links and the current node in the graph. All as CSS custom
  properties so a slipbox can override them later.
- **Theme** defaults to `prefers-color-scheme` with a persisted toggle; an inline
  script sets the theme before first paint to avoid a flash.
- **Chrome is minimal**: a small header (slipbox name, search, graph, theme
  toggle) and nothing else competing with the note.

## Graph

A dedicated `/graph` page rendering the whole slipbox from a prebuilt `graph.json`.

- **d3-force** for layout, **canvas** for rendering — canvas holds up at several
  hundred nodes where SVG starts to stutter.
- Nodes coloured by type (reference / literature / permanent / MOC), sized by
  degree. Click navigates; hover labels. Zoom, pan, and filter by type.
- Guard against the hairball: sensible force tuning, labels only above a zoom
  threshold, and a note-count cap with a warning past it.
- Degrades gracefully — on small screens, a simplified view or a link back to the
  browsable index.

## Search

`search-index.json` (title, type, tags, excerpt, url) built alongside the site and
fetched on first use, so it costs nothing on page load. Roughly 100–300KB for a few
hundred notes. Client-side fuzzy matching over titles and excerpts; results grouped
by note type. Pure static, so it behaves the same locally and on GitHub Pages.

*(Semantic search via QMD was considered and deliberately left out: it would only
work locally, splitting behaviour between local and published sites.)*

## CLI & tools

```
slipbox serve [--port 3000] [--no-open]     # live-reloading local site
slipbox build [--out ./out] [--base-path /repo]
slipbox site:init                           # writes deploy config only
```

- **`serve`** watches the note directories; a write triggers a refresh in the open
  page. This is the "watch the agent work" loop.
- **`build`** produces a static export. `--base-path` matters for GitHub Pages
  *project* sites (served from `/<repo>/`), setting Next's `basePath` and
  `assetPrefix`.
- **`site:init`** writes only two small files — `vercel.json` and a GitHub Pages
  workflow. No app is scaffolded.
- **`slipbox_serve` tool** — the agent starts the server and hands back the URL,
  so it can say "watching at localhost:3000" mid-session.

## Deploying

Because the app isn't in the user's repo, the host builds it via the CLI:

**Vercel** — Build Command `npx slipbox build`, Output Directory `out`.
**GitHub Pages** — an Action that runs `npx slipbox build --base-path /<repo>` and
publishes `out/`.

`slipbox site:init` writes both. Each example slipbox gets the Pages workflow, so
`example-ai`, `example-odyssey`, and `example-sv-titans` become live demo sites —
useful proof at three different scales (40 papers, 24 books, ~180 essays).

## Build plan

| # | Milestone | Why |
| --- | --- | --- |
| 1 | **Runner spike** — Next running from the hidden working copy against `SLIPBOX_ROOT`, dev + export | De-risks the one uncertain piece before any UI work |
| 2 | Data layer — load, resolve wikilinks, derive backlinks (unit-tested) | Everything else reads from this |
| 3 | Design system + reference & literature templates | The core reading experience |
| 4 | Home feed, reference index, permanent + MOC templates | Completes navigation |
| 5 | Search index + UI | |
| 6 | Graph page | Heaviest UI piece, deliberately last |
| 7 | CLI (`serve`/`build`/`site:init`), live reload, `slipbox_serve` tool | Ties it together |
| 8 | Demo sites for the three examples | Proves it at real scale |

Milestones 3–4 need real notes to look at — worth running the pipeline over one
example first (the ai corpus is the fastest to generate a decent note set from).

## Open questions

- **Note count ceiling** before the graph and search index need pagination or
  chunking. Measure at milestone 6 with the sv-titans corpus.
- **Whether `.slipbox-site/` should live in the slipbox or an OS cache dir.** In
  the slipbox keeps everything self-contained and debuggable; a cache dir keeps the
  slipbox pristine. Decide during the spike.
