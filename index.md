Hand slipbox a source — any format — and it does the tedious middle of the
Zettelkasten process for you: pull out the text, chunk it, group the ideas by
similarity, and draft **flat-markdown notes you own and can edit**. The markdown is
always the source of truth; the agent is just the automation on top.

It runs as a [Pi](https://pi.dev) harness and leans on your local tools rather than
reinventing them — [QMD](https://github.com/tobi/qmd) for indexing and search,
`pdftotext`/`pandoc`/`yt-dlp`/`whisper` for extraction — detecting and guiding, not
bundling.

> **Beta.** slipbox is early. It works end-to-end, but expect rough edges — and
> please [open an issue](https://github.com/slipboxmd/slipbox/issues) when you hit
> one.

## Install

```bash
npm install -g slipbox @tobilu/qmd
qmd pull            # one-time: download the local models
cd my-slipbox
slipbox             # opens the harness; use /init to scaffold a slipbox
```

## What it does

- **Any source → notes.** Books, PDFs, epubs, web articles, YouTube, podcasts,
  RSS — normalized to markdown, then chunked, embedded, clustered, and distilled
  into literature notes linked back to their source.
- **You stay in the loop.** The agent drafts; you keep, edit, or discard. Or run
  `slipbox --yolo` to let it work straight through.
- **Read it as a site.** `slipbox serve` renders your slipbox as a fast, readable
  local site — backlinks and provenance on every note, search, and an interactive
  graph of the whole network. `slipbox build` exports it as a static site for
  GitHub Pages or anywhere.
- **Flat markdown, always.** YAML frontmatter + `[[wikilinks]]`. Portable,
  git-friendly, yours. Any index is a rebuildable cache.

## Explore an example

Three example slipboxes, each a real corpus you can browse or clone:

- **[example-ai](https://github.com/slipboxmd/example-ai)** — 40 landmark AI/LLM
  papers, distilled into 86 cross-linked notes.
- **[example-odyssey](https://github.com/slipboxmd/example-odyssey)** — public-domain
  scholarship on Homer's *Odyssey*.
- **[example-sv-titans](https://github.com/slipboxmd/example-sv-titans)** — founder
  essays on building startups.

## Learn more

- **[Source on GitHub](https://github.com/slipboxmd/slipbox)** — the harness, the
  explorer, and the design docs.
- Built on flat markdown so nothing you write is ever locked in.
