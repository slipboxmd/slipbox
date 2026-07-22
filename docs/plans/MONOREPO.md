# Monorepo direction

`slipbox-harness` will become a **pnpm + turbo monorepo** (same toolchain as the
sibling `../prometheus`). One repo, many independently-publishable npm packages,
each installable as a Pi package. Rationale: most functionality lives in **core**,
but the slipbox is a substrate other capabilities plug into — and eventually users
should be able to build and distribute their **own** packages for how they use
their slipbox.

## Package map

```
slipbox-harness/               # monorepo root (pnpm-workspace.yaml, turbo.json)
  packages/
    core/        @slipbox/core     # THE core: ingestion pipeline + note mgmt + search
                                   #   config, env-detect/guide, QMD client + vector read,
                                   #   extraction, clustering, literature/reference notes,
                                   #   linking/"mapping", the slipbox Pi extension + skill
    # ── future satellite packages (each a Pi package that operates on a slipbox) ──
    moc/         @slipbox/moc      # Maps of Content generation (Phase 4 candidate to split)
    writing/     @slipbox/writing  # writing process on top of the slipbox
    study/       @slipbox/study    # turn a slipbox into a study guide
    srs/         @slipbox/srs      # generate spaced-repetition cards
  apps/
    web/         @slipbox/web      # explorer-style localhost site (Phase 2)
```

Nothing outside `core/` exists yet — the map is the intended shape so we make
boundaries deliberately, not the current state.

## What is definitely core

Per the project owner: **processing sources → literature notes + reference notes,
and the linking/"mapping" between them is all core.** Search and curation of the
slipbox are core. The `.slipbox` format, note frontmatter schema, QMD
orchestration, and vector/cluster utilities are core (and likely re-exported as
the shared library that satellites build on).

## What becomes a separate package (later)

Capabilities that *consume* a built slipbox rather than *build* it:
- **MOC generation** — grouping notes into a topic map (may split from core at P4).
- **Writing** — a drafting/argumentation workflow that pulls from the slipbox.
- **Study guides** and **spaced-repetition cards** — learning outputs.
- **Explorer web app** — the Phase-2 rendering site (an `app`, not a lib).
- **User/community packages** — the end goal: a plugin ecosystem where people
  publish packages for their own slipbox workflows and install them like any Pi
  package.

## Shared library boundary

`@slipbox/core` should expose a stable programmatic surface (slipbox discovery,
note read/write with typed frontmatter, wikilink graph, QMD client, vector read)
that satellite packages import — so `@slipbox/srs` et al. never re-implement the
format. Keep this surface small and versioned. Extract a dedicated
`@slipbox/kit`/`@slipbox/sdk` only if the core-vs-consumer split demands it;
don't over-fragment early.

## Tooling

- **pnpm workspaces** (`pnpm-workspace.yaml`: `packages/*`, `apps/*`).
- **turbo** (`turbo.json`) for `build`/`lint`/`test`/`typecheck` across packages.
- Each package: its own `package.json` with a `pi` field (extensions/skills) where
  it ships Pi resources; scoped name `@slipbox/*` (resolves ARCHITECTURE O7).
- Root holds shared tsconfig base, workspace config, and CI.

## Migration (proposed next step, before M0 code)

Cheapest to restructure now while only scaffolding + docs exist:
1. Add root `pnpm-workspace.yaml` + `turbo.json` + root `package.json` (private).
2. `git mv` current `src/`, `skills/`, `examples/`, `package.json`, `tsconfig.json`
   into `packages/core/` (preserve history).
3. Rename the package `@slipbox/core`; keep the `pi` field pointing at its
   extension + skill.
4. Keep `docs/` and `LICENSE` at the root (repo-wide).
5. `README.md` at root becomes the monorepo overview; `packages/core/README.md`
   documents the core package.
