# Working state — updated 2026-07-24

Everything below is **merged to `main`**. The two feature branches
(`m2-source-formats`, `example-sv-titans`) are merged and can be deleted; this
folder is kept for the corpus fetch tooling and the portable memory copies.

## Where things stand

**Phase 1 is complete** — see `docs/plans/ROADMAP.md` for live status. The harness
ingests any source format (file or URL) and produces a linked note network:

- `slipbox_ingest` takes a `sources/` filename **or** an `https://` URL
- Formats: txt/md, PDF, epub/docx/html/odt/rtf, web articles, YouTube, audio,
  RSS/Atom (via `slipbox_feed`) — all tested end-to-end. See `docs/FORMATS.md`
- URL sources pin a **Wayback snapshot** (`archived`/`archived_date`)
- **One-shot mode**: `slipbox --yolo` (or `slipbox_ingest(yolo: true)`) runs the
  pipeline through without pausing; default is review-at-the-seams
- Example corpus repos are standardized on `example-*`

**Phase 2 (the localhost explorer) is next** and hasn't been started.

## Regenerating local corpus files

Each example is a submodule at `examples/<name>` — `git submodule update --init
--recursive` pulls them down, each a complete runnable slipbox. The scripts in
[`fetch/`](./fetch/README.md) are what *built* the sv-titans corpus; use them to
add more authors, not to restore it:

```
pip3 install --user trafilatura && export PATH="$HOME/.local/bin:$PATH"
docs/handoff/fetch/fetch-pg.sh       # 173 Paul Graham essays
docs/handoff/fetch/fetch-pdfs.sh     # Naval Almanack, pmarca archive, Bezos letters
docs/handoff/fetch/fetch-altman.sh   # 7 Sam Altman startup essays
```

## External tools

Required: **qmd** (`npm i -g @tobilu/qmd`, then `qmd pull`).
Per-format: pdftotext/pdfinfo (poppler), pandoc, trafilatura, yt-dlp, ffmpeg,
whisper. Run `slipbox_doctor` for an inventory. Full table in `docs/FORMATS.md`.

## Open items

- [ ] **Phase 2 explorer** — design + build together (next up).
- [ ] URL captures are double-indexed alongside `sources/extracted/` — search-only
      noise; the fix touches the locked single-collection design (`docs/FORMATS.md`).
- [ ] **sv-titans corpus: 9 of ~14 authors still to acquire.** Acquired: Paul
      Graham (173 essays), Naval, pmarca, Bezos letters, Sam Altman (7). The rest
      need hand-picked best-of selections; Thiel's CS183 and 37signals' *Getting
      Real* need non-JS mirrors. Status table in `examples/sv-titans/SOURCES.md`.
- [ ] sv-titans: run the pipeline over the corpus to generate its notes.
- [ ] Sam Altman's Startup Playbook (multi-page JS site) still to pull.

## Project memory

`memory/` holds copies of the auto-memory files (they normally live in
`~/.claude/projects/<slug>/memory/`, which doesn't travel with the repo). To restore
on another machine, copy them there.

## Session transcript

`session-transcript.jsonl` is git-ignored — a personal transcript shouldn't live in
the public repo's history. It exists only on the machine that generated it; move it
out-of-band (AirDrop/scp) if you want it elsewhere.
