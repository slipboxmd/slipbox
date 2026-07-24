#!/bin/zsh
# Re-download the three bulk PDFs of the sv-titans corpus.
set -e
ROOT="$(git rev-parse --show-toplevel)"
S="$ROOT/examples/sv-titans/sources"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605 slipbox-corpus"
mkdir -p "$S/naval-ravikant" "$S/marc-andreessen" "$S/jeff-bezos"
curl -sL -A "$UA" "https://navalmanack.s3.amazonaws.com/Eric-Jorgenson_The-Almanack-of-Naval-Ravikant_Final.pdf" -o "$S/naval-ravikant/almanack-of-naval.pdf"
curl -sL -A "$UA" "https://a16z.com/wp-content/uploads/2021/08/The-pmarca-Blog-Archives.pdf" -o "$S/marc-andreessen/pmarca-blog-archives.pdf"
curl -sL -A "$UA" "https://bettertomorrowfinancial.com/wp-content/uploads/2021/04/jeff-bezos-amazon-shareholder-letters-1997_2020.pdf" -o "$S/jeff-bezos/shareholder-letters-1997-2020.pdf"
for f in naval-ravikant/almanack-of-naval.pdf marc-andreessen/pmarca-blog-archives.pdf jeff-bezos/shareholder-letters-1997-2020.pdf; do
  printf "%-50s %s\n" "$f" "$(file -b "$S/$f" | cut -c1-24)"
done
