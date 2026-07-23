import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dirFor } from "../config/slipbox-config.js";
import type { SlipboxConfig } from "../config/types.js";
import { qmdDbPath } from "../qmd/cli.js";
import { readChunks } from "../qmd/vectors.js";
import { parseFrontmatter, stringifyFrontmatter } from "../util/frontmatter.js";

export interface AutolinkOptions {
	/** Max related notes to link from each note. */
	k: number;
	/** Minimum cosine similarity for a strong link (note-to-note, normalized). */
	threshold: number;
	/** Guarantee at least this many links per note (nearest neighbors), so nothing is orphaned. */
	minLinks: number;
	/** Never link below this similarity, even to satisfy minLinks. */
	floor: number;
	/**
	 * When false (default), only compute links FOR notes that have none yet (the
	 * newly-written ones) — O(new × N) instead of O(N²), so it stays cheap as the
	 * slipbox grows. When true, recompute links for every note.
	 */
	relinkAll: boolean;
}

export interface AutolinkResult {
	/** Total literature notes in the slipbox. */
	notes: number;
	/** Notes we computed links for this run (new ones, or all if relinkAll). */
	linkedFrom: number;
	linksAdded: number;
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

/** `[[literature-notes/<id>]]` (or markdown link) for a note path relative to root. */
function wikilink(config: SlipboxConfig, relPath: string): string {
	const relNoExt = relPath.replace(/\.md$/, "");
	const label = relNoExt.split("/").pop() ?? relNoExt;
	return config.notes.link_style === "markdown" ? `[${label}](${relNoExt}.md)` : `[[${relNoExt}]]`;
}

interface NoteState {
	path: string;
	vec: number[];
	abs: string;
	data: Record<string, unknown>;
	body: string;
	links: Set<string>;
}

/**
 * Connect literature notes to one another by embedding similarity, across ALL
 * sources in the slipbox. Links are mutual and merged into each note's `links:`
 * frontmatter (existing links preserved), so it's idempotent.
 *
 * By default this is **incremental**: it only computes neighbors for notes that
 * don't have links yet (the newly-written ones), which keeps each ingest at
 * O(new × N) rather than O(N²) as the slipbox grows. `relinkAll` recomputes all.
 * Assumes the notes are embedded (run reindex first).
 */
export async function autolink(config: SlipboxConfig, opts: AutolinkOptions): Promise<AutolinkResult> {
	const litRel = config.paths.literature_notes.replace(/\/$/, "");

	// One averaged, normalized vector per note. Filtered to literature notes in the
	// query so we never load source-chunk vectors (would blow the heap on a corpus).
	const chunks = (await readChunks(qmdDbPath(config.root), litRel)).filter((c) => c.path.includes(`${litRel}/`));
	const byNote = new Map<string, number[][]>();
	for (const c of chunks) {
		if (!byNote.has(c.path)) byNote.set(c.path, []);
		byNote.get(c.path)!.push(c.vector);
	}

	const notes: NoteState[] = [];
	for (const [path, vecs] of byNote) {
		const dim = vecs[0]!.length;
		const avg = new Array<number>(dim).fill(0);
		for (const v of vecs) for (let i = 0; i < dim; i++) avg[i]! += v[i]!;
		const abs = join(config.root, path);
		const { data, body } = parseFrontmatter(await readFile(abs, "utf8"));
		const links = new Set<string>(Array.isArray(data.links) ? data.links.map(String) : []);
		notes.push({ path, vec: normalize(avg), abs, data, body, links });
	}

	const n = notes.length;
	const toAdd: Set<number>[] = notes.map(() => new Set<number>());
	const fromIdx = notes.map((nt, i) => [nt, i] as const).filter(([nt]) => opts.relinkAll || nt.links.size === 0).map(([, i]) => i);

	for (const i of fromIdx) {
		const sims: Array<[number, number]> = [];
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			sims.push([dot(notes[i]!.vec, notes[j]!.vec), j]);
		}
		sims.sort((a, b) => b[0] - a[0]);
		let added = 0;
		for (const [s, j] of sims) {
			if (added >= opts.k) break;
			if (s < opts.threshold && !(added < opts.minLinks && s >= opts.floor)) break;
			toAdd[i]!.add(j);
			toAdd[j]!.add(i); // mutual
			added++;
		}
	}

	let linksAdded = 0;
	for (let i = 0; i < n; i++) {
		if (toAdd[i]!.size === 0) continue;
		const before = notes[i]!.links.size;
		for (const j of toAdd[i]!) notes[i]!.links.add(wikilink(config, notes[j]!.path));
		if (notes[i]!.links.size === before) continue;
		linksAdded += notes[i]!.links.size - before;
		notes[i]!.data.links = [...notes[i]!.links];
		await writeFile(notes[i]!.abs, stringifyFrontmatter(notes[i]!.data, notes[i]!.body), "utf8");
	}

	return { notes: n, linkedFrom: fromIdx.length, linksAdded };
}
