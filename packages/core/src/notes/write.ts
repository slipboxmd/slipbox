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
}

/** Write one atomic literature note. */
export async function writeLiterature(config: SlipboxConfig, input: LiteratureNoteInput): Promise<NoteRef> {
	const id = makeId(input.title, config.notes.id_style);
	const data: Record<string, unknown> = {
		id,
		type: "literature-note",
		title: input.title,
		source: input.sourceLink,
		chunks: input.chunks ?? [],
		tags: input.tags ?? [],
		links: input.links ?? [],
		created: today(),
	};
	return persist(config, dirFor(config, "literature_notes"), id, data, input.body.trim() + "\n");
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
