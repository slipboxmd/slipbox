# Branding & CLI customization (goal + levers)

**Goal:** make the `slipbox` command feel like its own product, not "pi with an
extension." Customize the startup screen, banner, title, theme, footer, and
overall UX as much as Pi allows. This is an iterative, visual effort — we'll
refine it together over time.

Current state: launching `slipbox` still shows Pi's default header
(`pi v0.81.1 …`, "Pi can explain its own features…") plus `[Skills]`/`[Extensions]`
lists. Our extension loads as `<inline:slipbox>` and the skill loads. The terminal
tab still reads `π - …`.

## Levers available (from the Pi SDK, v0.81.1)

Confirmed in the type surface — things we CAN change:

- **Terminal/tab title** — `ctx.ui.setTitle("slipbox")` (already called on
  session_start; verify it wins over the terminal's own title).
- **Suppress the default startup header** — `quietStartup` setting
  (`SettingsManager.getQuietStartup/setQuietStartup`). If we launch with this on,
  Pi's `pi vX / escape interrupt / Pi can explain…` block is hidden, freeing the
  top of the screen for our own banner.
- **Custom welcome / banner** — on `session_start`, render our own Slipbox banner
  via `ctx.ui.setWidget(id, …)` or an initial message; `InteractiveModeOptions`
  also has `initialMessage` / `initialMessages`.
- **Footer** — `ctx.ui.setFooter((tui, theme) => …)` to show slipbox status
  (note counts, index freshness) instead of / alongside the default.
- **Status line & widgets** — `ctx.ui.setStatus`, `ctx.ui.setWidget`.
- **Theme** — Pi supports built-in + custom themes (`settings.theme`, theme
  packages). We can ship a Slipbox theme.
- **Working indicator / messages** — `ctx.ui.setWorkingMessage`,
  `setWorkingIndicator({ frames, intervalMs })` for a branded spinner.
- **Slash commands** — our own `/init`, `/tutor`, etc. already brand the command
  surface.

## Likely fixed (not exposed)

- The global config dir name stays `~/.pi/agent` (this is deliberate — it's what
  lets `slipbox` reuse the user's Pi login). So "branding" is UI-level, not a
  separate config home.
- Some internal `π` glyphs / core keybinding hints may not be individually
  themeable (but `quietStartup` removes the hint line).

## Proposed first pass (to do together)

1. Launch with `quietStartup` on (scoped to the slipbox session, not the user's
   global pi settings) and render a **Slipbox welcome banner** on session_start —
   name, one-line purpose, and "type `/tutor` to learn, `/init` to start."
2. Confirm `setTitle("slipbox")` takes effect for the tab.
3. Add a **footer** showing live slipbox status (note counts + index freshness).
4. Ship an optional **Slipbox theme**.
5. Branded **working indicator**.

Open question: how to enable `quietStartup` for our session only without mutating
the user's global `~/.pi/agent/settings.json` — likely via the `settingsManager`
we pass into `createAgentSessionServices`, or an in-memory settings override.
Needs a short spike against the SettingsManager API.
