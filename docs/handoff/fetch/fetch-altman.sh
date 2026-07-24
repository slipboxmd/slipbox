#!/bin/zsh
# Fetch Sam Altman's on-theme startup essays (his feed only exposes recent AI posts;
# these are the older startup canon, by known slug). Needs: trafilatura on PATH.
export PATH="$HOME/.local/bin:$PATH"
ROOT="$(git rev-parse --show-toplevel)"
OUT="$ROOT/examples/sv-titans/sources/sam-altman"
mkdir -p "$OUT"
pairs=(
 "https://blog.samaltman.com/how-to-be-successful|how-to-be-successful"
 "https://blog.samaltman.com/what-i-wish-someone-had-told-me|what-i-wish-someone-had-told-me"
 "https://blog.samaltman.com/idea-generation|idea-generation"
 "https://blog.samaltman.com/how-to-invest-in-startups|how-to-invest-in-startups"
 "https://blog.samaltman.com/researchers-and-founders|researchers-and-founders"
 "https://blog.samaltman.com/the-strength-of-being-misunderstood|strength-of-being-misunderstood"
 "https://blog.samaltman.com/productivity|productivity"
)
for pair in "${pairs[@]}"; do
  url="${pair%%|*}"; slug="${pair##*|}"
  trafilatura -u "$url" --output-format markdown --with-metadata >"$OUT/$slug.md" 2>/dev/null
  [ -s "$OUT/$slug.md" ] && [ $(wc -c <"$OUT/$slug.md") -gt 400 ] || rm -f "$OUT/$slug.md"
  sleep 0.3
done
echo "Altman: $(ls "$OUT" | wc -l | tr -d ' ') files"
# TODO: Startup Playbook (playbook.samaltman.com) is a multi-page JS site — pull separately.
