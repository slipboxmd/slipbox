# @slipbox/core

The core [Slipbox](../../README.md) harness — a [Pi](https://pi.dev) package that
turns any source into a flat-markdown Zettelkasten. It owns the ingestion
pipeline (extract → chunk/embed/index via [QMD](https://github.com/tobi/qmd) →
cluster → write notes), note management, linking, and search. Most Slipbox
functionality lives here; ecosystem packages (MOCs, writing, study, spaced
repetition, the explorer web app) build on top of it.

Distributed on npm as a Pi package (`pi.extensions` + `pi.skills`), so a Pi user
adds it to a slipbox directory and hands the agent a source.

## Status

Early: scaffold + a registered `slipbox_status` stub. The Phase-1 pipeline is
being built per [`../../docs/plans/PHASE1.md`](../../docs/plans/PHASE1.md).

## Install (planned)

```bash
npm install -g @earendil-works/pi-coding-agent @tobilu/qmd
pi install npm:@slipbox/core
```

## Layout

```
src/          Pi extension: custom tools + commands (TypeScript)
  extension.ts  Entry point — registers tools with the Pi ExtensionAPI
skills/       Pi skills (SKILL.md) teaching the Zettelkasten workflow
examples/     An example .slipbox config
```

## Docs

Design and plans live at the repo root under
[`docs/`](../../docs/): `ARCHITECTURE.md`, `SLIPBOX_SPEC.md`,
`PI_HARNESS_REFERENCE.md`, and `docs/plans/` (`PHASE1.md`, `SPIKE_QMD.md`,
`MONOREPO.md`).
