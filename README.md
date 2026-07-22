# pi-slipbox

A [Pi](https://pi.dev) harness for building and maintaining a **Zettelkasten
slipbox** from any source — automatically. Point it at a book, article, YouTube
video, podcast, or PDF and the agent chunks it, embeds it, clusters the ideas by
similarity, and grows a network of **flat-markdown** notes: references,
reference notes, literature notes, permanent notes, and maps of content.

> Status: **early scaffolding / planning.** See [docs/PROJECT.md](docs/PROJECT.md)
> for the vision and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for open
> design questions.

## What it is

`pi-slipbox` is distributed on npm as a **Pi package**: a bundle of custom
tools, a skill, and a config convention that turns the Pi coding agent into a
librarian for your personal knowledge base. Everything it produces is plain
markdown you own — the agent is just the automation on top.

- **Flat markdown is the source of truth.** Every note is a `.md` file with
  YAML frontmatter and `[[wikilinks]]`. Any derived index is a disposable cache.
- **The harness manages the process.** Given a source, it runs the ingestion
  pipeline and drafts notes for you to keep, edit, or discard.
- **Minimal core, local tools.** The harness stays small and leans on your local
  environment. Indexing, embedding, and search are delegated to
  [QMD](https://github.com/tobi/qmd); extraction leans on CLIs like `pandoc`,
  `yt-dlp`, `ffmpeg`, and `whisper`. Nothing heavy is bundled — the harness
  detects what's installed and walks you through the rest.
- **Configured by a `.slipbox` file** — the slipbox equivalent of `CLAUDE.md`:
  where notes live, how to talk to QMD, clustering settings, and house style.

## Note types (Zettelkasten)

| Type | What it is |
| --- | --- |
| **Reference** | A source you ingested (the book/article/video itself) + bibliographic metadata. |
| **Reference note** | Your bibliographic-level summary of a whole source. |
| **Literature note** | An atomic idea captured from a source, in your own words, linked to the reference. |
| **Permanent note** | A refined, self-contained idea connected into the wider network — the heart of the slipbox. |
| **Map of Content (MOC)** | An index note that gathers and summarizes a cluster of notes on a topic. |

## Quickstart (planned)

```bash
# Install Pi and QMD (the local index/search engine)
npm install -g @earendil-works/pi-coding-agent @tobilu/qmd
# macOS: brew install sqlite   # QMD needs Homebrew SQLite

# Add the slipbox harness to a knowledge-base directory
cd my-slipbox
pi install npm:pi-slipbox        # or add to .pi/settings.json "packages"

# Configure the slipbox
$EDITOR .slipbox

# Run pi and hand it a source (the agent checks tools + walks you through gaps)
pi
> ingest ~/books/how-to-take-smart-notes.epub
```

## Repository layout

```
src/               Pi extension: custom tools + commands (TypeScript)
  extension.ts     Entry point — registers tools with the Pi ExtensionAPI
skills/            Pi skills (SKILL.md) teaching the Zettelkasten workflow
docs/              Vision, architecture, Pi harness reference, .slipbox spec
examples/          An example .slipbox config and a sample slipbox layout
```

## Documentation

- [docs/PROJECT.md](docs/PROJECT.md) — vision and scope (the 5 phases)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — pipeline design + open questions
- [docs/SLIPBOX_SPEC.md](docs/SLIPBOX_SPEC.md) — the `.slipbox` config file
- [docs/PI_HARNESS_REFERENCE.md](docs/PI_HARNESS_REFERENCE.md) — how Pi extensions/tools/skills/packages work
