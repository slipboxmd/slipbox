# @slipbox/web

The Slipbox explorer — a Next.js site for reading and navigating a slipbox, and
exporting it as a static site.

```
slipbox serve      # http://localhost:3000, live-reloads as notes are written
slipbox build      # -> ./out, deployable to Vercel, GitHub Pages, anywhere
slipbox site:init  # write vercel.json + a GitHub Pages workflow
```

Nothing is scaffolded into your slipbox. The app ships inside this package and
runs from a hidden working copy (`.slipbox-site/`, gitignored) pointed at your
notes via `SLIPBOX_ROOT`.

See [`docs/plans/PHASE2_EXPLORER.md`](../../docs/plans/PHASE2_EXPLORER.md) for the
design.

## Layout

- `site/` — the Next app template (App Router, `output: 'export'`)
- `src/` — the data layer (load, links, markdown, indexes) plus the
  serve/build/deploy entry points the CLI calls
