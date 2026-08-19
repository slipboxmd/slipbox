import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { SlipboxConfig } from "../config/types.js";
import { dirFor } from "../config/slipbox-config.js";
import type { SourceMeta } from "../extract/types.js";
import { parseFrontmatter, stringifyFrontmatter } from "../util/frontmatter.js";
import { makeId } from "./ids.js";

export interface NoteRef {
	id: string;
	/** Absolute path to the note file. */
	path: string;
	/** Path relative to the slipbox root (used in links/frontmatter). */
	relPath: string;
	/** `[[wikilink]]` or `[markdown](path)` per config. */
	link: string;
}

function linkFor(config: SlipboxConfig, relPathNoExt: string, label: string): string {
	return config.notes.link_style === "markdown" ? `[${label}](${relPathNoExt}.md)` : `[[${relPathNoExt}]]`;
}

async function persist(config: SlipboxConfig, absDir: string, id: string, data: Record<string, unknown>, body: string): Promise<NoteRef> {
	await mkdir(absDir, { recursive: true });
	const path = join(absDir, `${id}.md`);
	await writeFile(path, stringifyFrontmatter(data, body), "utf8");
	const relPath = relative(config.root, path);
	const relNoExt = relPath.replace(/\.md$/, "");
	return { id, path, relPath, link: linkFor(config, relNoExt, String(data.title ?? id)) };
}

/**
 * Write the cleaned, extracted source text to `extracted/` — this is what QMD
 * chunks + clusters, so it is RAW markdown (no frontmatter) to keep chunk text
 * clean. The user's original file stays untouched in `sources/`; provenance is
 * recorded in the matching `references/` record.
 */
export async function writeExtracted(config: SlipboxConfig, id: string, _meta: SourceMeta, markdown: string): Promise<NoteRef> {
	const absDir = dirFor(config, "extracted");
	await mkdir(absDir, { recursive: true });
	const path = join(absDir, `${id}.md`);
	await writeFile(path, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
	const relPath = relative(config.root, path);
	const relNoExt = relPath.replace(/\.md$/, "");
	return { id, path, relPath, link: linkFor(config, relNoExt, id) };
}

/**
 * For URL sources (web page / video / feed item), write the human-readable
 * "capture" into `sources/` — frontmatter (title, origin URL, kind, date) + the
 * fetched markdown. This is the archival source of record; the cleaned body still
 * goes to `extracted/` for QMD. (For dropped files the original already lives in
 * sources/, so this is skipped.)
 */
export async function writeSourceCapture(config: SlipboxConfig, id: string, meta: SourceMeta, markdown: string): Promise<NoteRef> {
	const absDir = dirFor(config, "sources");
	await mkdir(absDir, { recursive: true });
	const path = join(absDir, `${id}.md`);
	const data: Record<string, unknown> = { id, type: "source", title: meta.title, kind: meta.kind, origin: meta.origin, captured: today() };
	if (meta.author) data.author = meta.author;
	if (meta.date) data.date = meta.date;
	if (meta.archived) data.archived = meta.archived;
	if (meta.archived_date) data.archived_date = meta.archived_date;
	await writeFile(path, stringifyFrontmatter(data, markdown), "utf8");
	const relPath = relative(config.root, path);
	return { id, path, relPath, link: linkFor(config, relPath.replace(/\.md$/, ""), meta.title) };
}

/**
 * Write the reference record for a source (bibliographic metadata). This is the
 * single per-source file; its whole-source summary + literature-note links are
 * filled in later by `updateReference`, so there is no separate reference-note.
 */
export async function writeReference(config: SlipboxConfig, id: string, meta: SourceMeta): Promise<NoteRef> {
	const data: Record<string, unknown> = {
		id,
		type: "reference",
		title: meta.title,
		kind: meta.kind,
		origin: meta.origin,
		created: today(),
	};
	if (meta.author) data.author = meta.author;
	if (meta.date) data.date = meta.date;
	// A web source can change or disappear; the Wayback snapshot pins what we read.
	if (meta.archived) data.archived = meta.archived;
	if (meta.archived_date) data.archived_date = meta.archived_date;
	return persist(config, dirFor(config, "references"), id, data, `# ${meta.title}\n`);
}

export interface LiteratureNoteInput {
	title: string;
	body: string;
	/** Link to the source reference (as emitted by ingest, e.g. `[[references/<id>]]`). */
	sourceLink: string;
	tags?: string[];
	/** QMD chunk seq indices this idea came from. */
	chunks?: number[];
	links?: string[];
	/**
	 * Reuse an existing id instead of deriving one from the title — how a note is
	 * *updated* rather than created (same id → overwrite). Omit to create a new note.
	 */
	id?: string;
	/**
	 * Extra frontmatter keys to merge in — e.g. `readwise_highlights` provenance
	 * from the @slipbox/readwise package. Kept generic so core stays source-agnostic.
	 */
	extra?: Record<string, unknown>;
}

/** Write one atomic literature note (or overwrite an existing one when `id` is given). */
export async function writeLiterature(config: SlipboxConfig, input: LiteratureNoteInput): Promise<NoteRef> {
	const id = input.id ?? makeId(input.title, config.notes.id_style);
	const data: Record<string, unknown> = {
		id,
		type: "literature-note",
		title: input.title,
		source: input.sourceLink,
		chunks: input.chunks ?? [],
		tags: input.tags ?? [],
		links: input.links ?? [],
		created: today(),
		...input.extra,
	};
	return persist(config, dirFor(config, "literature_notes"), id, data, input.body.trim() + "\n");
}

export interface PermanentNoteInput {
	title: string;
	/** The author's prose — a permanent note is always in the author's voice. */
	body: string;
	/** Links DOWN to the literature notes this idea synthesizes, e.g. `[[literature-notes/<id>]]`. */
	drawsOn: string[];
	/** Links ACROSS to related permanent notes, e.g. `[[permanent-notes/<id>]]`. */
	links?: string[];
	tags?: string[];
	/** Reuse an existing id to overwrite (how a permanent note is edited). Omit to create. */
	id?: string;
}

/** Strip a wikilink/markdown link down to its root-relative target with no `.md`. */
function linkTarget(link: string): string {
	const md = link.match(/\]\(([^)]+)\)/);
	const target = md ? md[1]! : link.replace(/\[\[|\]\]/g, "").trim();
	return target.replace(/\.md$/, "");
}

/**
 * The `sources` provenance of a permanent note is DERIVED at write time from the
 * `source:` frontmatter of each literature note it draws on — distinct, in the
 * order first seen. A draws_on link that can't be resolved is skipped (the note
 * may have been renamed); it never blocks the write.
 */
async function deriveSources(config: SlipboxConfig, drawsOn: string[]): Promise<string[]> {
	const sources: string[] = [];
	const seen = new Set<string>();
	for (const link of drawsOn) {
		const path = join(config.root, `${linkTarget(link)}.md`);
		if (!existsSync(path)) continue;
		try {
			const { data } = parseFrontmatter(await readFile(path, "utf8"));
			const source = typeof data.source === "string" ? data.source : undefined;
			if (source && !seen.has(source)) {
				seen.add(source);
				sources.push(source);
			}
		} catch {
			/* unreadable note — skip its provenance rather than fail the write */
		}
	}
	return sources;
}

/**
 * Write one permanent note (or overwrite an existing one when `id` is given). A
 * permanent note sits ABOVE the literature notes: it links down to them
 * (`draws_on`) and across to related permanent notes (`links`). Its `sources` are
 * derived from the draws_on notes' `source:` fields. The body is the author's
 * prose — this writer never generates it; the agent persists what the author wrote.
 */
export async function writePermanent(config: SlipboxConfig, input: PermanentNoteInput): Promise<NoteRef> {
	const id = input.id ?? makeId(input.title, config.notes.id_style);
	const data: Record<string, unknown> = {
		id,
		type: "permanent-note",
		title: input.title,
		draws_on: input.drawsOn,
		links: input.links ?? [],
		sources: await deriveSources(config, input.drawsOn),
		tags: input.tags ?? [],
		created: today(),
	};
	return persist(config, dirFor(config, "permanent_notes"), id, data, input.body.trim() + "\n");
}

export interface ReferenceSummaryInput {
	/** The reference link/id from ingest, e.g. `[[references/<id>]]` or `references/<id>`. */
	reference: string;
	summary: string;
	/** Links to the literature notes distilled from this source (stored in frontmatter). */
	literatureLinks: string[];
}

/** Resolve a reference link/id to `<id>` (strips brackets, path, extension). */
function referenceId(reference: string): string {
	return reference.replace(/\[\[|\]\]/g, "").trim().split("/").pop()?.replace(/\.md$/, "") ?? reference;
}

/**
 * Fill in the whole-source summary + literature-note links on the existing
 * reference file (from ingest). One file per source — no separate reference-note.
 * The link list lives only in frontmatter; the body is the summary prose.
 */
export async function updateReference(config: SlipboxConfig, input: ReferenceSummaryInput): Promise<NoteRef> {
	const id = referenceId(input.reference);
	const dir = dirFor(config, "references");
	const path = join(dir, `${id}.md`);
	if (!existsSync(path)) {
		throw new Error(`Reference "${id}" not found in ${dir}. Ingest the source first, then summarize.`);
	}
	const { data, body } = parseFrontmatter(await readFile(path, "utf8"));
	data.links = [...input.literatureLinks];
	const heading = body.match(/^\s*#\s+.+$/m)?.[0] ?? `# ${data.title ?? id}`;
	const nextBody = `${heading}\n\n${input.summary.trim()}\n`;
	await writeFile(path, stringifyFrontmatter(data, nextBody), "utf8");
	const relPath = relative(config.root, path);
	return { id, path, relPath, link: linkFor(config, relPath.replace(/\.md$/, ""), String(data.title ?? id)) };
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}
