import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { autolink } from "../pipeline/link.js";
import { embed, ensureIndex, isAvailable, update } from "../qmd/cli.js";
import { say, type OnUpdate } from "./result.js";
import { qmdMissing } from "./search.js";

export function registerAutolink(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_autolink",
		label: "Autolink notes",
		description:
			"Connect literature notes to each other by similarity, across ALL sources in the slipbox. Run this once the notes " +
			"exist (e.g. after ingesting + writing notes). For each note it adds links to its most-related other notes and " +
			"merges them into the note's frontmatter. Idempotent — safe to re-run as the slipbox grows.",
		promptSnippet: "Build the links between literature notes once they've been written.",
		parameters: Type.Object({
			max_per_note: Type.Optional(Type.Integer({ description: "Max links to add per note (default 6)" })),
			threshold: Type.Optional(Type.Number({ description: "Min cosine similarity for a link, 0..1 (default 0.55)" })),
		}),
		async execute(_id: string, params: { max_per_note?: number; threshold?: number }, _signal: unknown, onUpdate: OnUpdate, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);

			onUpdate?.(say("Re-indexing so notes are embedded…"));
			await ensureIndex(config.root, config.qmd.collection);
			await update(config.root);
			await embed(config.root);

			onUpdate?.(say("Linking related notes…"));
			const result = await autolink(config, {
				k: params.max_per_note ?? 6,
				threshold: params.threshold ?? 0.55,
				minLinks: 2,
				floor: 0.45,
			});

			const msg =
				result.notes === 0
					? "No literature notes found to link yet."
					: `Linked ${result.notes} literature notes — ${result.pairs} connections, ${result.linksAdded} new links added to frontmatter.`;
			return say(msg, { autolink: result });
		},
	});
}
