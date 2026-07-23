import { resolve } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { ingestSource } from "../pipeline/ingest.js";
import { isAvailable } from "../qmd/cli.js";
import { say, type OnUpdate } from "./result.js";
import { qmdMissing } from "./search.js";

export function registerIngest(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_ingest",
		label: "Ingest source",
		description:
			"Ingest a source file into the slipbox: extract → write a source + reference record → index/embed with QMD → " +
			"cluster the passages into idea groups by similarity. Returns candidate idea clusters (recurring themes first, then " +
			"one-off passages) with excerpts. Review them and write a literature note for each SUBSTANTIVE idea with " +
			"slipbox_write_note — there is no fixed count: a longer source naturally yields more notes; skip thin or boilerplate " +
			"clusters. Then write a reference note with slipbox_write_reference_note. Phase-1 supports .txt/.md sources.",
		promptSnippet: "Bring a new source into the slipbox and get idea clusters to write notes from.",
		parameters: Type.Object({
			source: Type.String({ description: "Path to the source file (.txt or .md for now)" }),
		}),
		async execute(_id: string, params: { source: string }, _signal: unknown, onUpdate: OnUpdate, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			const sourcePath = resolve(ctx.cwd, params.source);

			onUpdate?.(say("Extracting + indexing (qmd update/embed)…"));
			const result = await ingestSource(config, sourcePath);
			onUpdate?.(say(`Clustered ${result.totalChunks} chunks into ${result.clusters.length} ideas.`));

			return say(renderIngest(result, config.found), { ingest: result });
		},
	});
}

/** How many recurring-theme clusters to spell out before summarizing the rest. */
const SHOW_THEMES = 40;
const EXCERPT_LEN = 220;

function renderIngest(r: import("../pipeline/ingest.js").IngestResult, found: boolean): string {
	const themes = r.clusters.filter((c) => c.size >= 2);
	const singles = r.clusters.filter((c) => c.size === 1);

	const head = [
		found ? "" : "Note: no .slipbox config found — used defaults in the current directory.",
		`Ingested **${r.title}**.`,
		`- reference: ${r.reference.link}  (${r.reference.relPath})`,
		`- source text: ${r.source.relPath}`,
		`- ${r.totalChunks} chunks → ${themes.length} recurring themes + ${singles.length} one-off passages`,
		"",
		"For each SUBSTANTIVE theme below: first call `slipbox_read_cluster` with this source and the cluster's chunk seqs",
		"to read the FULL passages, then write a developed literature note (one idea, the user's words, per house style) —",
		"reasoning and why it matters, not a one-line restatement. There is no target count; a longer source yields more.",
		"Skip thin, repetitive, or boilerplate clusters, and glance at the one-off passages for standout ideas.",
		`Use source link \`${r.reference.link}\` and each cluster's chunk seqs. Then write a reference note.`,
		"",
		"## Recurring themes (largest first)",
	].filter(Boolean);

	const shown = themes.slice(0, SHOW_THEMES).map((c) => {
		const excerpt = (c.excerpts[0] ?? "").slice(0, EXCERPT_LEN).replace(/\s+/g, " ").trim();
		return `• Cluster ${c.index} — ${c.size} chunks (seqs ${c.chunkSeqs.join(", ")})\n    ${excerpt}…`;
	});
	if (themes.length > SHOW_THEMES) {
		shown.push(`…and ${themes.length - SHOW_THEMES} more themes (full data in the tool result details).`);
	}

	const tail =
		singles.length > 0
			? `\n${singles.length} one-off single-passage clusters are in the details — mine them for any standout ideas.`
			: "";

	return [...head, ...shown, tail].join("\n");
}
