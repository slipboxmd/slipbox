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
import { registerIngest } from "./tools/ingest.js";
import { registerReadCluster } from "./tools/read-cluster.js";
import { registerReindex } from "./tools/reindex.js";
import { registerSearch } from "./tools/search.js";
import { registerServe } from "./tools/serve.js";
import { registerSources } from "./tools/sources.js";
import { registerStatus } from "./tools/status.js";
import { registerWrite } from "./tools/write.js";

const HOUSE_STYLE_MARKER = "slipbox:house-style";

export default function slipbox(pi: ExtensionAPI): void {
	registerDoctor(pi);
	registerSources(pi);
	registerIngest(pi);
	registerFeed(pi);
	registerReadCluster(pi);
	registerWrite(pi);
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
		try {
			const config = loadConfig(ctx.cwd);
			if (config.found) ctx.ui.setStatus?.("slipbox", `slipbox: ${config.root}`);
		} catch {
			/* no config yet — fine */
		}
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
