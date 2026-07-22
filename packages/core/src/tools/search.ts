import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { isAvailable, search, type SearchMode } from "../qmd/cli.js";
import { say } from "./result.js";

export function registerSearch(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_search",
		label: "Search slipbox",
		description:
			"Search the slipbox via QMD. mode 'query' = hybrid + rerank (best), 'vsearch' = vector similarity, " +
			"'search' = keyword/BM25. Returns matching notes with scores and snippets.",
		promptSnippet: "Find notes related to a topic before writing or linking.",
		parameters: Type.Object({
			query: Type.String({ description: "What to search for" }),
			mode: Type.Optional(Type.String({ description: "query | vsearch | search (default query)" })),
			limit: Type.Optional(Type.Number({ description: "Max results (default 8)" })),
		}),
		async execute(_id: string, params: { query: string; mode?: string; limit?: number }, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			const mode = (params.mode as SearchMode) || config.qmd.search_mode;
			const results = await search(config.root, params.query, mode, {
				collection: config.qmd.collection,
				limit: params.limit ?? 8,
			});
			if (results.length === 0) return say(`No results for "${params.query}".`, { results });
			const text = results
				.map((r, i) => `${i + 1}. ${r.title ?? r.file} (${r.score?.toFixed?.(2) ?? r.score})\n   ${r.file}\n   ${(r.snippet ?? "").replace(/\s+/g, " ").slice(0, 200)}`)
				.join("\n");
			return say(text, { results });
		},
	});
}

export function qmdMissing(): string {
	return (
		"QMD is not installed — it powers indexing, embedding, and search.\n" +
		"Install it with:  npm i -g @tobilu/qmd   (macOS also: brew install sqlite)\n" +
		"Then run `qmd pull` once to download the local models."
	);
}
