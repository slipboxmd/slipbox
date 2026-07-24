---
name: branding-goal
description: The user wants to heavily customize/brand the slipbox CLI UI (not look like plain Pi)
metadata: 
  node_type: memory
  type: project
  originSessionId: e37be9fc-7e8a-4183-9a47-02177ba68808
---

The user wants the `slipbox` CLI to feel like its own product, not "pi with an
extension" — customize the startup banner, header, terminal title, theme, footer,
working indicator, and overall UX **as much as Pi allows**. This is an ongoing,
iterative visual effort to do together.

Known levers (Pi SDK 0.81.1): `ctx.ui.setTitle`, `quietStartup` setting (hide
Pi's default header), `ctx.ui.setWidget`/`setFooter`/`setStatus` for a custom
banner/footer, custom themes, branded working indicator, and our own slash
commands. The global config dir stays `~/.pi/agent` (that's what enables Pi login
reuse). Full plan + first-pass proposal in `docs/plans/BRANDING.md`. See
[[project-overview]].
