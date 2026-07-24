import { audioExtractor } from "./audio.js";
import { cleanSourceText } from "./clean.js";
import { docExtractor } from "./doc.js";
import { pdfExtractor } from "./pdf.js";
import type { Extracted, Extractor } from "./types.js";
import { textExtractor } from "./text.js";
import { isUrl } from "./url.js";
import { webExtractor } from "./web.js";
import { youtubeExtractor } from "./youtube.js";

// Order matters: URL extractors (youtube before generic web) first, then files by
// type. First extractor whose supports() returns true wins.
const EXTRACTORS: Extractor[] = [youtubeExtractor, webExtractor, pdfExtractor, docExtractor, audioExtractor, textExtractor];

export class UnsupportedSourceError extends Error {
	constructor(source: string) {
		super(
			`No extractor supports "${source}". Supported: .txt/.md, .pdf, .epub/.docx/.html, audio ` +
				`(.mp3/.m4a/…), web page URLs, and YouTube URLs.`,
		);
		this.name = "UnsupportedSourceError";
	}
}

/** Dispatch a source (file path or URL) to the first extractor that supports it, then clean. */
export async function extract(source: string): Promise<Extracted> {
	const extractor = EXTRACTORS.find((e) => e.supports(source));
	if (!extractor) throw new UnsupportedSourceError(source);
	const result = await extractor.extract(source);
	const cleaned = cleanSourceText(result.markdown);
	const metadata = {
		...result.metadata,
		title: cleaned.meta.title || result.metadata.title,
		...(cleaned.meta.author ? { author: cleaned.meta.author } : {}),
	};
	return { markdown: cleaned.text, metadata };
}

/** Whether a source string is a URL (vs a local file) — decides if we write a sources/ capture. */
export { isUrl } from "./url.js";
export type { Extracted, Extractor } from "./types.js";
export { textExtractor } from "./text.js";
export { cleanSourceText } from "./clean.js";
export { MissingToolError } from "./exec.js";
