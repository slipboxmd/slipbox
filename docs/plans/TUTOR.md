# /tutor — plan

**Goal:** `/tutor` should teach how to use **this Slipbox tool** — its commands,
its `slipbox_*` tools, and the concrete end-to-end workflow of THIS harness — not
Zettelkasten/slipbox theory in the abstract. Assume the user gets the general
idea; spend the time on the software.

## Status

First pass done (`packages/core/src/commands/tutor.ts`): the tutor prompt now
leads with orientation (`slipbox_status` + reading the `.slipbox` file), the
commands, and a hands-on `ingest → review clusters → write notes → search` tour
on the user's real slipbox, with only a sentence of concept where needed.

## To expand (later, together)

- **Deepen the hands-on**: have the tutor actually run each tool on a sample and
  narrate the output (what a cluster looks like, what a good vs. weak literature
  note looks like *in this system*, where files land, how links render).
- **Cover the mechanics that are unique to us**: the `.slipbox` config + house
  style, flat-markdown layout, how QMD indexing/embedding/clustering works at a
  high level, step-by-step vs. one-shot ingestion, `slipbox_doctor` + external
  tools, `slipbox_reindex` after hand edits.
- **Consider a dedicated tutorial resource** (a `TUTORIAL.md` bundled in core, or
  a `slipbox-tutor` skill) that the command points the agent at, so the
  curriculum stays in sync with the actual tools instead of living in one big
  inline prompt. Keeps it maintainable as the toolset grows.
- **Tracks / topics**: `/tutor ingest`, `/tutor notes`, `/tutor search`,
  `/tutor moc` (once MOCs exist) so users can learn one piece at a time. The
  command already accepts a free-text focus argument.
- Keep it adaptive and short; never a wall of text.
