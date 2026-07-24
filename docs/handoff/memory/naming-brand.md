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
- **npm CLI (what users install): `slipbox`** — unscoped, FREE → `npm install -g slipbox`.
  (`slipbox@slipbox` is NOT a thing — that's pkg@version syntax.)
- **npm library/add-on packages: `@slipbox/*`** (`@slipbox/core`, future `@slipbox/moc`,
  `@slipbox/writing`, …). The `@slipbox` scope/org appears unclaimed → create the npm
  org "slipbox". Our monorepo already uses `@slipbox/core`, so no code changes.
- **GitHub org: `slipboxmd`** (matches the domain; bare `slipbox` org is taken;
  `getslipbox`/`slipbox-md` also free).

TODO (needs the user's accounts): register slipbox.md, create GitHub org `slipboxmd`,
create npm org `slipbox`. Then: point package.json repository/homepage at them, and
move the example corpora (e.g. odyssey/) into per-corpus repos under the org as git
submodules (keeps the main repo lean). See [[project-overview]].
