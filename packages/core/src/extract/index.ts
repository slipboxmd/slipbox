import type { Extracted, Extractor } from "./types.js";
import { textExtractor } from "./text.js";

// Order matters: first supporting extractor wins. Phase 1 ships text/markdown;
// pdf/epub/html/youtube/audio extractors land in M2 (guided by external CLIs).
const EXTRACTORS: Extractor[] = [textExtractor];

export class UnsupportedSourceError extends Error {
	constructor(source: string) {
		super(
			`No extractor supports "${source}". Phase-1 supports .txt/.md; ` +
				`pdf/epub/html/youtube/audio are coming (M2). Convert to markdown for now.`,
		);
		this.name = "UnsupportedSourceError";
	}
}

/** Dispatch a source to the first extractor that supports it. */
export async function extract(source: string): Promise<Extracted> {
	const extractor = EXTRACTORS.find((e) => e.supports(source));
	if (!extractor) throw new UnsupportedSourceError(source);
	return extractor.extract(source);
}

export type { Extracted, Extractor } from "./types.js";
export { textExtractor } from "./text.js";
