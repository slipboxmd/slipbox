# @slipbox/readwise

A [Readwise](https://readwise.io) source for [slipbox](https://slipbox.md): pull
highlights from a book or article into `sources/`, then turn them into literature
notes — **incrementally**, so you can keep making notes as you read and highlight
more.

It's an **optional add-on** package, not part of `@slipbox/core`. Install it into a
slipbox that uses Pi and it registers two tools plus a skill.

## How it works

You fetch highlights with the **`readwise` CLI directly** (it already does that
well); this package does the slipbox-specific parts:

1. **Capture** — writes `sources/<slug>.md`: the source's metadata + every
   highlight as a blockquote, each tagged with a stable `<!-- rw:<id> -->` marker.
2. **Sync + reconcile** — re-indexes and re-clusters *all* highlights, then compares
   the clusters against the notes you've already written (each note records the
   Readwise highlight ids it came from). It returns a plan marking each cluster
   **new / extend / split / settled** so the agent knows whether to create a note,
   grow one, split, or skip.
3. **Write** — creates or updates literature notes, stamping their highlight
   provenance so the next sync stays correct.

Because the grouping of highlights drives the decision, re-running as you add
highlights does the right thing: only genuinely new material becomes new or
extended notes; already-noted highlights come back settled.

## Use

Load the skill (`slipbox-readwise`) and let the agent drive it — the flow is:
`readwise … --json > file` → `slipbox_readwise_sync` → act on the plan with
`slipbox_readwise_write_note` → `slipbox_autolink`. See
[`docs/plans/READWISE.md`](../../docs/plans/READWISE.md) for the design.

## Tools

- `slipbox_readwise_sync` — capture + index + cluster + reconcile → note plan.
- `slipbox_readwise_write_note` — write/update a literature note with highlight
  provenance (`action: create | update`).
