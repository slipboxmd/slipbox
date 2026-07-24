---
name: working-style
description: "How the user wants pi-slipbox built — minimal, local-first, collaborative"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e37be9fc-7e8a-4183-9a47-02177ba68808
---

The user wants the harness kept **minimal and clean** and to **rely on the user's
local environment** rather than bundling heavy machinery. Prefer detecting a tool
and walking the user through installing/running it (yt-dlp, ffmpeg, whisper,
pandoc, QMD) over shipping it. Provide infrastructure/abstractions (e.g. for
embeddings + vector search) but leave model choice and access to the user.

**Why:** clean npm distribution + user control over models/privacy.

**How to apply:** default to fewest dependencies; guide-don't-bundle; make
providers pluggable. The user likes to **design collaboratively** and wants to
reach Phase 1 (ingestion pipeline) ASAP — plan together, de-risk with small
spikes before building. See [[project-overview]].
