# Slipbox

A [Pi](https://pi.dev) harness for building and maintaining a **Zettelkasten
slipbox** from any source — automatically. Point it at a book, article, YouTube
video, podcast, or PDF and the agent chunks it, embeds it, clusters the ideas by
similarity, and grows a network of **flat-markdown** notes: references, reference
notes, literature notes, permanent notes, and maps of content.

Everything it produces is plain markdown you own — the agent is just the
automation on top. It stays minimal and leans on your local environment:
indexing/embedding/search go through [QMD](https://github.com/tobi/qmd), and
extraction uses local CLIs (`pandoc`, `yt-dlp`, `ffmpeg`, `whisper`), all detected
and guided rather than bundled.

> Status: **early scaffolding / planning.** See [docs/PROJECT.md](docs/PROJECT.md)
> for the vision and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Monorepo

This is a **pnpm + turbo monorepo**. Most functionality lives in the core
package; ecosystem packages (and, later, community packages) build on top of it.
See [docs/plans/MONOREPO.md](docs/plans/MONOREPO.md).

```
packages/
  core/     @slipbox/core   The harness: ingest → notes → search (Pi extension + skill)
  cli/      slipbox         Standalone `slipbox` command (branded Pi launcher)
apps/                        (future) explorer web app
docs/                        Vision, architecture, Pi reference, plans
```

**Two ways to use it:**
1. **Standalone** — `npm i -g slipbox`, then run `slipbox` in any folder. It
   launches a Pi-powered TUI preloaded with the slipbox tools + skill and reuses
   your existing Pi login. Use `/init` to scaffold a folder into a slipbox.
2. **As a Pi package** — add `@slipbox/core` to a project's `.pi/settings.json`
   and drive it from your own `pi` session (see `examples/demo-slipbox`).

Planned ecosystem packages (not built yet): `@slipbox/moc` (maps of content),
`@slipbox/writing`, `@slipbox/study` (study guides), `@slipbox/srs` (spaced
repetition), and `@slipbox/web` (explorer site).

## Note types (Zettelkasten)

| Type | What it is |
| --- | --- |
| **Reference** | A source you ingested (the book/article/video itself) + bibliographic metadata. |
| **Reference note** | Your bibliographic-level summary of a whole source. |
| **Literature note** | An atomic idea captured from a source, in your own words, linked to the reference. |
| **Permanent note** | A refined, self-contained idea connected into the wider network — the heart of the slipbox. |
| **Map of Content (MOC)** | An index note that gathers and summarizes a cluster of notes on a topic. |

## Develop

```bash
pnpm install
pnpm build        # turbo build across packages
pnpm typecheck
pnpm test
```

Per-package work lives under `packages/*`; see
[`packages/core/README.md`](packages/core/README.md).

## Quickstart (planned)

```bash
# Install Pi and QMD (the local index/search engine)
npm install -g @earendil-works/pi-coding-agent @tobilu/qmd
# macOS: brew install sqlite   # QMD needs Homebrew SQLite

cd my-slipbox
pi install npm:@slipbox/core     # or add to .pi/settings.json "packages"
$EDITOR .slipbox                 # configure the slipbox

pi
> ingest ~/books/how-to-take-smart-notes.epub
```

## Documentation

- [docs/PROJECT.md](docs/PROJECT.md) — vision and scope (the 5 phases)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — pipeline design + decisions
- [docs/SLIPBOX_SPEC.md](docs/SLIPBOX_SPEC.md) — the `.slipbox` config file
- [docs/PI_HARNESS_REFERENCE.md](docs/PI_HARNESS_REFERENCE.md) — how Pi extensions/tools/skills/packages work
- [docs/plans/](docs/plans/) — `PHASE1.md`, `SPIKE_QMD.md`, `MONOREPO.md`
