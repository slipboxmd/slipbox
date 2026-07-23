# Diary of a CEO — a podcast example slipbox

A slipbox built from the **_Diary of a CEO_ podcast** — a stress test for the
harness on **a large audio/RSS corpus**: hundreds of episodes, each a source whose
"content" is a transcript. It tests the collection pattern (feed → one source per
episode) and whether linking connects recurring themes and guests across a big,
spoken-word corpus.

**Format:** RSS / podcast (audio → transcript). Needs the podcast/RSS extractor
(roadmap M2): parse the feed → per episode, get the transcript (yt-dlp / whisper)
→ write a `sources/<episode>.md` capture (episode link + metadata + transcript) →
extract.

## What it covers

Every episode of the show (via its public RSS feed). See [SOURCES.md](SOURCES.md).

## Repo-size note

This corpus is **large** (hundreds of episodes). The repo tracks only the **feed
reference + config** — the generated per-episode `sources/*.md` captures and the
`.qmd/` index are **not committed** (gitignored). It's a "run it yourself"
example; we may commit a small sample of notes once it's built.

## How it's built

```
# (once the RSS/podcast extractor lands)
slipbox
> ingest <podcast RSS feed URL>          # fans out to one source per episode
> …then link + summarize
```

## Status

Blocked on the RSS/podcast extractor (M2). Feed URL to be filled in
[SOURCES.md](SOURCES.md). Consider a smaller show first to validate the pipeline
before a hundreds-of-episodes run.
