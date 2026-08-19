/**
 * @slipbox/core — Pi extension entry point.
 *
 * Registers the slipbox toolset and injects the slipbox's house style into the
 * agent's context. The Zettelkasten workflow lives in skills/slipbox/SKILL.md.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { registerInit } from "./commands/init.js";
import { registerTutor } from "./commands/tutor.js";
import { loadConfig } from "./config/slipbox-config.js";
import { registerAutolink } from "./tools/link.js";
import { registerDoctor } from "./tools/doctor.js";
import { registerFeed } from "./tools/feed.js";
import { registerGather } from "./tools/gather.js";
import { registerIngest } from "./tools/ingest.js";
import { registerReadCluster } from "./tools/read-cluster.js";
import { registerReindex } from "./tools/reindex.js";
import { registerSearch } from "./tools/search.js";
import { registerServe } from "./tools/serve.js";
import { registerSources } from "./tools/sources.js";
import { registerStatus } from "./tools/status.js";
import { registerWrite, registerWritePermanent } from "./tools/write.js";
import { createSlipboxHeader } from "./ui/header.js";

const HOUSE_STYLE_MARKER = "slipbox:house-style";
const PERSONA_MARKER = "slipbox:persona";

/**
 * The agent's "soul" — product-level and shipped with @slipbox/core (distinct from
 * per-slipbox `houseStyle`, which governs note conventions). Kept short; the detail
 * and the three authoring modes live in skills/slipbox/SKILL.md ("Working with the
 * author"). Injected into the system prompt via the dedicated `before_agent_start`
 * hook so it is a true persona, not a conversational message.
 */
const PERSONA = `<${PERSONA_MARKER}>
You are the author's slipbox research and writing assistant. Your purpose is to help the AUTHOR think, research, and write their Zettelkasten — never to produce notes on your own behalf. Be curious, thorough, and rigorous about provenance: always trace an idea back to its source. You may push back and surface tensions rather than agree reflexively.

Permanent notes are the heart of the slipbox: atomic, evergreen ideas in the author's OWN words. You do not generate them. You discover where one is warranted (slipbox_gather over the existing notes) and help the author compress the underlying literature notes into one — scaffolding the shared claim, drawing them out Socratically, or (ONLY when explicitly asked) proposing a draft for them to rewrite. Never put words in the author's mouth unless they ask you to. Let the author steer how much you write vs. draw out; see the slipbox skill for how to shift between those modes.
</${PERSONA_MARKER}>`;

export default function slipbox(pi: ExtensionAPI): void {
	registerDoctor(pi);
	registerSources(pi);
	registerIngest(pi);
	registerFeed(pi);
	registerReadCluster(pi);
	registerWrite(pi);
	registerWritePermanent(pi);
	registerGather(pi);
	registerAutolink(pi);
	registerSearch(pi);
	registerReindex(pi);
	registerStatus(pi);
	registerServe(pi);
	registerInit(pi);
	registerTutor(pi);

	let injected = false;

	pi.on("session_start", async (_event: unknown, ctx: ExtensionContext) => {
		injected = false;
		ctx.ui.setTitle?.("slipbox");
		ctx.ui.setHeader?.(createSlipboxHeader());
		try {
			const config = loadConfig(ctx.cwd);
			if (config.found) ctx.ui.setStatus?.("slipbox", `slipbox: ${config.root}`);
		} catch {
			/* no config yet — fine */
		}
	});

	// Give the agent its persona by appending it to the system prompt via the
	// dedicated hook. `before_agent_start` returns a `systemPrompt` that replaces
	// (and chains across extensions) the assembled prompt — the correct vehicle for
	// a true, always-present persona, cleaner than a conversational injection.
	pi.on("before_agent_start", (event) => {
		if (event.systemPrompt.includes(PERSONA_MARKER)) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${PERSONA}` };
	});

	// Inject the slipbox house style once per session so the agent always writes
	// notes to this slipbox's conventions.
	pi.on("context", async (event, ctx) => {
		if (injected) return;
		let config;
		try {
			config = loadConfig(ctx.cwd);
		} catch {
			return;
		}
		if (!config.found || !config.houseStyle) return;
		injected = true;
		if (messagesContain(event.messages, HOUSE_STYLE_MARKER)) return;
		const text = `<${HOUSE_STYLE_MARKER}>\nThis slipbox's house style (follow it when writing notes):\n\n${config.houseStyle}\n</${HOUSE_STYLE_MARKER}>`;
		const message = { role: "user" as const, content: [{ type: "text" as const, text }], timestamp: Date.now() };
		return { messages: [message, ...event.messages] };
	});
}

function messagesContain(messages: readonly unknown[], marker: string): boolean {
	return messages.some((m) => {
		const content = (m as { content?: unknown } | null)?.content;
		if (typeof content === "string") return content.includes(marker);
		if (!Array.isArray(content)) return false;
		return content.some(
			(p) => p && typeof p === "object" && "text" in p && typeof (p as { text: unknown }).text === "string" && (p as { text: string }).text.includes(marker),
		);
	});
}
