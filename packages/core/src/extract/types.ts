export type SourceKind = "text" | "markdown" | "pdf" | "epub" | "html" | "youtube" | "audio";

export interface SourceMeta {
	title: string;
	author?: string;
	date?: string;
	kind: SourceKind;
	/** Original path or URL. */
	origin: string;
}

export interface Extracted {
	markdown: string;
	metadata: SourceMeta;
}

export interface Extractor {
	/** Whether this extractor can handle the given source string. */
	supports(source: string): boolean;
	extract(source: string): Promise<Extracted>;
}
