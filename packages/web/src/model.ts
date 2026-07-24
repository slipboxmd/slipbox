/** The site's view of a slipbox. Mirrors what the harness writes into markdown. */

export type NoteType = "reference" | "literature-note" | "permanent-note" | "moc";

/** Directory key → note type, matching the harness's `paths` config. */
export const DIR_TYPES = {
	references: "reference",
	literature_notes: "literature-note",
	permanent_notes: "permanent-note",
	maps: "moc",
} as const satisfies Record<string, NoteType>;

export type DirKey = keyof typeof DIR_TYPES;

export interface Note {
	id: string;
	type: NoteType;
	title: string;
	/** Path relative to the slipbox root, without extension — the link target. */
	slug: string;
	/** Site route, e.g. `/notes/20260724T1043-some-idea/`. */
	href: string;
	body: string;
	created?: string;
	tags: string[];
	/** Outgoing links, resolved where possible. */
	links: Link[];
	/** Notes that link here (derived). */
	backlinks: Link[];

	// Reference-only
	kind?: string;
	author?: string;
	date?: string;
	origin?: string;
	archived?: string;
	archivedDate?: string;

	// Literature-note-only
	/** The reference this note came from, resolved. */
	source?: Link;
	/** QMD chunk seqs the idea was distilled from. */
	chunks: number[];
}

export interface Link {
	/** Link target as written (path without extension). */
	target: string;
	/** Display label. */
	label: string;
	/** Route, or undefined when the target doesn't resolve to a note. */
	href?: string;
	type?: NoteType;
}

export interface Slipbox {
	/** Display name for the slipbox (from the root directory name). */
	name: string;
	root: string;
	notes: Note[];
	byId: Map<string, Note>;
	bySlug: Map<string, Note>;
}

export const ROUTE_PREFIX: Record<NoteType, string> = {
	reference: "/references",
	"literature-note": "/notes",
	"permanent-note": "/permanent",
	moc: "/maps",
};

export function hrefFor(type: NoteType, id: string): string {
	return `${ROUTE_PREFIX[type]}/${id}/`;
}

export function notesOfType(slipbox: Slipbox, type: NoteType): Note[] {
	return slipbox.notes.filter((n) => n.type === type);
}

/** Human label for a note type. */
export const TYPE_LABEL: Record<NoteType, string> = {
	reference: "Reference",
	"literature-note": "Literature note",
	"permanent-note": "Permanent note",
	moc: "Map of Content",
};

/**
 * Placeholder route id used when a note type has no notes yet.
 *
 * Next's static export requires every dynamic route to produce at least one path
 * — an empty `generateStaticParams()` fails the build. A fresh slipbox legitimately
 * has no permanent notes or MOCs, so those routes emit this single id and the page
 * renders an empty state instead of a note.
 */
export const EMPTY_ID = "none";

/** Static params for a note type, falling back to the empty-state placeholder. */
export function paramsForType(slipbox: Slipbox, type: NoteType): { id: string }[] {
	const ids = notesOfType(slipbox, type).map((n) => ({ id: n.id }));
	return ids.length > 0 ? ids : [{ id: EMPTY_ID }];
}
