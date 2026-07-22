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
			"cluster the ideas by similarity. Returns candidate idea clusters (with excerpts) for you to turn into literature " +
			"notes. Phase-1 supports .txt/.md sources. After this, write one literature note per cluster with slipbox_write_note, " +
			"then a reference note with slipbox_write_reference_note.",
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

function renderIngest(r: import("../pipeline/ingest.js").IngestResult, found: boolean): string {
	const head = [
		found ? "" : "Note: no .slipbox config found — used defaults in the current directory.",
		`Ingested **${r.title}**.`,
		`- reference: ${r.reference.link}  (${r.reference.relPath})`,
		`- source text: ${r.source.relPath}`,
		`- ${r.totalChunks} chunks → ${r.clusters.length} candidate idea cluster(s)`,
		"",
		"Now write ONE atomic literature note per cluster (in the user's words, per house style),",
		`then a reference note. Use source link \`${r.reference.link}\` and the cluster's chunk seqs.`,
		"",
	].filter(Boolean);

	const body = r.clusters.map((c) => {
		const excerpts = c.excerpts.map((e, i) => `   [${i + 1}] ${e}`).join("\n");
		return `── Cluster ${c.index} (${c.size} chunk${c.size === 1 ? "" : "s"}, seqs ${c.chunkSeqs.join(", ")}) ──\n${excerpts}`;
	});

	return [...head, ...body].join("\n");
}
