import type { Highlight, ReadwiseSource } from "./types.js";

/**
 * Parse the JSON the agent fetched with the `readwise` CLI into our normalized
 * shape. We do NOT wrap the CLI — the agent calls `readwise … --json` directly
 * (that's what the readwise-cli skill is for) and hands us the output. This just
 * tolerates the CLI's field-name variations so the capture builder gets a clean
 * `ReadwiseSource`.
 */

function asArray(v: unknown): unknown[] {
	if (Array.isArray(v)) return v;
	if (v && typeof v === "object") {
		const r = v as Record<string, unknown>;
		for (const k of ["results", "highlights", "data"]) {
			if (Array.isArray(r[k])) return r[k] as unknown[];
		}
	}
	return [];
}

function str(o: Record<string, unknown>, ...keys: string[]): string | undefined {
	for (const k of keys) {
		const v = o[k];
		if (typeof v === "string" && v.trim()) return v.trim();
		if (typeof v === "number") return String(v);
	}
	return undefined;
}

/** Normalize one highlight object; returns null if it lacks an id or text. */
export function normalizeHighlight(raw: unknown): Highlight | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const id = str(o, "id", "highlight_id", "hid");
	const text = str(o, "text", "plaintext", "highlight", "content");
	if (!id || !text) return null;
	const tags = Array.isArray(o.tags)
		? (o.tags as unknown[]).map((t) => (typeof t === "string" ? t : (t as { name?: string })?.name)).filter((t): t is string => !!t)
		: [];
	return {
		id,
		text,
		note: str(o, "note", "highlight_note"),
		location: typeof o.location === "number" ? o.location : undefined,
		tags,
		highlightedAt: str(o, "highlighted_at", "highlightedAt", "created_at"),
	};
}

export interface SourceMetaOverrides {
	product?: "readwise" | "reader";
	id?: string;
	title?: string;
	author?: string;
	category?: string;
	url?: string;
	cover?: string;
}

/**
 * Turn fetched Readwise JSON + explicit metadata into a `ReadwiseSource`.
 *
 * The JSON is whatever `readwise readwise-list-highlights --book-id … --json` (or
 * a Reader equivalent) produced: an array of highlights, or an object wrapping
 * them (optionally with book metadata). Metadata found in the JSON is used as a
 * fallback; the caller's overrides (which the agent read while fetching) win.
 */
export function parseSource(json: unknown, meta: SourceMetaOverrides = {}): ReadwiseSource {
	const highlights = asArray(json)
		.map(normalizeHighlight)
		.filter((h): h is Highlight => !!h);

	const root = (json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {}) as Record<string, unknown>;
	const book = (root.book ?? {}) as Record<string, unknown>;
	// Some responses attach book fields to each highlight.
	const firstHl = (asArray(json)[0] ?? {}) as Record<string, unknown>;
	const hlBook = (firstHl.book ?? {}) as Record<string, unknown>;

	return {
		product: meta.product ?? "readwise",
		id: meta.id ?? str(root, "id", "book_id") ?? str(hlBook, "id", "book_id") ?? "unknown",
		title: meta.title ?? str(root, "title") ?? str(book, "title") ?? str(hlBook, "title") ?? "Untitled",
		author: meta.author ?? str(root, "author") ?? str(book, "author") ?? str(hlBook, "author"),
		category: meta.category ?? str(root, "category") ?? str(book, "category") ?? str(hlBook, "category"),
		url: meta.url ?? str(root, "source_url", "highlights_url") ?? str(book, "source_url"),
		cover: meta.cover ?? str(root, "cover_image_url") ?? str(book, "cover_image_url"),
		highlights,
	};
}
