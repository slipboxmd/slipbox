import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { embed, ensureIndex, isAvailable, update } from "../qmd/cli.js";
import { say, type OnUpdate } from "./result.js";
import { qmdMissing } from "./search.js";

export function registerReindex(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_reindex",
		label: "Reindex slipbox",
		description: "Rebuild the QMD index from the slipbox markdown (runs `qmd update` + `qmd embed`). Safe to run anytime.",
		promptSnippet: "Refresh the search index after adding or editing notes by hand.",
		parameters: Type.Object({}),
		async execute(_id: string, _params: unknown, _signal: unknown, onUpdate: OnUpdate, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			onUpdate?.(say("Updating index…"));
			await ensureIndex(config.root, config.qmd.collection);
			await update(config.root);
			onUpdate?.(say("Embedding…"));
			await embed(config.root);
			return say("Slipbox index rebuilt (update + embed complete).");
		},
	});
}
