# Silicon Valley Titans — source corpus

A slipbox built from the writing of people known as much for their **ideas about
building companies** as for the companies themselves. The corpus is deliberately
**focused on one theme: building and running technology startups** — founding,
product, growth, hiring, management, fundraising, strategy, and operations.

## Curation rubric

**Keep** — writing that helps you build or run a startup:
founding & ideas, product & users, growth & distribution, hiring & team,
management & leadership, fundraising & investors, strategy & moats, company
operations & scaling, startup economics.

**Cut** — an author's off-theme work, even when it's famous:
- Naval → the *Happiness / health / philosophy* material (keep *Wealth*)
- Balaji → *The Network State* and crypto-governance/political theory (keep his startup/founder essays)
- Paul Graham → the Lisp / programming-language / painting / essay-craft pieces (keep startups & founders)
- Vitalik → cryptography & protocol design (**dropped** — almost nothing survives the filter)
- Chris Dixon → pure token/crypto-market theory (keep product, marketplaces, strategy)
- Everyone → politics, personal, media/culture tangents

The point is a tight, high-signal network where notes from Bezos on long-term
thinking link cleanly to Horowitz on hard decisions and PG on default-alive —
not a diffuse "collected works."

## Roster & sourcing

Legend — **Ingest:** how the source reaches the slipbox (via the M2 pipeline):
`text` = markdown/txt file · `pdf` = PDF file · `web` = URL fetched by the web extractor.

| # | Author | On-theme focus | Source of record | Ingest | ~docs |
|---|--------|----------------|------------------|--------|------:|
| 1 | **Paul Graham** | startups, founders, ideas, growth | `ofou/graham-essays` (Markdown mirror), filtered by topic | text | ~90 |
| 2 | **Naval Ravikant** | wealth creation, leverage, startups | *Almanack* — **Wealth** section (free PDF) + nav.al startup posts | pdf + web | ~25 |
| 3 | **Marc Andreessen** | the pmarca startup/hiring/big-co guides | *The pmarca Blog Archives* (a16z PDF) + "Software Is Eating the World" | pdf + web | ~35 |
| 4 | **Sam Altman** | Startup Playbook + founder essays | blog.samaltman.com + playbook.samaltman.com | web | ~25 |
| 5 | **Peter Thiel** | CS183 startup lectures (monopolies, last-mover) | Blake Masters' 19 class-note essays | web | ~19 |
| 6 | **Ben Horowitz** | CEO/management, hard decisions, scaling | a16z blog (the posts behind *The Hard Thing*) | web | ~25 |
| 7 | **Fred Wilson** | startup finance, fundraising, boards | avc.com — **MBA Mondays** series + best-of | web | ~40 |
| 8 | **Reid Hoffman** | blitzscaling, network effects, hiring | reidhoffman.org / LinkedIn essays | web | ~15 |
| 9 | **Chris Dixon** | products, marketplaces, network effects, strategy | cdixon.org (topic-filtered) | web | ~30 |
| 10 | **Balaji Srinivasan** | founding, tech trends, startup engineering | startup/founder essays only (**not** Network State) | web | ~12 |
| 11 | **Joel Spolsky** | running a software company, hiring, product, PM | Joel on Software classics | web | ~40 |
| 12 | **patio11 (Patrick McKenzie)** | SaaS ops, pricing, growth, careers | kalzumeus.com + blog | web | ~20 |
| 13 | **37signals (Fried / DHH)** | building & running a software company | *Getting Real* (free, full) + Signal v. Noise best-of | text + web | ~30 |
| 14 | **Jeff Bezos** | operating & scaling, long-term thinking | Amazon shareholder letters 1997–2021 | pdf | ~24 |

**Dropped after the topic filter:** Vitalik Buterin (corpus is crypto-protocol /
governance, not startup operations).

Estimated total: **~430 documents.** Daily-blogger counts (Fred Wilson, Joel,
patio11, Ben Horowitz, Chris Dixon) are curated best-of, not full archives.

## Source URLs (verified 2026-07)

- Paul Graham essays (Markdown): https://github.com/ofou/graham-essays · index: https://paulgraham.com/articles.html
- Almanack of Naval (free PDF): https://navalmanack.s3.amazonaws.com/Eric-Jorgenson_The-Almanack-of-Naval-Ravikant_Final.pdf · site: https://www.navalmanack.com/
- pmarca Blog Archives (PDF): https://a16z.com/wp-content/uploads/2021/08/The-pmarca-Blog-Archives.pdf
- Sam Altman: https://blog.samaltman.com/ · https://playbook.samaltman.com/
- Thiel CS183 (Blake Masters): https://blakemasters.tumblr.com/peter-thiels-cs183-startup · mirror: https://gist.github.com/harperreed/3201887
- Ben Horowitz / a16z: https://a16z.com/author/ben-horowitz/
- Fred Wilson: https://avc.com/ (MBA Mondays archive)
- Reid Hoffman: https://www.reidhoffman.org/
- Chris Dixon: https://cdixon.org/
- Joel Spolsky: https://www.joelonsoftware.com/
- patio11: https://www.kalzumeus.com/archive/
- 37signals Getting Real (free): https://basecamp.com/gettingreal
- Bezos letters (compiled PDF): https://bettertomorrowfinancial.com/wp-content/uploads/2021/04/jeff-bezos-amazon-shareholder-letters-1997_2020.pdf · official 1997+2020: https://s2.q4cdn.com/299287126/files/doc_financials/2021/ar/Amazon-2020-Shareholder-Letter-and-1997-Shareholder-Letter.pdf

## Acquisition plan

1. **Bulk sources first** (fast, clean): PG Markdown repo, Almanack PDF, pmarca
   PDF, Bezos letters PDF, Getting Real, CS183 mirror.
2. **Topic-filter** each bulk corpus down to the on-theme subset (drop off-theme
   files before they ever enter `sources/`).
3. **Curated web fetches** for the daily bloggers (Fred Wilson, Joel, patio11,
   Horowitz, Dixon, Altman, Balaji, Hoffman) — a hand-picked best-of per author.
4. Land everything under `sources/`, then run the slipbox pipeline (needs the M2
   web/PDF extractors, currently on the `m2-source-formats` branch).

> Note: ingesting the web/PDF sources requires the M2 extractors. This corpus can
> be assembled (downloaded) independently now; running the pipeline over it waits
> on M2 merging to main.

## Acquisition status

| Author | Status |
|--------|--------|
| Paul Graham | ✅ 173 essays fetched (topic-filtered from 231) |
| Naval Ravikant | ✅ Almanack PDF (focus notes on the Wealth material) |
| Marc Andreessen | ✅ pmarca Blog Archives PDF |
| Jeff Bezos | ✅ shareholder letters 1997–2020 PDF |
| Sam Altman | ◑ 7 core essays fetched; Startup Playbook (multi-page site) still to pull |
| Peter Thiel | ☐ CS183 — tumblr is JS-rendered; needs a markdown/PDF mirror |
| Ben Horowitz | ☐ curated a16z best-of to select + fetch |
| Fred Wilson | ☐ curated MBA Mondays + best-of to select + fetch |
| Reid Hoffman | ☐ to select + fetch |
| Chris Dixon | ☐ to select + fetch |
| Balaji Srinivasan | ☐ startup essays to select + fetch |
| Joel Spolsky | ☐ curated classics to select + fetch |
| patio11 | ☐ curated classics to select + fetch |
| 37signals | ☐ Getting Real chapters + SvN best-of |

The daily-bloggers (Horowitz, Wilson, Hoffman, Dixon, Balaji, Joel, patio11)
expose only recent posts via feed/homepage; their on-theme canon is specific older
essays that need a hand-picked best-of per author.
