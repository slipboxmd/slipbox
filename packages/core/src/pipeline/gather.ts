import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { dirFor } from "../config/slipbox-config.js";
import type { SlipboxConfig } from "../config/types.js";
import { search } from "../qmd/cli.js";
import { qmdDbPath } from "../qmd/cli.js";
import { readChunks } from "../qmd/vectors.js";
import { parseFrontmatter } from "../util/frontmatter.js";
import { cluster } from "./cluster.js";

/**
 * A permanent note is warranted where literature notes converge. `slipbox_gather`
 * retrieves and ORGANIZES literature notes into candidate groupings for the author
 * to write up — it runs no LLM and writes no prose. Three seed modes (concept
 * query / ambient density / source-scoped) all reduce to "gather a coherent set of
 * literature notes" over the per-note vectors QMD already produces.
 */
export interface GatherCandidate {
	/** Heuristic theme label from the members' shared title terms. */
	label: string;
	/** The literature notes in this grouping. */
	members: Array<{ link: string; title: string }>;
	/** Mean intra-set cosine similarity (0..1); 1 for a singleton. */
	cohesion: number;
	/** Distinct references the members trace to. */
	sources: string[];
	/** Coverage vs. existing permanent notes' `draws_on`. */
	coverage: "new" | "partial" | "covered";
}

export type GatherMode = "concept-query" | "source-scoped" | "ambient";

export interface GatherResult {
	mode: GatherMode;
	/** Total literature notes considered (after any source scoping). */
	notes: number;
	candidates: GatherCandidate[];
}

export interface GatherOptions {
	/** Concept-query seed — a phrase to rank literature notes against. */
	query?: string;
	/** Source-scoped seed — reference ids/links to scope to. */
	sources?: string[];
	/** Ambient mode hides fully-covered neighborhoods unless this is set. */
	includeCovered?: boolean;
	/** Max candidates to return. */
	limit?: number;
}

/** One literature note with its averaged, normalized embedding + provenance. */
export interface GatherNote {
	/** Path relative to the slipbox root (e.g. `literature-notes/<id>.md`). */
	path: string;
	/** `[[literature-notes/<id>]]` (or markdown link) for this note. */
	link: string;
	title: string;
	/** The note's `source:` frontmatter (a reference link), if any. */
	source?: string;
	/** Embedding — normalized internally, so raw averages are fine. */
	vector: number[];
	/** The note's existing `links:` frontmatter. */
	links: string[];
}

function normalize(v: number[]): number[] {
	let norm = 0;
	for (const x of v) norm += x * x;
	norm = Math.sqrt(norm) || 1;
	return v.map((x) => x / norm);
}

function dot(a: number[], b: number[]): number {
	let s = 0;
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
	return s;
}

/** Strip a wikilink/markdown link to its root-relative target with no `.md`. */
function linkTarget(link: string): string {
	const md = link.match(/\]\(([^)]+)\)/);
	const target = md ? md[1]! : link.replace(/\[\[|\]\]/g, "").trim();
	return target.replace(/\.md$/, "");
}

/** The bare id of a reference link/id (last path segment, brackets stripped). */
function sourceId(ref: string): string {
	return basename(linkTarget(ref));
}

/** Path key used for coverage lookup: the note path without its `.md` extension. */
function noteKey(path: string): string {
	return path.replace(/\.md$/, "");
}

/**
 * Mean pairwise cosine similarity across a set of vectors (each normalized here).
 * A singleton has no pairs, so it scores 1 (perfectly self-coherent, but thin).
 */
export function cohesionOf(vectors: number[][]): number {
	if (vectors.length <= 1) return 1;
	const unit = vectors.map(normalize);
	let sum = 0;
	let pairs = 0;
	for (let i = 0; i < unit.length; i++) {
		for (let j = i + 1; j < unit.length; j++) {
			sum += dot(unit[i]!, unit[j]!);
			pairs++;
		}
	}
	return pairs === 0 ? 1 : sum / pairs;
}

const STOPWORDS = new Set([
	"the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "is", "are", "as", "that", "this",
	"with", "by", "it", "its", "be", "how", "what", "why", "from", "at", "but", "not", "can", "we",
	"you", "they", "their", "our", "your", "no", "do", "does", "than", "into", "about", "over", "all",
]);

/**
 * Heuristic theme label for a grouping: the terms shared across the most member
 * titles, most-frequent first (ties broken by first appearance). A singleton keeps
 * its own title; a group with nothing in common falls back to its first title.
 */
export function labelFor(titles: string[]): string {
	if (titles.length === 0) return "";
	if (titles.length === 1) return titles[0]!.trim();

	const order: string[] = [];
	const count = new Map<string, number>();
	for (const title of titles) {
		const seen = new Set<string>();
		for (const w of title.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
			if (w.length < 3 || STOPWORDS.has(w) || seen.has(w)) continue;
			seen.add(w);
			if (!count.has(w)) order.push(w);
			count.set(w, (count.get(w) ?? 0) + 1);
		}
	}

	const shared = order.filter((w) => (count.get(w) ?? 0) >= 2);
	if (shared.length === 0) return titles[0]!.trim();
	shared.sort((a, b) => (count.get(b)! - count.get(a)!) || (order.indexOf(a) - order.indexOf(b)));
	return shared.slice(0, 3).join(" ");
}

/** new = none covered, covered = all covered, partial = some covered. */
function coverageOf(members: GatherNote[], covered: Set<string>): GatherCandidate["coverage"] {
	if (members.length === 0) return "new";
	let hit = 0;
	for (const m of members) if (covered.has(noteKey(m.path))) hit++;
	if (hit === 0) return "new";
	if (hit === members.length) return "covered";
	return "partial";
}

/** Assemble one candidate from a set of literature notes. */
export function buildCandidate(members: GatherNote[], covered: Set<string>): GatherCandidate {
	const sources: string[] = [];
	const seen = new Set<string>();
	for (const m of members) {
		if (m.source && !seen.has(m.source)) {
			seen.add(m.source);
			sources.push(m.source);
		}
	}
	return {
		label: labelFor(members.map((m) => m.title)),
		members: members.map((m) => ({ link: m.link, title: m.title })),
		cohesion: cohesionOf(members.map((m) => m.vector)),
		sources,
		coverage: coverageOf(members, covered),
	};
}

/** Keep only notes whose `source:` traces to one of the given reference ids/links. */
export function filterBySource(notes: GatherNote[], sources: string[]): GatherNote[] {
	const want = new Set(sources.map(sourceId));
	return notes.filter((n) => n.source !== undefined && want.has(sourceId(n.source)));
}

export interface GroupOptions {
	threshold: number;
	minSize: number;
	limit?: number;
	/** Keep fully-covered neighborhoods (default false). */
	includeCovered?: boolean;
}

/**
 * Cluster notes by embedding similarity (average-linkage, reusing `cluster()`),
 * turn each cluster into a candidate, drop fully-covered ones unless asked to keep
 * them, and rank by cohesion × size (density) before applying `limit`. Partially
 * covered neighborhoods are kept — there is still an un-synthesized idea there.
 */
export function groupNotes(notes: GatherNote[], covered: Set<string>, opts: GroupOptions): GatherCandidate[] {
	const clusters = cluster(notes, { threshold: opts.threshold, minSize: opts.minSize });
	let candidates = clusters.map((members) => buildCandidate(members, covered));
	if (!opts.includeCovered) candidates = candidates.filter((c) => c.coverage !== "covered");
	candidates.sort((a, b) => b.cohesion * b.members.length - a.cohesion * a.members.length);
	return opts.limit !== undefined ? candidates.slice(0, opts.limit) : candidates;
}

/** Load every literature note as an averaged, normalized vector plus its frontmatter. */
async function loadNotes(config: SlipboxConfig): Promise<GatherNote[]> {
	const litRel = config.paths.literature_notes.replace(/\/$/, "");
	// Filter to the literature-notes dir so we never load source-chunk vectors.
	const chunks = (await readChunks(qmdDbPath(config.root), litRel)).filter((c) => c.path.includes(`${litRel}/`));
	const byNote = new Map<string, number[][]>();
	for (const c of chunks) {
		if (!byNote.has(c.path)) byNote.set(c.path, []);
		byNote.get(c.path)!.push(c.vector);
	}

	const notes: GatherNote[] = [];
	for (const [path, vecs] of byNote) {
		const dim = vecs[0]!.length;
		const avg = new Array<number>(dim).fill(0);
		for (const v of vecs) for (let i = 0; i < dim; i++) avg[i]! += v[i]!;
		const { data } = parseFrontmatter(await readFile(join(config.root, path), "utf8"));
		const relNoExt = noteKey(path);
		const label = basename(relNoExt);
		notes.push({
			path,
			link: config.notes.link_style === "markdown" ? `[${label}](${relNoExt}.md)` : `[[${relNoExt}]]`,
			title: typeof data.title === "string" ? data.title : label,
			source: typeof data.source === "string" ? data.source : undefined,
			vector: normalize(avg),
			links: Array.isArray(data.links) ? data.links.map(String) : [],
		});
	}
	return notes;
}

/** Set of literature-note keys already covered by some permanent note's `draws_on`. */
async function loadCovered(config: SlipboxConfig): Promise<Set<string>> {
	const dir = dirFor(config, "permanent_notes");
	if (!existsSync(dir)) return new Set();
	const covered = new Set<string>();
	for (const file of (await readdir(dir)).filter((f) => f.endsWith(".md"))) {
		try {
			const { data } = parseFrontmatter(await readFile(join(dir, file), "utf8"));
			const drawsOn = Array.isArray(data.draws_on) ? data.draws_on.map(String) : [];
			for (const d of drawsOn) covered.add(linkTarget(d));
		} catch {
			/* skip an unreadable permanent note */
		}
	}
	return covered;
}

/**
 * Discover candidate permanent notes over the existing literature-note embeddings.
 * The mode is selected by which seed is present: `query` → concept-query,
 * `sources` → source-scoped, neither → ambient density. Coverage is computed
 * against existing permanent notes so the author isn't pointed at already-written
 * ideas. Pure grouping/scoring lives in the exported helpers; this does the I/O.
 */
export async function gather(config: SlipboxConfig, opts: GatherOptions = {}): Promise<GatherResult> {
	const covered = await loadCovered(config);
	const threshold = config.clustering.threshold;
	const minSize = config.clustering.min_cluster_size;

	// Concept-query: rank literature notes against the phrase via the same QMD
	// vector search `slipbox_search` uses, then gather the hits into one candidate.
	if (opts.query && opts.query.trim()) {
		const all = await loadNotes(config);
		const byKey = new Map(all.map((n) => [noteKey(n.path), n]));
		const results = await search(config.root, opts.query, "vsearch", { collection: config.qmd.collection, limit: opts.limit ?? 12 });
		const members: GatherNote[] = [];
		const taken = new Set<string>();
		for (const r of results) {
			const key = noteKey(r.file);
			const note = byKey.get(key);
			if (note && !taken.has(key)) {
				taken.add(key);
				members.push(note);
			}
		}
		return { mode: "concept-query", notes: all.length, candidates: members.length ? [buildCandidate(members, covered)] : [] };
	}

	const all = await loadNotes(config);

	// Source-scoped: keep only notes from the given sources, then group by similarity.
	if (opts.sources && opts.sources.length) {
		const scoped = filterBySource(all, opts.sources);
		return {
			mode: "source-scoped",
			notes: scoped.length,
			candidates: groupNotes(scoped, covered, { threshold, minSize, limit: opts.limit, includeCovered: true }),
		};
	}

	// Ambient: cluster all notes, hide fully-covered neighborhoods, rank by density.
	return {
		mode: "ambient",
		notes: all.length,
		candidates: groupNotes(all, covered, { threshold, minSize, limit: opts.limit, includeCovered: opts.includeCovered }),
	};
}
