/** A single highlight pulled from Readwise, normalized across the two products. */
export interface Highlight {
	/** Stable Readwise highlight id — the anchor for incremental sync + note provenance. */
	id: string;
	/** The highlighted passage. */
	text: string;
	/** A note the user attached to the highlight in Readwise, if any. */
	note?: string;
	/** Location within the source (page/offset/percent), for ordering + display. */
	location?: number;
	/** Tags on the highlight. */
	tags: string[];
	/** ISO timestamp the passage was highlighted. */
	highlightedAt?: string;
}

/** A source in Readwise (a book, article, podcast, or Reader document) + its highlights. */
export interface ReadwiseSource {
	/** Which Readwise product this came from. */
	product: "readwise" | "reader";
	/** Readwise book id or Reader document id. */
	id: string;
	title: string;
	author?: string;
	/** books | articles | podcasts | tweets | pdf | epub … (Readwise `category`). */
	category?: string;
	/** Original document / highlights URL. */
	url?: string;
	/** Cover image URL. */
	cover?: string;
	highlights: Highlight[];
}

/** A lightweight source listing entry (for pick-a-source). */
export interface SourceSummary {
	product: "readwise" | "reader";
	id: string;
	title: string;
	author?: string;
	category?: string;
	highlightCount?: number;
	lastHighlightedAt?: string;
}
