# Tools for thought — an example slipbox

A slipbox built from **essays on tools for thought, note-taking, and augmenting
the mind** — fittingly, a slipbox *about* the ideas behind slipboxes. It tests
the harness on **web articles** from many authors and sites, and whether linking
connects a lineage of ideas (Bush → Engelbart → hypertext → spaced repetition →
digital gardens).

**Format:** web pages (URLs). Needs the web/URL extractor (roadmap M2) — the
harness fetches each URL and writes a markdown capture into `sources/`, then
cleans it into `sources/extracted/`.

## What it covers

Canonical and modern essays on thinking tools: Vannevar Bush, Engelbart, Andy
Matuschak, Michael Nielsen, Bret Victor, gwern, Maggie Appleton, and more. See
[SOURCES.md](SOURCES.md).

## How it's built

```
# (once the web extractor lands)
slipbox
> ingest https://numinous.productions/ttft/
> …one per essay, then link + summarize
```

Each essay → a reference + literature notes; `slipbox_autolink` draws the
connections across authors and decades.

## Status

Sources tracked in [SOURCES.md](SOURCES.md). Blocked on the web/URL extractor (M2).
All sources are publicly readable on the open web.
