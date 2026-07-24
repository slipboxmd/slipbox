# Session handoff — 2026-07-24

Snapshot for picking up on another computer. Written mid-task; nothing here is
merged to `main`. Two feature branches hold the work.

## TL;DR — resume here

1. `git fetch && git checkout m2-source-formats` — review/merge the M2 source-format
   extractors (built + tested, see below).
2. `git checkout example-sv-titans` — the in-progress "Silicon Valley Titans"
   example corpus. Regenerate its git-ignored local sources with
   `docs/handoff/fetch/` (see that folder's README).
3. The open question when we stopped: **finish acquiring the 9 remaining authors** —
   I curate best-of per author and fetch (recommended) vs. you steer selections; and
   filter depth (generous ~25–40/author vs. lean ~15).

## Branch layout (none pushed yet — push to sync)

| Branch | Head | Contents | Pushed? |
|--------|------|----------|---------|
| `main` | 81d7915 | AI corpus + examples-ai submodule (last shared state) | yes (origin) |
| `m2-source-formats` | e13baa2 | M2 format extractors (PDF/epub/web/YouTube/audio/RSS) | **no — push to sync** |
| `example-sv-titans` | (this) | sv-titans scaffold + handoff | **no — push to sync** |

To move both to the other machine:
```
git push -u origin m2-source-formats
git push -u origin example-sv-titans
```
(origin = **public** github.com/slipboxmd/slipbox. No secrets in either branch;
raw corpus texts are git-ignored, not committed.)

---

## Track 1 — M2 source formats (branch `m2-source-formats`)

**Status: first pass built + tested; pending your review + merge to main.**

`slipbox_ingest` now accepts a `sources/` file OR an `https://` URL and dispatches
to per-format extractors (guide-don't-bundle: shell out to a CLI, fail with an
install hint if missing). New `slipbox_feed` tool triages RSS/Atom.

| Format | Tool | Tested |
|--------|------|--------|
| PDF | pdftotext + pdfinfo (poppler) | ✅ AI corpus |
| epub/docx/html/odt/rtf | pandoc | ✅ Alice epub |
| Web article (URL) | trafilatura | ✅ |
| YouTube (URL) | yt-dlp | ✅ transcript |
| RSS/Atom | native fetch | ✅ RSS + Atom |
| Audio/podcast | whisper (+ffmpeg) | ⚠️ built, **not run** (whisper not installed here) |

- New files: `packages/core/src/extract/{exec,pdf,doc,web,youtube,audio,rss,url}.ts`,
  `extract/extract.test.ts`, `tools/feed.ts`. Wired: `extract/index.ts`,
  `pipeline/ingest.ts`, `tools/ingest.ts`, `notes/write.ts` (writeSourceCapture),
  `env/detect.ts`, `extension.ts`. Docs: `docs/FORMATS.md`, SKILL, ROADMAP.
- Typecheck + 13 tests green.
- **Known issue for review:** URL sources write a `sources/<id>.md` capture that is
  double-indexed alongside `sources/extracted/` (search noise only; clustering /
  read-cluster / autolink filter to `extracted/`/`literature-notes/` so notes are
  clean). Fix = scope the QMD collection to content dirs OR relocate captures;
  deferred because it touches the locked single-collection design. See `docs/FORMATS.md`.
- **Deps installed on the old machine:** trafilatura (`~/.local/bin`, via
  `pip3 install --user`). pdftotext/pandoc/yt-dlp/ffmpeg already present. whisper NOT
  installed (audio path documented, untested).

## Track 2 — "Silicon Valley Titans" example (branch `example-sv-titans`)

**Status: scaffolded + 5 of ~14 authors acquired locally (uncommitted/git-ignored).**

A slipbox from founder/operator/investor essayists, **filtered to one theme:
building & running tech startups.** Off-theme work is cut per author.

Locked decisions (from AskUserQuestion this session):
- Roster: Core 8 + all four flavors (VCs, crypto-adjacent, dev-culture, Bezos
  letters) → ~14 authors. **Vitalik dropped** (corpus is crypto-protocol, off-theme).
  **Balaji refocused** (cut The Network State; keep his startup essays).
- Repo name: **`example-sv-titans`** (dir `examples/sv-titans`).
- Publishing: **public, commit raw texts** (user's call; I flagged copyright — most
  authors are living/copyrighted. NOTICE.md carries attribution).
- Depth: close-to-full canon per author, topic-filtered to startups.

Committed to the branch: `examples/sv-titans/{README,SOURCES,NOTICE}.md` + `.gitignore`.
`SOURCES.md` has the full roster, verified source URLs, keep/cut rubric, and a live
**Acquisition status** table.

Acquired locally (regenerate via `docs/handoff/fetch/` — see its README):
- **Paul Graham** — 173 essays (topic-filtered from 231; keep-list = `fetch/pg-keep.json`)
- **Naval Ravikant** — Almanack PDF (focus notes on the Wealth material)
- **Marc Andreessen** — pmarca Blog Archives PDF
- **Jeff Bezos** — shareholder letters 1997–2020 PDF
- **Sam Altman** — 7 core startup essays (Startup Playbook still TODO)

Remaining 9 authors (need hand-picked best-of; feeds only expose recent/off-theme):
Peter Thiel (CS183 — needs non-JS mirror), Ben Horowitz, Fred Wilson, Reid Hoffman,
Chris Dixon, Balaji, Joel Spolsky, patio11, 37signals (Getting Real chapters).

Endgame (mirrors the AI corpus flow): finish `sources/` → create
`slipboxmd/example-sv-titans` repo → push sources there → add as submodule at
`examples/sv-titans/sources` (keeps raw texts out of the main repo's history).

## Open tasks

- [ ] M2: your review + merge `m2-source-formats` → main (audio path still untested).
- [ ] M2: decide the capture double-index fix (collection scoping vs. relocate).
- [ ] sv-titans: acquire remaining 9 authors (curate best-of; Thiel/Getting Real mirrors).
- [ ] sv-titans: pull Sam Altman's Startup Playbook (multi-page JS site).
- [ ] sv-titans: create `slipboxmd/example-sv-titans` repo + submodule; run the pipeline
      over the corpus (needs M2 merged) to generate the notes.
- [ ] Flagged, not acted on: repo-name inconsistency — `example-odyssey` (singular)
      vs `examples-ai` (plural). Standardize? (sv-titans uses `example-` singular.)
- [ ] Optional: install whisper on the new machine to test the audio extractor.

## Project memory

Copied from `~/.claude/.../memory/` into `docs/handoff/memory/` (machine-specific
location, so it's bundled here for portability). Key files: `project-overview.md`,
`working-style.md`, `naming-brand.md`, `branding-goal.md`, `tutor-direction.md`.
On the new machine these live under
`~/.claude/projects/<slug>/memory/` — copy them there to restore auto-memory.

## Session transcript

`docs/handoff/session-transcript.jsonl` (~10 MB) is in this folder but **git-ignored**
(a personal transcript shouldn't go into the public repo's history). To carry it to
the other machine, transfer it out-of-band (AirDrop / cloud / scp) — it won't sync
via `git pull`. If you'd rather have it in git anyway, `git add -f` it.
