# Permanent notes + the agent's "soul" — design

Status: **design, approved in principle** (2026-08-19). Phase 5 of the roadmap.
This spec covers two inseparable features: the **permanent-note authoring
workflow** and the **agent persona** that governs it.

## 1. Purpose

Help the author (the user) write **permanent notes**: atomic, evergreen ideas in
their *own* words, distilled from the literature notes they've accumulated.

The hard requirement, stated by the author: **slipbox does not generate permanent
notes on its own.** It helps the author create and write them. The agent's job is
to *find* where a permanent note is warranted and to *help the author compress*
the underlying literature notes into one — thinking alongside them, not for them.
The invariant outcome is a written permanent note in the author's voice.

### Non-goals

- No auto-generation: the agent never writes a permanent note the author didn't
  author. (Drafting is allowed *only* as an explicitly-requested starting point —
  see §4.)
- Not Maps of Content (Phase 4). A permanent note is one synthesized *idea*; a MOC
  is an *index* over many notes. Different feature, kept distinct.
- No change to how literature notes are produced (Phase 1 ingest is untouched).

## 2. Concepts and data model

**Permanent note** — sits *above* the literature notes and links *down* to them.
The literature notes stay exactly where they are as the evidence trail; nothing is
consumed, merged, or rewritten. A permanent note also links *across* to related
permanent notes.

Stored in the already-scaffolded `permanent-notes/` folder (see
`config/types.ts` — `permanent_notes` path already exists, is created on `/init`,
and is counted by `slipbox_status`; the explorer already ships a permanent-note
template). Frontmatter mirrors `writeLiterature` but points at notes instead of a
source:

```yaml
id: <id>                      # makeId(title, id_style), same as literature notes
type: permanent-note
title: <a single-sentence claim — the idea itself>
draws_on:                     # links DOWN to the literature notes synthesized
  - [[literature-notes/<id>]]
  - ...
links:                        # links ACROSS to related permanent notes
  - [[permanent-notes/<id>]]
sources:                      # OPTIONAL provenance convenience: union of the
  - [[references/<id>]]        #   draws_on notes' sources, derived at write time
tags: [ ... ]
created: <YYYY-MM-DD>
```

The body is the author's prose. `draws_on` is the load-bearing new relation:
it defines provenance *and* powers coverage tracking (§3).

**Coverage.** A literature note is "covered" when some permanent note's `draws_on`
includes it. Coverage is derived (read permanent-note frontmatter), never stored
on the literature note, so it stays a rebuildable view.

## 3. Discovery — `slipbox_gather`

One mechanical tool, three ways to seed it. It *retrieves and organizes*
literature notes into candidate groupings; it runs no LLM and writes no prose. The
agent calls it, then converses.

All three modes reduce to the same operation — *gather a coherent set of
literature notes* — over machinery that already exists (`pipeline/link.ts` already
computes averaged, normalized per-note vectors from the QMD index and a
note-to-note cosine graph).

| Author intent | Mode | Seed | Mechanism |
|---|---|---|---|
| "Gather what I have on *X*" | **concept-query** | a phrase | embed the phrase (QMD), cosine-rank literature notes, take the above-threshold set; optionally expand along their existing `links:` |
| "Where are notes piling up?" | **ambient / density** | (none) | find dense neighborhoods in the note-similarity graph / cluster the note vectors (reuse `pipeline/cluster.ts` average-linkage); rank by cohesion × size; **exclude already-covered** neighborhoods |
| "From these sources, what emerged?" | **source-scoped** | a source set | filter literature notes by `source:` frontmatter, then group the survivors by similarity |

**Input** (all optional; presence selects the mode):
- `query?: string` — concept-query seed.
- `sources?: string[]` — reference ids/links to scope to.
- `includeCovered?: boolean` (default false) — ambient mode hides covered
  neighborhoods unless set.
- `limit?: number` — max candidates to return.

**Output** — a list of candidates:
```ts
interface GatherCandidate {
  label: string;              // heuristic theme label from shared title terms
  members: Array<{ link: string; title: string }>;  // the literature notes
  cohesion: number;           // mean intra-set cosine (0..1)
  sources: string[];          // distinct references the members trace to
  coverage: "new" | "partial" | "covered";  // vs. existing permanent notes
}
```

The agent uses this to open the conversation ("These four notes converge on X —
want to write it up?"). Scoring/threshold defaults reuse the clustering config
already in `.slipbox` (`clustering.threshold`, `min_cluster_size`) so behavior is
consistent with ingest-time clustering and tunable per slipbox.

Edge cases: no literature notes yet → clear message; query matches nothing above
floor → say so, suggest broadening; a "cluster" of one → surface it but note it's
thin; everything already covered → say the slipbox is well-synthesized.

## 4. Authoring — persona-governed, `slipbox_write_permanent` to persist

Authoring is **conversational and author-governed**, not a wizard. The author
steers how much the agent writes vs. draws out, and the agent shifts between modes
as the idea firms up:

- **Scaffold & fill** — agent lays out the shared claim, each note's key point,
  tensions, and open questions; the author writes the prose.
- **Socratic interview** — agent asks what the author actually believes and
  assembles their answers into the note.
- **Draft & refine** — *only when explicitly asked*, agent proposes a full draft
  as a starting point for the author to rewrite.

These modes are **not tool code**. They live in the skill + persona (§5). The tool
surface is deliberately thin so the interaction stays flexible.

**`slipbox_write_permanent`** — the sibling of `writeLiterature` (in
`notes/write.ts`, add `writePermanent`). Inputs: `title`, `body` (author's prose),
`drawsOn: string[]` (literature-note links), optional `links` (related permanent
notes), `tags`, and `id` (to overwrite an existing permanent note). It:
1. writes the file to `permanent-notes/` with the frontmatter of §2 (deriving
   `sources` from the `drawsOn` notes' `source:` fields),
2. returns a `NoteRef` (id, path, link) like the other writers.

After writing, the agent runs `slipbox_reindex` + `slipbox_autolink` so the new
permanent note is embedded and cross-linked. **Autolink is extended** to also link
permanent notes to each other (currently literature-only): the same averaged-vector
cosine routine, run over `permanent-notes/` as a second pass. Literature→permanent
`draws_on` links are authored, not inferred.

## 5. The agent's "soul" (persona)

The persona and the authoring behavior are the same thing viewed from two sides:
the persona is what decides, in the moment, how much to write vs. draw out.

**Character:** a helpful, thorough research and writing assistant whose purpose is
to help the *author* think, research, and write — never to produce notes on its
own. Curious, rigorous about provenance, comfortable pushing back, allergic to
putting words in the author's mouth unless asked.

**Where it's encoded:**
- Primarily in the skill (`skills/slipbox/SKILL.md`) — a "Working with the author"
  section describing the character, the three authoring modes, and the cues for
  shifting between them (e.g. a hesitant author → Socratic; a confident one →
  scaffold; an explicit "just draft it" → draft). The skill is always loaded, so
  this is always in force.
- Reinforced by a concise **session-start persona note**, injected the same way
  the house style already is (`extension.ts` `context` event). Kept short; the
  skill carries the detail.

**Distinct from `houseStyle`.** `houseStyle` (the `.slipbox` body) governs note
*conventions* per slipbox. The persona governs the *agent's* character and is
product-level, shipped with `@slipbox/core`, not per-slipbox. A slipbox may still
tune tone via `houseStyle`; the persona is the floor.

> Implementation note: confirm during planning whether Pi exposes a dedicated
> system-prompt/persona hook or whether the session-start context injection (as
> used for house style today) is the right vehicle. Design intent is fixed; the
> exact Pi mechanism is to be verified against the SDK.

## 6. Architecture / where code lives

- `packages/core/src/pipeline/gather.ts` — the discovery engine (vector load +
  the three seeding modes + coverage). Reuses `qmd/vectors.ts` `readChunks` and
  `pipeline/cluster.ts`, mirroring `pipeline/link.ts`. Pure, unit-testable.
- `packages/core/src/tools/gather.ts` — `registerGather(pi)`; thin tool wrapper.
- `packages/core/src/notes/write.ts` — add `writePermanent()`.
- `packages/core/src/tools/write.ts` — add `registerWritePermanent(pi)` (mirrors
  the existing literature/reference writers).
- `packages/core/src/pipeline/link.ts` — extend `autolink` with a permanent-note
  pass (or a sibling `autolinkPermanent`).
- `packages/core/src/extension.ts` — register the two new tools; inject the
  persona note at `session_start`.
- `skills/slipbox/SKILL.md` — the "Working with the author" persona + modes;
  permanent-note workflow steps.
- Explorer (`@slipbox/web`) — permanent-note template already exists; verify it
  renders `draws_on` (down-links) and backlinks from covered literature notes.

## 7. Testing

- `gather.ts` pure functions: concept-query ranking, source filtering, coverage
  computation, cohesion scoring, label heuristic — unit tests with small synthetic
  vector/frontmatter fixtures (match `pipeline/cluster.test.ts` style).
- `writePermanent`: writes correct frontmatter, derives `sources` from `draws_on`,
  overwrite-by-id, round-trips through `parseFrontmatter`.
- autolink permanent pass: permanent notes cross-link, literature links untouched.
- Skill/persona behavior is prose, not unit-tested; validate by hand on the
  `example-ai` corpus (86 literature notes across 40 papers — a real substrate for
  all three discovery modes).

## 8. Open questions / future

- **Proactive surfacing.** The author asked for *author-initiated* discovery.
  Optionally, the agent could notice a dense, uncovered accumulation and offer to
  write it up. Deferred as a nicety; author-initiated is the default.
- **MOCs (Phase 4)** are separate but adjacent: once permanent notes exist, a MOC
  indexes them. Kept out of scope here.
- **Persona mechanism** — see §5 implementation note.
