import { readFile } from "node:fs/promises";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, qmdAvailable, writeLiterature } from "@slipbox/core";
import { parseSource } from "./parse.js";
import { syncSource } from "./sync.js";
import type { ClusterPlan } from "./reconcile.js";

function say(text: string, details?: Record<string, unknown>) {
	return { content: [{ type: "text" as const, text }], details };
}

const SUGGESTION_HINT: Record<ClusterPlan["suggestion"], string> = {
	new: "no note covers these yet → write a NEW note",
	extend: "extends one existing note → UPDATE that note (re-draft its body to include the new highlight, keep its id)",
	split: "spans SEVERAL existing notes → the grouping shifted; decide whether to update one, split into more, or merge",
	settled: "already noted; nothing new",
};

export function registerReadwiseTools(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_readwise_sync",
		label: "Sync a Readwise source",
		description:
			"Pull a Readwise source's highlights into the slipbox and get an incremental note plan. First fetch the highlights " +
			"yourself with the `readwise` CLI (e.g. `readwise readwise-list-highlights --book-id <id> --json > /tmp/hl.json`), " +
			"then call this with the file path + the source's title/id. It writes/updates the sources/ capture, re-indexes, " +
			"re-clusters ALL highlights, and returns clusters annotated with what's NEW vs already-noted and which existing notes " +
			"relate — so you can decide per cluster to create, extend, or split notes. Re-run any time as more highlights are added.",
		promptSnippet: "Bring a Readwise book/article's highlights in and get an incremental literature-note plan.",
		parameters: Type.Object({
			highlights_path: Type.String({ description: "Path to the JSON file you saved from `readwise … --json`" }),
			title: Type.String({ description: "The source's title (from Readwise)" }),
			readwise_id: Type.String({ description: "The Readwise book id or Reader document id" }),
			product: Type.Optional(Type.String({ description: "readwise (books/articles) or reader (Reader docs). Default readwise." })),
			author: Type.Optional(Type.String()),
			category: Type.Optional(Type.String({ description: "books | articles | podcasts | pdf | epub …" })),
			url: Type.Optional(Type.String({ description: "Original document / highlights URL" })),
		}),
		async execute(_id, params: { highlights_path: string; title: string; readwise_id: string; product?: string; author?: string; category?: string; url?: string }, _signal, _onUpdate, ctx: ExtensionContext) {
			if (!(await qmdAvailable())) return say("QMD isn't installed — it powers indexing/clustering. Install it: npm i -g @tobilu/qmd", { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);

			let json: unknown;
			try {
				json = JSON.parse(await readFile(params.highlights_path, "utf8"));
			} catch (err) {
				return say(`Couldn't read/parse the highlights file at ${params.highlights_path}: ${(err as Error).message}. Fetch it with \`readwise … --json > <path>\` first.`, { error: "bad-highlights-file" });
			}

			const source = parseSource(json, {
				product: params.product === "reader" ? "reader" : "readwise",
				id: params.readwise_id,
				title: params.title,
				author: params.author,
				category: params.category,
				url: params.url,
			});
			if (source.highlights.length === 0) {
				return say(`No highlights found in ${params.highlights_path}. Is the JSON an array of highlights from \`readwise\`?`, { error: "no-highlights" });
			}

			const result = await syncSource(config, source);
			return say(renderPlan(result), { sync: result });
		},
	});

	pi.registerTool({
		name: "slipbox_readwise_write_note",
		label: "Write/update a Readwise note",
		description:
			"Write a literature note from a Readwise source, recording which highlight ids it draws from (its provenance). Use " +
			"action 'create' for a new note, or 'update' with the note_id to re-draft an existing one when new highlights extend " +
			"it. Always pass the FULL set of highlight ids the note now covers. This is how the incremental sync stays correct.",
		promptSnippet: "Write or update a literature note from Readwise highlights, stamping their ids.",
		parameters: Type.Object({
			action: Type.String({ description: "'create' or 'update'" }),
			title: Type.String({ description: "One short sentence stating the idea" }),
			body: Type.String({ description: "The note, in your own words, explaining the highlighted idea" }),
			source: Type.String({ description: "Reference link from the sync result, e.g. [[references/rw-…]]" }),
			highlight_ids: Type.Array(Type.String(), { description: "ALL Readwise highlight ids this note now draws from" }),
			note_id: Type.Optional(Type.String({ description: "For action 'update': the id of the note to overwrite" })),
			tags: Type.Optional(Type.Array(Type.String())),
			links: Type.Optional(Type.Array(Type.String())),
		}),
		async execute(_id, params: { action: string; title: string; body: string; source: string; highlight_ids: string[]; note_id?: string; tags?: string[]; links?: string[] }, _signal, _onUpdate, ctx: ExtensionContext) {
			const config = loadConfig(ctx.cwd);
			if (params.action === "update" && !params.note_id) {
				return say("action 'update' needs a note_id (the existing note to overwrite).", { error: "missing-note-id" });
			}
			const ref = await writeLiterature(config, {
				title: params.title,
				body: params.body,
				sourceLink: params.source,
				tags: params.tags ?? [],
				links: params.links ?? [],
				id: params.action === "update" ? params.note_id : undefined,
				extra: { readwise_highlights: params.highlight_ids },
			});
			return say(`${params.action === "update" ? "Updated" : "Wrote"} ${ref.link} (${params.highlight_ids.length} highlight${params.highlight_ids.length === 1 ? "" : "s"}). ${ref.relPath}`, { note: ref });
		},
	});
}

function renderPlan(r: import("./sync.js").SyncResult): string {
	const { plan, source, capture, referenceLink } = r;
	const lines = [
		`Synced **${source.title}** — ${plan.totalHighlightCount} highlights (${capture.newHighlightIds.length} new since last sync).`,
		`- capture: ${capture.path}`,
		`- reference: ${referenceLink}`,
		`- ${plan.clusters.length} cluster(s) need attention · ${plan.settledCount} already settled (skip).`,
		"",
	];

	if (plan.clusters.length === 0) {
		lines.push("Nothing new to note — every highlight is already covered. Done.");
		return lines.join("\n");
	}

	lines.push(
		"For each cluster below, read the highlights and act on the suggestion using `slipbox_readwise_write_note`:",
		"write a note that EXPLAINS the idea in your own words, quoting the highlights where apt. Pass the FULL highlight_ids the",
		`note covers, and source \`${referenceLink}\`. Only the highlights marked NEW are unprocessed.`,
		"",
	);

	for (const c of plan.clusters) {
		lines.push(`### Cluster ${c.index} — ${c.suggestion.toUpperCase()} (${SUGGESTION_HINT[c.suggestion]})`);
		lines.push(`highlights: ${c.highlightIds.join(", ")}   new: ${c.newHighlightIds.join(", ") || "(none)"}`);
		if (c.relatedNotes.length) {
			for (const n of c.relatedNotes) lines.push(`related note: ${n.link} "${n.title}" (covers ${n.coveredHighlightIds.join(", ")}) — update via note_id ${n.id}`);
		}
		const ex = (c.excerpts[0] ?? "").replace(/\s+/g, " ").slice(0, 240);
		lines.push(`excerpt: ${ex}…`, "");
	}
	return lines.join("\n");
}
