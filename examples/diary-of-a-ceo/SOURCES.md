# Sources — Diary of a CEO (podcast)

The whole show, via its public podcast RSS feed. One source per episode.

| Field | Value |
| --- | --- |
| Show | The Diary of a CEO (Steven Bartlett) |
| RSS feed | TODO — fill in the show's public RSS feed URL |
| Also on | YouTube (channel) — an alternative transcript source via yt-dlp |
| Episodes | hundreds (large corpus) |

## Notes

- The harness will fan the feed out into one `sources/<episode>.md` per episode
  (link + metadata + transcript), each extracted + turned into notes.
- Transcripts come from the podcast's own captions if available, else yt-dlp
  (YouTube auto-subs) or whisper on the audio.
- **Repo size:** do not commit the generated transcripts/notes for the full run —
  only this manifest + `.slipbox` config are tracked.
- **Validate first** on a handful of episodes (or a smaller podcast) before a
  hundreds-of-episodes ingest.

> TODO: capture the exact RSS feed URL (and/or the YouTube channel URL) here.
