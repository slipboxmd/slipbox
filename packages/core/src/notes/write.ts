import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { SlipboxConfig } from "../config/types.js";
import { dirFor } from "../config/slipbox-config.js";
import type { SourceMeta } from "../extract/types.js";
import { stringifyFrontmatter } from "../util/frontmatter.js";
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
 * Write the full extracted source text to `sources/` — this is what QMD chunks +
 * clusters, so it is written as RAW markdown (no frontmatter) to keep chunk text
 * clean. Provenance lives in the matching `references/` record.
 */
export async function writeSource(config: SlipboxConfig, id: string, _meta: SourceMeta, markdown: string): Promise<NoteRef> {
	const absDir = dirFor(config, "sources");
	await mkdir(absDir, { recursive: true });
	const path = join(absDir, `${id}.md`);
	await writeFile(path, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
	const relPath = relative(config.root, path);
	const relNoExt = relPath.replace(/\.md$/, "");
	return { id, path, relPath, link: linkFor(config, relNoExt, id) };
}

/** Write the reference record (bibliographic metadata for a source). */
export async function writeReference(config: SlipboxConfig, id: string, meta: SourceMeta, source: NoteRef): Promise<NoteRef> {
	const data: Record<string, unknown> = {
		id,
		type: "reference",
		title: meta.title,
		kind: meta.kind,
		origin: meta.origin,
		source: source.link,
		created: today(),
	};
	if (meta.author) data.author = meta.author;
	if (meta.date) data.date = meta.date;
	const body = `# ${meta.title}\n\nSource: ${source.link}\n`;
	return persist(config, dirFor(config, "references"), id, data, body);
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

export interface ReferenceNoteInput {
	referenceLink: string;
	title: string;
	summary: string;
	/** Links to the literature notes distilled from this source. */
	literatureLinks: string[];
}

/** Write the source-level summary linking to its literature notes. */
export async function writeReferenceNote(config: SlipboxConfig, input: ReferenceNoteInput): Promise<NoteRef> {
	const id = makeId(input.title, config.notes.id_style);
	const data: Record<string, unknown> = {
		id,
		type: "reference-note",
		title: input.title,
		source: input.referenceLink,
		links: input.literatureLinks,
		created: today(),
	};
	const list = input.literatureLinks.map((l) => `- ${l}`).join("\n");
	const body = `${input.summary.trim()}\n\n## Literature notes\n\n${list}\n`;
	return persist(config, dirFor(config, "reference_notes"), id, data, body);
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}
