import type { Highlight } from "./types.js";

/**
 * Incremental reconciliation.
 *
 * On every sync we re-cluster ALL of a source's highlights, then use the grouping
 * to work out what each cluster means relative to the notes already written —
 * because (per the design) it's the proximity and grouping of highlights that
 * decides whether new highlights extend a note, split one, or start a new note.
 *
 * This module is pure: it maps chunks → highlights → clusters → existing notes and
 * classifies each cluster. The actual authoring decision stays with the agent; the
 * classification is a hint.
 */

export interface ChunkLite {
	seq: number;
	text: string;
}

export interface ClusterLite {
	index: number;
	chunkSeqs: number[];
	excerpts: string[];
}

/** An existing literature note for this source, with the highlights it drew from. */
export interface ExistingNote {
	id: string;
	title: string;
	link: string;
	highlightIds: string[];
}

export type Suggestion = "new" | "extend" | "split" | "settled";

export interface ClusterPlan {
	index: number;
	/** All highlights in this cluster (in source order). */
	highlightIds: string[];
	/** Those not yet captured by any existing note. */
	newHighlightIds: string[];
	excerpts: string[];
	/** Existing notes that already cover some of these highlights. */
	relatedNotes: { id: string; title: string; link: string; coveredHighlightIds: string[] }[];
	/**
	 * A hint, not a decision:
	 *  - new     : nothing here is noted yet → write a fresh note
	 *  - extend  : overlaps exactly one note and has new highlights → grow that note
	 *  - split   : overlaps several notes (grouping shifted) → agent reconsiders the split
	 *  - settled : every highlight already noted and nothing new → skip
	 */
	suggestion: Suggestion;
}

export interface ReconcilePlan {
	clusters: ClusterPlan[];
	/** Clusters that are fully noted with nothing new (not returned in `clusters`). */
	settledCount: number;
	newHighlightCount: number;
	totalHighlightCount: number;
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();
/** A signature long enough to be distinctive but tolerant of edge trimming. */
const sig = (s: string): string => norm(s).slice(0, 48);

/**
 * Map each chunk to the highlight ids it covers, by text overlap. The extracted
 * text is the highlights concatenated, so a chunk covers a highlight when either
 * contains the other's signature — handling both "several short highlights in one
 * chunk" and "one long highlight split across chunks".
 */
export function mapChunksToHighlights(chunks: ChunkLite[], highlights: Highlight[]): Map<number, Set<string>> {
	const hl = highlights.map((h) => ({ id: h.id, norm: norm(h.text), sig: sig(h.text) }));
	const out = new Map<number, Set<string>>();
	for (const c of chunks) {
		const cn = norm(c.text);
		const cs = sig(c.text);
		const ids = new Set<string>();
		for (const h of hl) {
			if (!h.norm) continue;
			if (cn.includes(h.sig) || h.norm.includes(cs)) ids.add(h.id);
		}
		out.set(c.seq, ids);
	}
	return out;
}

/** Highlight ids for a cluster = union across its chunks, in source order. */
function clusterHighlightIds(cluster: ClusterLite, chunkMap: Map<number, Set<string>>, order: string[]): string[] {
	const set = new Set<string>();
	for (const seq of cluster.chunkSeqs) for (const id of chunkMap.get(seq) ?? []) set.add(id);
	return order.filter((id) => set.has(id));
}

export function reconcile(
	clusters: ClusterLite[],
	chunkMap: Map<number, Set<string>>,
	highlights: Highlight[],
	existingNotes: ExistingNote[],
): ReconcilePlan {
	const order = highlights.map((h) => h.id);
	const noted = new Set<string>(existingNotes.flatMap((n) => n.highlightIds));

	const plans: ClusterPlan[] = [];
	let settled = 0;

	for (const cluster of clusters) {
		const ids = clusterHighlightIds(cluster, chunkMap, order);
		if (ids.length === 0) continue; // a chunk with no matched highlight (shouldn't happen)
		const newIds = ids.filter((id) => !noted.has(id));

		const related = existingNotes
			.map((n) => ({ id: n.id, title: n.title, link: n.link, coveredHighlightIds: ids.filter((h) => n.highlightIds.includes(h)) }))
			.filter((r) => r.coveredHighlightIds.length > 0);

		if (newIds.length === 0 && related.length <= 1) {
			settled++;
			continue;
		}

		let suggestion: Suggestion;
		if (related.length === 0) suggestion = "new";
		else if (related.length >= 2) suggestion = "split";
		else suggestion = newIds.length > 0 ? "extend" : "settled";

		plans.push({
			index: cluster.index,
			highlightIds: ids,
			newHighlightIds: newIds,
			excerpts: cluster.excerpts,
			relatedNotes: related,
			suggestion,
		});
	}

	return {
		clusters: plans,
		settledCount: settled,
		newHighlightCount: order.filter((id) => !noted.has(id)).length,
		totalHighlightCount: order.length,
	};
}
