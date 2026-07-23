import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { isAvailable, qmdDbPath } from "../qmd/cli.js";
import { readChunks } from "../qmd/vectors.js";
import { say } from "./result.js";
import { qmdMissing } from "./search.js";

const MAX_CHARS = 40_000;

export function registerReadCluster(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_read_cluster",
		label: "Read cluster passages",
		description:
			"Read the FULL source passages behind a cluster's chunk seqs (from slipbox_ingest). Call this before writing a " +
			"literature note so you work from the whole idea, not a short excerpt — this is what lets notes be substantive.",
		promptSnippet: "Get the full text of a cluster's passages before writing its note.",
		parameters: Type.Object({
			source: Type.String({ description: "The source reference link or path from ingest, e.g. [[references/<id>]] or sources/<id>.md" }),
			seqs: Type.Array(Type.Integer(), { description: "The cluster's chunk seq indices" }),
		}),
		async execute(_id: string, params: { source: string; seqs: number[] }, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			const id = params.source.replace(/\[\[|\]\]/g, "").trim().split("/").pop()?.replace(/\.md$/, "") ?? params.source;

			const chunks = (await readChunks(qmdDbPath(config.root), id)).filter((c) => c.path.includes("extracted/"));
			const bySeq = new Map(chunks.map((c) => [c.seq, c.text]));

			const passages = params.seqs.map((s) => bySeq.get(s)).filter((t): t is string => Boolean(t));
			if (passages.length === 0) {
				return say(`No passages found for seqs [${params.seqs.join(", ")}] in "${id}". Check the source/seqs from the ingest result.`, { seqs: params.seqs });
			}

			let text = passages.join("\n\n— — —\n\n");
			const chars = text.length;
			let truncated = false;
			if (text.length > MAX_CHARS) {
				text = `${text.slice(0, MAX_CHARS)}\n…[truncated ${chars - MAX_CHARS} chars]`;
				truncated = true;
			}
			const header = `Full passages for cluster (seqs ${params.seqs.join(", ")}), ${passages.length} chunk(s):\n\n`;
			return say(header + text, { seqs: params.seqs, chars, truncated });
		},
	});
}
