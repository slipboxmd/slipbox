# Source formats & their dependencies

slipbox turns *any* source into flat-markdown notes. Each format is handled by a
small extractor that shells out to a well-known CLI — we **guide, we don't
bundle**: if the tool is missing, ingestion fails with a one-line install hint
rather than silently degrading. `slipbox_doctor` lists what's installed and what
each tool unlocks.

Everything is normalized to markdown, cleaned into `sources/extracted/`, then
chunked/embedded by **QMD** (the one always-required tool).

## Formats

| Source | Extensions / input | CLI required | Install |
|---|---|---|---|
| Plain text / markdown | `.txt`, `.md` | — (built in) | — |
| PDF | `.pdf` | `pdftotext` + `pdfinfo` (poppler) | `brew install poppler` · `apt-get install poppler-utils` |
| E-book / office / HTML | `.epub`, `.docx`, `.html`/`.htm`, `.odt`, `.rtf` | `pandoc` | `brew install pandoc` · <https://pandoc.org/installing.html> |
| Web article | `https://…` URL | `trafilatura` | `pipx install trafilatura` · `pip3 install trafilatura` |
| YouTube | `https://youtube.com/…` / `youtu.be/…` URL | `yt-dlp` | `brew install yt-dlp` · `pipx install yt-dlp` |
| Audio / podcast | `.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`, `.aac`, `.opus` | `whisper` (+ `ffmpeg`) | `pipx install openai-whisper` · or whisper.cpp |
| RSS / Atom feed | feed URL (via `slipbox_feed`) | — (built-in `fetch`) | — |

QMD itself (always required): `npm i -g @tobilu/qmd` (macOS also `brew install sqlite`).

## Notes per format

- **PDF** — text via `pdftotext -nopgbrk`; title/author from the PDF's embedded
  metadata (`pdfinfo`) when present, else a first-line heuristic. Academic PDFs
  without embedded titles get a best-effort title from the first line(s); verify
  and rename if needed. Scanned/image-only PDFs yield no text (OCR is out of scope).
- **E-book/HTML (pandoc)** — converted with raw HTML, wrapper divs/spans, fenced
  blocks, and header-id attributes disabled so chunk text stays plain prose.
  Project Gutenberg e-books carry a license header/footer; those cluster as
  low-signal passages you can skip.
- **Web (trafilatura)** — fetches the URL and strips nav/boilerplate to the
  readable article, with title/author/date metadata. JS-rendered or paywalled
  pages may yield little; it errors clearly when no readable body is found.
- **YouTube (yt-dlp)** — captures title/uploader/date + the transcript (English
  auto-captions, converted from VTT and de-duplicated). No captions → falls back
  to the video description. Only English tracks are requested (a broad match trips
  YouTube's rate limiter).
- **Audio (whisper)** — local transcription with the `base.en` model; slow on long
  files (no GPU needed, but minutes per hour of audio). `ffmpeg` is used by whisper
  for decoding. *Documented but not yet exercised on this machine — whisper wasn't
  installed at build time; verify on first real use.*
- **Feeds** — `slipbox_feed(url)` parses RSS 2.0 and Atom natively (no dep) and
  lists items; you ingest chosen items by their links. A podcast feed's audio
  enclosures would be ingested as audio files (download first).

## URL sources: capture vs. extracted

A URL has no local original, so the harness writes a **capture** —
`sources/<id>.md`, frontmatter (title, origin URL, kind, date) + the fetched
markdown — as the archival source of record. The cleaned body still goes to
`sources/extracted/<id>.md` for QMD, and provenance is also on the `references/`
record.

> **Known first-pass issue (to resolve together):** the QMD collection is rooted
> at the slipbox (`.`, pattern `**/*.md`), so a URL capture in `sources/` is
> indexed *in addition to* its `sources/extracted/` copy — harmless for
> clustering / read-cluster / autolink (those filter to `extracted/` or
> `literature-notes/`), but it double-counts in `slipbox_search`. Fix options:
> scope the collection to the content dirs (QMD spans multiple named collections)
> or relocate captures. Deferred because it touches the locked single-collection
> index design.
