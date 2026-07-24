---
name: tutor-direction
description: "The /tutor command should teach THIS slipbox tool, not Zettelkasten theory"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e37be9fc-7e8a-4183-9a47-02177ba68808
---

The `/tutor` command must teach how to use **this Slipbox tool** — its commands
(`/init`, `/tutor`), its `slipbox_*` tools, and the concrete workflow of this
harness — NOT Zettelkasten/slipbox theory in general. Assume the user knows the
gist; spend the lesson on the software, hands-on, on their real slipbox.

**Why:** the first version leaned too conceptual ("what is a Zettelkasten"); the
user wants tool-specific, practical teaching.

**How to apply:** keep expanding `packages/core/src/commands/tutor.ts` toward
running the real tools and narrating their output; consider moving the curriculum
into a dedicated bundled tutorial resource so it stays in sync with the tools.
Plan in `docs/plans/TUTOR.md`. See [[project-overview]].
