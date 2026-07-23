/**
 * Strip common source boilerplate before the text is chunked/embedded, so junk
 * (licenses, headers) never becomes a candidate literature note — and lift the
 * real title/author out of the header first, since stripping would discard them.
 *
 * Currently handles Project Gutenberg's start/end markers. Safe on non-Gutenberg
 * text (markers absent → returned unchanged, no metadata).
 */
const PG_START = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;
const PG_END = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;

export interface CleanResult {
	text: string;
	/** Human-readable note about what was removed, or null if nothing changed. */
	removed: string | null;
	/** Title / author lifted from the source header, if found. */
	meta: { title?: string; author?: string };
}

export function cleanSourceText(text: string): CleanResult {
	let out = text;
	const notes: string[] = [];
	const meta: { title?: string; author?: string } = {};

	const start = out.match(PG_START);
	if (start && start.index !== undefined) {
		// The Gutenberg header (before the marker) carries "Title:" / "Author:" lines.
		const header = out.slice(0, start.index);
		const title = header.match(/^\s*Title:\s*(.+?)\s*$/im);
		const author = header.match(/^\s*Author:\s*(.+?)\s*$/im);
		if (title) meta.title = title[1]!.trim();
		if (author) meta.author = author[1]!.trim();

		out = out.slice(start.index + start[0].length);
		notes.push("Project Gutenberg header/metadata");
	}

	const end = out.match(PG_END);
	if (end && end.index !== undefined) {
		out = out.slice(0, end.index);
		notes.push("Project Gutenberg license footer");
	}

	out = out.trim();
	return { text: out, removed: notes.length ? notes.join(" + ") : null, meta };
}
