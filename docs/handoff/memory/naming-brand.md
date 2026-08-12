---
name: naming-brand
description: Project name + domain/npm/GitHub handles decided for the slipbox project
metadata: 
  node_type: memory
  type: project
  originSessionId: e37be9fc-7e8a-4183-9a47-02177ba68808
---

Project name: **slipbox** (kept the working name; all real-word .com/.dev/.io were
taken, .md is the opening and fits a markdown-native tool à la obsidian.md).

Decided handles (verified likely-available 2026-07-23, confirm at registrar/registry):
- **Domain: `slipbox.md`** (~$40–60/yr .md TLD).
- **npm CLI package: `@slipbox/cli`** → `npm install -g @slipbox/cli`, then run the
  `slipbox` command (it's the package's `bin`, so the command name is unchanged).
  (Revised 2026-08-12: the CLI was originally the unscoped `slipbox` package, but an
  unscoped name can't be authorized by a `@slipbox`-scope token — every publish
  needed an all-packages grant. Moving the CLI under the scope means one scope-level
  token covers the whole beta. `@slipbox/web@0.1.0` was already published under the
  old plan; only the name of the CLI package changed, not the command.)
- **npm library/add-on packages: `@slipbox/*`** (`@slipbox/core`, `@slipbox/web`,
  future `@slipbox/moc`, `@slipbox/writing`, …). The `@slipbox` org is claimed. The
  whole beta now lives under this one scope — there is no unscoped package.
- **GitHub org: `slipboxmd`** (matches the domain; bare `slipbox` org is taken;
  `getslipbox`/`slipbox-md` also free).

TODO (needs the user's accounts): register slipbox.md, create GitHub org `slipboxmd`,
create npm org `slipbox`. Then: point package.json repository/homepage at them, and
move the example corpora (e.g. odyssey/) into per-corpus repos under the org as git
submodules (keeps the main repo lean). See [[project-overview]].
