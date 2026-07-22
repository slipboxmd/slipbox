# Pi Harness Reference

A distilled reference for building `pi-slipbox` on top of Pi
(`@earendil-works/pi-coding-agent`). Pulled from the official docs at
<https://pi.dev/docs/latest> and the repo
<https://github.com/earendil-works/pi> (packages/coding-agent/docs). Keep this in
sync as the API evolves.

## What Pi is

Pi is a **minimal terminal coding harness**. Users install it globally
(`npm i -g @earendil-works/pi-coding-agent`) and run `pi` in a project. Auth via
`/login` or `ANTHROPIC_API_KEY` etc. It stays small at the core and is extended
through four resource types:

- **Extensions** — TypeScript modules (custom tools, commands, events, TUI).
- **Skills** — on-demand `SKILL.md` capabilities the agent loads when relevant.
- **Prompt templates** and **Themes**.

Sessions are stored as JSONL with branching + tree navigation, context
compaction, and branch summarization.

## Distribution: Pi packages

`pi-slipbox` ships as a **Pi package** — an npm (or git) package whose
`package.json` has a `pi` field:

```json
{
  "name": "pi-slipbox",
  "version": "1.0.0",
  "dependencies": { "...": "runtime deps go here, NOT devDependencies" },
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

Install into a project with `pi install npm:pi-slipbox@1.0.0`, or add to the
`packages` array in `.pi/settings.json`. Git packages also work
(`git:github.com/user/repo@v1`). Runtime dependencies **must** be in
`dependencies` (not devDependencies) for distributed packages.

## Config & discovery

- Global settings: `~/.pi/agent/settings.json`; project: `.pi/settings.json`
  (project overrides global; nested objects merge).
- Extensions auto-discovered from `~/.pi/agent/extensions/*.ts` (global) and
  `.pi/extensions/*.ts` (project). Additional paths/packages via settings.
- Skills discovered from `~/.pi/agent/skills/`, `~/.agents/skills/`,
  `.pi/skills/`, `.agents/skills/`, package `pi.skills` entries, and the
  `skills` settings array.
- **Project trust**: Pi prompts before trusting a folder with local settings /
  resources / skills. Non-interactive modes use `defaultProjectTrust`.
- Use `CONFIG_DIR_NAME` from the package instead of hardcoding `.pi`.
- **Note:** Pi does *not* natively read `AGENTS.md`/`CLAUDE.md`. Project context
  comes from settings + skills + extensions. Our own `.slipbox` file is a
  convention *we* read inside our extension/tools, not something Pi loads.

## Extensions

A default-exported factory receives the `ExtensionAPI`:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("slipbox loaded", "info");
  });
}
```

Async factories complete before `session_start` (good for one-time setup).

### Custom tools — `pi.registerTool(def)`

Tools appear in the system prompt and are callable by the LLM. Parameters use
`typebox`; `execute` returns `{ content, details }`.

```ts
import { Type } from "typebox";

pi.registerTool({
  name: "slipbox_ingest",
  label: "Ingest source",
  description: "Ingest a source into the slipbox (chunk, embed, cluster).",
  promptSnippet: "Use to bring a new book/article/video into the slipbox.",
  parameters: Type.Object({
    source: Type.String({ description: "Path or URL to the source" }),
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: "Chunking…" }] });
    return {
      content: [{ type: "text", text: "Ingested." }],
      details: { chunks: 0 },
      // terminate: true,   // optionally skip auto follow-up
    };
  },
});
```

Notes:
- Throw to mark a tool run failed. Truncate large output with
  `truncateHead`/`truncateTail` (defaults ~50KB / 2000 lines).
- Custom tools that edit files should use `withFileMutationQueue(absPath, fn)`
  to avoid clobbering parallel `edit`/`write` calls.
- Persist tool state in the returned `details` so it survives branch/fork
  navigation; rehydrate on `session_start` by scanning `ctx.sessionManager`.
- Override a built-in by registering the same name (`read`, `write`, `edit`,
  `bash`, `grep`, `find`, `ls`).
- Optional `renderCall` / `renderResult` for custom TUI display (via
  `@earendil-works/pi-tui`).

### Commands, shortcuts, flags

```ts
pi.registerCommand("ingest", {
  description: "Ingest a source into the slipbox",
  getArgumentCompletions: (prefix) => [{ value: "book.epub", label: "book.epub" }],
  handler: async (args, ctx) => { /* ... */ },
});
pi.registerShortcut("ctrl+x", { description: "…", handler: async (ctx) => {} });
pi.registerFlag("rebuild-index", { description: "…", type: "boolean", default: false });
```

### Lifecycle events — `pi.on(name, handler)`

Handlers get `(event, ctx)`. Useful ones for us:

- `session_start`, `session_shutdown`, `project_trust`
- `before_agent_start` (inject messages / modify system prompt),
  `agent_start`/`agent_end`/`agent_settled`, `turn_start`/`turn_end`
- `context` (non-destructively modify messages before the LLM call — e.g. inject
  the current `.slipbox` config or a slipbox status summary)
- `tool_call` (block/modify before exec), `tool_result` (modify after)
- `input` (transform user text before skill/template expansion)
- `resources_discover` (return additional `skillPaths` — how Superpowers injects
  its skills)

### Messages, session, state

- `pi.sendMessage(msg, opts)` / `pi.sendUserMessage(text)` — inject context or
  drive the agent (`deliverAs: "steer" | "followUp" | "nextTurn"`).
- `pi.appendEntry(type, data)` — persist data that does NOT enter LLM context.
- `pi.exec(cmd, args, { signal, timeout })` — run a subprocess (handy for
  shelling out to media/text extractors: ffmpeg, yt-dlp, pandoc, etc.).

### ExtensionContext (`ctx`)

`ctx.cwd`, `ctx.ui` (`select`/`confirm`/`input`/`editor`/`notify`/`setStatus`/
`setWidget`), `ctx.signal` (abort), `ctx.sessionManager` (read-only history),
`ctx.modelRegistry`, `ctx.model`, `ctx.compact()`, `ctx.getContextUsage()`.

### Subagents & task lists

Pi core ships **no** standard subagent or todo tool. The optional
`pi-subagents` package adds a `subagent` tool (single/chain/parallel/async/
forked/resume). Without it, do work in-session; don't fabricate `Task` calls.

## Available imports

```ts
import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext }
  from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";                    // tool param schemas
import { StringEnum } from "@earendil-works/pi-ai"; // enums
import { Box, Text } from "@earendil-works/pi-tui"; // TUI rendering
import { truncateHead, truncateTail, withFileMutationQueue, CONFIG_DIR_NAME }
  from "@earendil-works/pi-coding-agent";
```

## Implications for pi-slipbox

- Our tools are the pipeline verbs: `slipbox_ingest`, `slipbox_search`,
  `slipbox_link`, `slipbox_cluster`, `slipbox_moc`, `slipbox_status`, etc.
- Heavy lifting (media extraction, embeddings, clustering) either runs in-process
  (TS libs) or is shelled out via `pi.exec` — an open decision (see ARCHITECTURE).
- A skill (`skills/slipbox/SKILL.md`) teaches the Zettelkasten method and when to
  call which tool.
- The `.slipbox` config is read by our code and can be injected into context via
  the `context` event so the agent always knows the slipbox's rules.
