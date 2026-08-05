import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dirFor, parseFrontmatter, slugify, stringifyFrontmatter, type SlipboxConfig } from "@slipbox/core";
import type { Highlight, ReadwiseSource } from "./types.js";

/**
 * The source capture written into `sources/`.
 *
 * One markdown file per Readwise source: metadata frontmatter + every highlight
 * as a blockquote, each tagged with a stable `<!-- rw:<id> -->` marker. The marker
 * is invisible when rendered but lets a later pull tell which highlights are new,
 * and lets note provenance point back at exact highlights.
 *
 * A pull always writes the FULL current highlight set (idempotent) — no merge
 * logic to get wrong. "What's new" is computed by diffing against the previous
 * capture's markers.
 */

const MARKER = /<!--\s*rw:([^\s>]+)\s*-->/g;

export interface CaptureResult {
	/** Absolute path of the capture file. */
	path: string;
	/** Stable slipbox id (filename stem) for this source. */
	id: string;
	/** Every highlight id in the source now. */
	allHighlightIds: string[];
	/** Highlight ids that weren't in the previous capture (new since last sync). */
	newHighlightIds: string[];
}

/** Ids of highlights already recorded in a capture's text. */
export function parseHighlightIds(text: string): string[] {
	return [...text.matchAll(MARKER)].map((m) => m[1]!);
}

/** Render one highlight: its note (if any) as context, the passage as a blockquote, then the marker. */
function renderHighlight(h: Highlight): string {
	const quote = h.text
		.trim()
		.split(/\r?\n/)
		.map((l) => `> ${l}`)
		.join("\n");
	const parts = [quote];
	if (h.note?.trim()) parts.push(`\n_Note: ${h.note.trim()}_`);
	parts.push(`\n<!-- rw:${h.id} -->`);
	return parts.join("\n");
}

/** Build the capture markdown (frontmatter + body) for a source. */
export function buildCapture(source: ReadwiseSource, id: string, syncedIso: string): string {
	const data: Record<string, unknown> = {
		id,
		type: "source",
		source_kind: source.product === "reader" ? "readwise-reader" : "readwise",
		title: source.title,
	};
	if (source.author) data.author = source.author;
	if (source.category) data.category = source.category;
	data.readwise_id = source.id;
	if (source.url) data.origin = source.url;
	if (source.cover) data.cover = source.cover;
	data.synced = syncedIso;
	data.highlight_count = source.highlights.length;

	const ordered = [...source.highlights].sort((a, b) => (a.location ?? 0) - (b.location ?? 0));
	const body = [`# ${source.title}`, "", ...ordered.map(renderHighlight)].join("\n\n");
	return stringifyFrontmatter(data, body);
}

/**
 * Find an existing capture for this Readwise source (by `readwise_id`), so a
 * re-pull updates the same file even if the title changed. Returns its id + path.
 */
export function findExistingCapture(config: SlipboxConfig, readwiseId: string): { id: string; path: string; text: string } | undefined {
	const dir = dirFor(config, "sources");
	if (!existsSync(dir)) return undefined;
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".md") || file.startsWith(".")) continue;
		const path = join(dir, file);
		let text: string;
		try {
			text = readFileSync(path, "utf8");
		} catch {
			continue;
		}
		const { data } = parseFrontmatter(text);
		if (String(data.readwise_id ?? "") === readwiseId) {
			return { id: String(data.id ?? file.replace(/\.md$/, "")), path, text };
		}
	}
	return undefined;
}

/** A slug for a new source, de-duplicated against existing source files. */
function newId(config: SlipboxConfig, title: string): string {
	const base = `rw-${slugify(title)}` || "rw-source";
	const dir = dirFor(config, "sources");
	let id = base;
	let n = 2;
	while (existsSync(join(dir, `${id}.md`))) id = `${base}-${n++}`;
	return id;
}

/** Write (or overwrite) the capture for a source; report which highlights are new. */
export async function writeCapture(config: SlipboxConfig, source: ReadwiseSource, syncedIso: string): Promise<CaptureResult> {
	const existing = findExistingCapture(config, source.id);
	const id = existing?.id ?? newId(config, source.title);
	const previousIds = existing ? new Set(parseHighlightIds(existing.text)) : new Set<string>();

	const dir = dirFor(config, "sources");
	await mkdir(dir, { recursive: true });
	const path = existing?.path ?? join(dir, `${id}.md`);
	await writeFile(path, buildCapture(source, id, syncedIso), "utf8");

	const allHighlightIds = source.highlights.map((h) => h.id);
	return {
		path,
		id,
		allHighlightIds,
		newHighlightIds: allHighlightIds.filter((h) => !previousIds.has(h)),
	};
}
