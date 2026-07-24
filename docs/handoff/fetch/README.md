# Regenerating the sv-titans local sources

The raw source texts under `examples/sv-titans/sources/` are **git-ignored** (kept
out of the public `slipboxmd/slipbox` history; they'll live in the
`slipboxmd/examples-sv-titans` submodule once complete). So on a fresh checkout,
`sources/` is empty — regenerate the already-acquired 5 authors with these scripts.

## Prereq

`trafilatura` on PATH (web→markdown extractor):

```
pip3 install --user trafilatura      # lands in ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
```

## Run (from anywhere inside the repo)

```
chmod +x docs/handoff/fetch/*.sh
docs/handoff/fetch/fetch-pg.sh        # 173 Paul Graham essays (~4 min, polite)
docs/handoff/fetch/fetch-pdfs.sh      # Naval Almanack, pmarca archive, Bezos letters
docs/handoff/fetch/fetch-altman.sh    # 7 Sam Altman startup essays
```

That restores everything acquired so far. `pg-keep.json` is the 173-essay keep-list
(topic-filtered from PG's 231); the 58 cut essays are listed in the session notes.

## Still to acquire (9 authors)

Not scripted yet — these need hand-picked best-of selections (see
`examples/sv-titans/SOURCES.md` → Acquisition status). Thiel's CS183 and 37signals'
Getting Real also need non-JS mirrors.
