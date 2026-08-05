import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	cluster,
	dirFor,
	ensureIndex,
	parseFrontmatter,
	qmdDbPath,
	qmdEmbed,
	qmdUpdate,
	readChunks,
	stringifyFrontmatter,
	writeExtracted,
	writeReference,
	type NoteRef,
	type SlipboxConfig,
} from "@slipbox/core";
import { writeCapture, type CaptureResult } from "./capture.js";
import { mapChunksToHighlights, reconcile, type ClusterLite, type ExistingNote, type ReconcilePlan } from "./reconcile.js";
import type { ReadwiseSource } from "./types.js";

export interface SyncResult {
	source: ReadwiseSource;
	capture: CaptureResult;
	/** Reference link to pass as a note's `source`, e.g. `[[references/rw-…]]`. */
	referenceLink: string;
	plan: ReconcilePlan;
}

/**
 * Sync a Readwise source into the slipbox and produce the reconciliation plan.
 *
 * Composes the core pipeline with a STABLE id derived from the source (not a
 * timestamp), so a re-sync overwrites the same capture / reference / extracted
 * files and the note→highlight provenance keeps lining up.
 */
export async function syncSource(config: SlipboxConfig, source: ReadwiseSource): Promise<SyncResult> {
	const synced = new Date().toISOString();
	const capture = await writeCapture(config, source, synced);
	const id = capture.id;

	// Extracted text = the highlight passages, in order — this is what QMD chunks.
	const ordered = [...source.highlights].sort((a, b) => (a.location ?? 0) - (b.location ?? 0));
	const extractedMd = ordered.map((h) => h.text.trim()).join("\n\n");
	const meta = { title: source.title, kind: "text" as const, origin: source.url ?? capture.path, ...(source.author ? { author: source.author } : {}) };

	const extracted = await writeExtracted(config, id, meta, extractedMd);
	const reference = await writeReference(config, id, meta);
	await enrichReference(reference.path, source);

	await ensureIndex(config.root, config.qmd.collection);
	await qmdUpdate(config.root);
	await qmdEmbed(config.root);

	const chunks = await readChunks(qmdDbPath(config.root), extracted.relPath);
	const groups = cluster(chunks, { threshold: config.clustering.threshold, minSize: config.clustering.min_cluster_size });

	const chunkMap = mapChunksToHighlights(
		chunks.map((c) => ({ seq: c.seq, text: c.text })),
		source.highlights,
	);
	const clusters: ClusterLite[] = groups.map((g, i) => ({
		index: i + 1,
		chunkSeqs: g.map((c) => c.seq).sort((a, b) => a - b),
		excerpts: g.slice(0, 3).map((c) => (c.text.length > 240 ? `${c.text.slice(0, 240)}…` : c.text)),
	}));

	const existingNotes = readSourceNotes(config, id);
	const plan = reconcile(clusters, chunkMap, source.highlights, existingNotes);

	return { source, capture, referenceLink: reference.link, plan };
}

/** Add Readwise-specific fields to the reference frontmatter core doesn't know about. */
async function enrichReference(path: string, source: ReadwiseSource): Promise<void> {
	const { data, body } = parseFrontmatter(await readFile(path, "utf8"));
	data.source_kind = source.product === "reader" ? "readwise-reader" : "readwise";
	data.readwise_id = source.id;
	if (source.category) data.category = source.category;
	if (source.url) data.origin = source.url;
	await writeFile(path, stringifyFrontmatter(data, body), "utf8");
}

/** Literature notes drawn from this source, with their Readwise highlight provenance. */
export function readSourceNotes(config: SlipboxConfig, referenceId: string): ExistingNote[] {
	const dir = dirFor(config, "literature_notes");
	if (!existsSync(dir)) return [];
	const out: ExistingNote[] = [];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".md") || file.startsWith(".")) continue;
		let text: string;
		try {
			text = readFileSync(join(dir, file), "utf8");
		} catch {
			continue;
		}
		const { data } = parseFrontmatter(text);
		const src = String(data.source ?? "");
		if (!src.includes(`references/${referenceId}`)) continue;
		const highlightIds = Array.isArray(data.readwise_highlights) ? data.readwise_highlights.map(String) : [];
		out.push({
			id: String(data.id ?? file.replace(/\.md$/, "")),
			title: String(data.title ?? file),
			link: `[[literature-notes/${String(data.id ?? file.replace(/\.md$/, ""))}]]`,
			highlightIds,
		});
	}
	return out;
}
