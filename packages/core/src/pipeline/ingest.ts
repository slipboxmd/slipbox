import type { SlipboxConfig } from "../config/types.js";
import { extract, isUrl } from "../extract/index.js";
import { makeId } from "../notes/ids.js";
import { writeExtracted, writeReference, writeSourceCapture, type NoteRef } from "../notes/write.js";
import { embed, ensureIndex, qmdDbPath, update } from "../qmd/cli.js";
import { readChunks } from "../qmd/vectors.js";
import { cluster } from "./cluster.js";

export interface IngestCluster {
	/** 1-based cluster index for display. */
	index: number;
	size: number;
	/** QMD chunk seq indices in the source. */
	chunkSeqs: number[];
	/** A few representative chunk excerpts for the agent to write a note from. */
	excerpts: string[];
}

export interface IngestResult {
	reference: NoteRef;
	/** The generated cleaned-text doc QMD chunked (in extracted/). */
	extracted: NoteRef;
	title: string;
	totalChunks: number;
	clusters: IngestCluster[];
}

const EXCERPT_CHARS = 600;
const MAX_EXCERPTS = 3;

/**
 * Run the mechanical half of ingestion: extract → write source + reference →
 * QMD index/embed → read chunk vectors → cluster. Returns candidate idea
 * clusters for the agent to turn into literature notes (authoring is the LLM's job).
 */
export async function ingestSource(config: SlipboxConfig, sourcePath: string): Promise<IngestResult> {
	const { markdown, metadata } = await extract(sourcePath);
	const id = makeId(metadata.title, config.notes.id_style);

	// URL sources have no local original — archive the fetched markdown as the
	// source of record in sources/. Dropped files already live there.
	if (isUrl(sourcePath)) await writeSourceCapture(config, id, metadata, markdown);

	const extracted = await writeExtracted(config, id, metadata, markdown);
	const reference = await writeReference(config, id, metadata);

	await ensureIndex(config.root, config.qmd.collection);
	await update(config.root);
	await embed(config.root);

	const chunks = await readChunks(qmdDbPath(config.root), extracted.relPath);

	const groups = cluster(chunks, {
		threshold: config.clustering.threshold,
		minSize: config.clustering.min_cluster_size,
	});

	const clusters: IngestCluster[] = groups.map((g, i) => ({
		index: i + 1,
		size: g.length,
		chunkSeqs: g.map((c) => c.seq).sort((a, b) => a - b),
		excerpts: g
			.slice(0, MAX_EXCERPTS)
			.map((c) => (c.text.length > EXCERPT_CHARS ? `${c.text.slice(0, EXCERPT_CHARS)}…` : c.text)),
	}));

	return { reference, extracted, title: metadata.title, totalChunks: chunks.length, clusters };
}
