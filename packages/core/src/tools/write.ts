import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { writeLiterature, writeReferenceNote } from "../notes/write.js";

export function registerWrite(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_write_note",
		label: "Write literature note",
		description:
			"Write one atomic literature note (a single idea in the user's own words) as flat markdown, linked back to its " +
			"source reference and the chunk seqs it came from. Call once per idea cluster from slipbox_ingest.",
		promptSnippet: "Persist one literature note distilled from a source.",
		parameters: Type.Object({
			title: Type.String({ description: "A single short sentence that STATES the idea — what it is or means" }),
			body: Type.String({
				description:
					"The idea EXPLAINED in the user's own words, summarizing ALL the cluster's passages: explore what the author " +
					"says and means, and quote the author's own words where they capture it best (weave quotes in, not a list). " +
					"Explanatory and self-contained. Draw on the full passages from slipbox_read_cluster. Don't peg to a length.",
			}),
			source: Type.String({ description: "Source reference link from ingest, e.g. [[references/<id>]]" }),
			tags: Type.Optional(Type.Array(Type.String(), { description: "lowercase, hyphenated topics" })),
			chunks: Type.Optional(Type.Array(Type.Integer(), { description: "QMD chunk seq indices this idea came from" })),
			links: Type.Optional(Type.Array(Type.String(), { description: "Links to related notes, e.g. [[literature-notes/<id>]]" })),
		}),
		async execute(
			_id: string,
			params: { title: string; body: string; source: string; tags?: string[]; chunks?: number[]; links?: string[] },
			_signal: unknown,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const config = loadConfig(ctx.cwd);
			const ref = await writeLiterature(config, {
				title: params.title,
				body: params.body,
				sourceLink: params.source,
				tags: params.tags,
				chunks: params.chunks,
				links: params.links,
			});
			return { content: [{ type: "text", text: `Wrote literature note ${ref.link} → ${ref.relPath}` }], details: ref };
		},
	});

	pi.registerTool({
		name: "slipbox_write_reference_note",
		label: "Write reference note",
		description:
			"Write the source-level summary (reference note) for an ingested source, linking to the literature notes distilled " +
			"from it. Call after writing the literature notes.",
		promptSnippet: "Persist the whole-source summary that ties its literature notes together.",
		parameters: Type.Object({
			reference: Type.String({ description: "Source reference link from ingest, e.g. [[references/<id>]]" }),
			title: Type.String({ description: "Title for the reference note" }),
			summary: Type.String({ description: "A concise summary of the whole source" }),
			literature_links: Type.Array(Type.String(), { description: "Links to the literature notes, e.g. [[literature-notes/<id>]]" }),
		}),
		async execute(
			_id: string,
			params: { reference: string; title: string; summary: string; literature_links: string[] },
			_signal: unknown,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const config = loadConfig(ctx.cwd);
			const ref = await writeReferenceNote(config, {
				referenceLink: params.reference,
				title: params.title,
				summary: params.summary,
				literatureLinks: params.literature_links,
			});
			return { content: [{ type: "text", text: `Wrote reference note ${ref.link} → ${ref.relPath}` }], details: ref };
		},
	});
}
