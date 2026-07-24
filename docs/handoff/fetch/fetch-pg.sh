#!/bin/zsh
# Fetch the 173 topic-filtered Paul Graham essays (keep-list in pg-keep.json).
# Portable: resolves paths from the repo root + this script's dir. Needs trafilatura.
export PATH="$HOME/.local/bin:$PATH"
HERE="${0:A:h}"
ROOT="$(git rev-parse --show-toplevel)"
OUT="$ROOT/examples/sv-titans/sources/paul-graham"
mkdir -p "$OUT"
ok=0; fail=0
python3 -c 'import json,sys;[print(e["slug"],e["url"]) for e in json.load(open(sys.argv[1]))]' "$HERE/pg-keep.json" | while read slug url; do
  f="$OUT/$slug.md"
  [ -s "$f" ] && { ok=$((ok+1)); continue; }
  if trafilatura -u "$url" --output-format markdown --with-metadata >"$f" 2>/dev/null && [ -s "$f" ]; then
    ok=$((ok+1))
  else
    rm -f "$f"; fail=$((fail+1)); echo "FAIL $slug $url" >>"$OUT/../pg-failures.log"
  fi
  sleep 0.25
done
echo "PG done: $(ls "$OUT" | grep -c '\.md$') files"
