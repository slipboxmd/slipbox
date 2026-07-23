/**
 * Strip common source boilerplate before the text is chunked/embedded, so junk
 * (licenses, headers) never becomes a candidate literature note.
 *
 * Currently handles Project Gutenberg's start/end markers, which bracket the
 * actual work and fence off the header metadata + license footer. Safe on
 * non-Gutenberg text (markers absent → returned unchanged).
 */
const PG_START = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;
const PG_END = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i;

export interface CleanResult {
	text: string;
	/** Human-readable note about what was removed, or null if nothing changed. */
	removed: string | null;
}

export function cleanSourceText(text: string): CleanResult {
	let out = text;
	const notes: string[] = [];

	const start = out.match(PG_START);
	if (start && start.index !== undefined) {
		const afterMarker = start.index + start[0].length;
		out = out.slice(afterMarker);
		notes.push("Project Gutenberg header/metadata");
	}

	const end = out.match(PG_END);
	if (end && end.index !== undefined) {
		out = out.slice(0, end.index);
		notes.push("Project Gutenberg license footer");
	}

	out = out.trim();
	return { text: out, removed: notes.length ? notes.join(" + ") : null };
}
