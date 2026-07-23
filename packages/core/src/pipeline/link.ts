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
}

export interface AutolinkResult {
	notes: number;
	linksAdded: number;
	pairs: number;
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

/**
 * Connect literature notes to one another by embedding similarity, across ALL
 * sources in the slipbox. For each note, links its top-`k` most similar other
 * notes (>= `threshold`); links are made mutual and merged into each note's
 * `links:` frontmatter (existing links preserved). Idempotent — safe to re-run.
 *
 * Assumes the notes are already embedded (run reindex first).
 */
export async function autolink(config: SlipboxConfig, opts: AutolinkOptions): Promise<AutolinkResult> {
	const litRel = config.paths.literature_notes.replace(/\/$/, "");

	// One averaged vector per literature note (a note may be >1 chunk). Filter to
	// literature notes IN THE QUERY — reading every source's chunk vectors would
	// blow the heap on a multi-book corpus.
	const chunks = (await readChunks(qmdDbPath(config.root), litRel)).filter((c) => c.path.includes(`${litRel}/`));
	const byNote = new Map<string, number[][]>();
	for (const c of chunks) {
		if (!byNote.has(c.path)) byNote.set(c.path, []);
		byNote.get(c.path)!.push(c.vector);
	}
	const notes = [...byNote.entries()].map(([path, vecs]) => {
		const dim = vecs[0]!.length;
		const avg = new Array<number>(dim).fill(0);
		for (const v of vecs) for (let i = 0; i < dim; i++) avg[i]! += v[i]!;
		return { path, vec: normalize(avg) };
	});

	const n = notes.length;
	const links: Set<number>[] = notes.map(() => new Set<number>());
	for (let i = 0; i < n; i++) {
		const sims: Array<[number, number]> = [];
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			sims.push([dot(notes[i]!.vec, notes[j]!.vec), j]);
		}
		sims.sort((a, b) => b[0] - a[0]);
		let added = 0;
		for (const [s, j] of sims) {
			if (added >= opts.k) break;
			if (s >= opts.threshold) {
				// strong link
			} else if (added < opts.minLinks && s >= opts.floor) {
				// top up toward minLinks with the nearest neighbors (so nothing is orphaned)
			} else {
				break; // sorted desc: nothing left is worth linking
			}
			links[i]!.add(j);
			links[j]!.add(i); // mutual
			added++;
		}
	}

	let linksAdded = 0;
	let pairs = 0;
	for (let i = 0; i < n; i++) {
		if (links[i]!.size === 0) continue;
		const abs = join(config.root, notes[i]!.path);
		const content = await readFile(abs, "utf8");
		const { data, body } = parseFrontmatter(content);
		const existing = new Set<string>(Array.isArray(data.links) ? data.links.map(String) : []);
		const before = existing.size;
		for (const j of links[i]!) existing.add(wikilink(config, notes[j]!.path));
		pairs += links[i]!.size;
		linksAdded += existing.size - before;
		data.links = [...existing];
		await writeFile(abs, stringifyFrontmatter(data, body), "utf8");
	}

	return { notes: n, linksAdded, pairs: pairs / 2 };
}
