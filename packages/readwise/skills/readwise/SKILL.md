---
name: slipbox-readwise
description: Use when pulling Readwise highlights into a slipbox and turning them into literature notes — including re-running as more highlights are added while reading. Explains the fetch → sync → note flow and the two readwise tools.
---

# Readwise → slipbox

Turn a Readwise source's highlights into slipbox literature notes, and keep doing
it incrementally as you read and highlight more.

You fetch highlights with the **`readwise` CLI directly** (that's what it's for);
the slipbox tools do the parts the CLI can't: writing the marked-up `sources/`
capture and reconciling highlights against the notes already written.

## Setup (once)

- Installed? `readwise --version`. If not: `npm install -g @readwise/cli`.
- Authed? If a command says to log in, ask the user for a token
  (https://readwise.io/access_token) and run `readwise login-with-token <token>`.
- The slipbox also needs QMD (for clustering) — `slipbox_doctor` checks it.

## The flow

**1. Find the source.** Get its Readwise id:
```bash
readwise readwise-list-books --json            # books & their ids
readwise reader-list-documents --location archive --json   # Reader docs
```

**2. Fetch its highlights to a file** (don't transcribe them yourself):
```bash
# a Readwise book:
readwise readwise-list-highlights --book-id <id> --page-size 1000 --json > /tmp/rw-<id>.json
# a Reader document:
readwise reader-get-document-highlights --document-id <id> --json > /tmp/rw-<id>.json
```

**3. Sync** — `slipbox_readwise_sync` with the file path + the source's title, id,
and (if you have them) author/category/url. It writes/updates the capture,
re-indexes, re-clusters ALL highlights, and returns a **plan**: clusters annotated
with what's NEW vs already-noted, and which existing notes relate.

**4. Act on the plan**, per each cluster's suggestion, with
`slipbox_readwise_write_note` (it records which highlight ids a note covers — its
provenance — which is what makes re-runs correct):

- **new** — write a fresh note (`action: create`). Title = one short sentence
  stating the idea; body EXPLAINS it in your own words, quoting highlights where
  apt. Pass `highlight_ids` = the cluster's ids and `source` = the reference link.
- **extend** — new highlights belong with an existing note. `action: update`,
  `note_id` = the related note, re-draft the body to fold in the new highlight,
  and pass the FULL set of highlight ids the note now covers.
- **split** — the grouping shifted across several notes. Read the highlights and
  decide: update one, split into more notes, or (if two notes now clearly belong
  together) merge them. Judge by how the highlights actually group.
- **settled** clusters aren't returned — nothing to do.

**5. Connect + summarize.** After writing/updating notes, run `slipbox_autolink`
to link them into the network, then `slipbox_write_reference_note` for the
source-level summary once enough notes exist.

## Re-running as you read

Just repeat steps 2–5. Because every note records its highlight ids and the sync
re-clusters everything, only genuinely new material shows up as `new`/`extend`;
what you've already noted comes back `settled` and is skipped. This is the "make
notes as I progress through a book" loop.

## Notes

- Highlights are short and dense; if the default clustering lumps distinct ideas
  together (or over-splits), tune `clustering.threshold` in `.slipbox`.
- Follow the slipbox house style for note prose. One idea per note.
