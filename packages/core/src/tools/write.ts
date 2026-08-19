import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { updateReference, writeLiterature, writePermanent } from "../notes/write.js";

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
			"Add the whole-source summary to the source's reference (the one file created at ingest), and record its literature " +
			"notes. Updates that reference in place — does not create a second file. Call after writing the literature notes.",
		promptSnippet: "Fill in the reference's whole-source summary once its literature notes exist.",
		parameters: Type.Object({
			reference: Type.String({ description: "The reference link from ingest, e.g. [[references/<id>]]" }),
			summary: Type.String({ description: "A concise summary of the whole source" }),
			literature_links: Type.Array(Type.String(), { description: "Links to the literature notes, e.g. [[literature-notes/<id>]]" }),
		}),
		async execute(
			_id: string,
			params: { reference: string; summary: string; literature_links: string[] },
			_signal: unknown,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const config = loadConfig(ctx.cwd);
			const ref = await updateReference(config, {
				reference: params.reference,
				summary: params.summary,
				literatureLinks: params.literature_links,
			});
			return { content: [{ type: "text", text: `Updated reference ${ref.link} with summary + ${params.literature_links.length} links` }], details: ref };
		},
	});
}

export function registerWritePermanent(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_write_permanent",
		label: "Write permanent note",
		description:
			"Persist ONE permanent note — an atomic, evergreen idea in the AUTHOR'S OWN WORDS, synthesized from literature notes. " +
			"NEVER call this with prose you generated on your own: the body must be what the author wrote or explicitly approved. " +
			"Discover where a permanent note is warranted with slipbox_gather, help the author compress the notes into one, then " +
			"persist it here. `draws_on` links DOWN to the literature notes; `links` link ACROSS to related permanent notes; " +
			"`sources` are derived automatically. After writing, run slipbox_reindex then slipbox_autolink to embed + cross-link it.",
		promptSnippet: "Persist a permanent note the author wrote, linked down to its literature notes.",
		parameters: Type.Object({
			title: Type.String({ description: "A single-sentence claim — the idea itself" }),
			body: Type.String({ description: "The author's OWN prose. Never your unaided generation — what the author wrote or approved." }),
			draws_on: Type.Array(Type.String(), { description: "Links DOWN to the literature notes synthesized, e.g. [[literature-notes/<id>]]" }),
			links: Type.Optional(Type.Array(Type.String(), { description: "Links ACROSS to related permanent notes, e.g. [[permanent-notes/<id>]]" })),
			tags: Type.Optional(Type.Array(Type.String(), { description: "lowercase, hyphenated topics" })),
			id: Type.Optional(Type.String({ description: "Existing permanent-note id to overwrite (edit in place). Omit to create." })),
		}),
		async execute(
			_id: string,
			params: { title: string; body: string; draws_on: string[]; links?: string[]; tags?: string[]; id?: string },
			_signal: unknown,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const config = loadConfig(ctx.cwd);
			const ref = await writePermanent(config, {
				title: params.title,
				body: params.body,
				drawsOn: params.draws_on,
				links: params.links,
				tags: params.tags,
				id: params.id,
			});
			return {
				content: [{ type: "text", text: `Wrote permanent note ${ref.link} → ${ref.relPath} (draws on ${params.draws_on.length} note(s)). Now run slipbox_reindex + slipbox_autolink.` }],
				details: ref,
			};
		},
	});
}
