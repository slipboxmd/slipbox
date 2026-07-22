export type SearchMode = "query" | "vsearch" | "search";

export interface SlipboxPaths {
	references: string;
	reference_notes: string;
	literature_notes: string;
	permanent_notes: string;
	maps: string;
	sources: string;
	index: string;
}

export interface SlipboxConfig {
	/** Absolute path to the slipbox root (the directory containing `.slipbox`). */
	root: string;
	/** Whether an actual `.slipbox` file was found (vs. defaults). */
	found: boolean;
	paths: SlipboxPaths;
	qmd: {
		collection: string;
		search_mode: SearchMode;
	};
	clustering: {
		method: string;
		/** Cosine similarity threshold for graph edges (0..1). */
		threshold: number;
		/** Minimum chunks for a cluster to become a literature note. */
		min_cluster_size: number;
	};
	notes: {
		id_style: "timestamp" | "slug" | "uid";
		link_style: "wikilink" | "markdown";
		frontmatter: "yaml";
	};
	/** Free-form house-style guidance (the `.slipbox` markdown body). */
	houseStyle: string;
}

export const DEFAULT_PATHS: SlipboxPaths = {
	references: "references/",
	reference_notes: "reference-notes/",
	literature_notes: "literature-notes/",
	permanent_notes: "permanent-notes/",
	maps: "maps/",
	sources: "sources/",
	index: ".qmd/",
};
