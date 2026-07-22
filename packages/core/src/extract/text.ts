import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { Extracted, Extractor, SourceKind } from "./types.js";

const TEXT_EXTS = new Set([".txt", ".md", ".markdown", ".mdown", ".text"]);

/** Passthrough extractor for plain-text and markdown files (Phase-1 M0). */
export const textExtractor: Extractor = {
	supports(source: string): boolean {
		return TEXT_EXTS.has(extname(source).toLowerCase());
	},
	async extract(source: string): Promise<Extracted> {
		const markdown = await readFile(source, "utf8");
		const ext = extname(source).toLowerCase();
		const kind: SourceKind = ext === ".txt" || ext === ".text" ? "text" : "markdown";
		return {
			markdown,
			metadata: {
				title: deriveTitle(markdown, source),
				kind,
				origin: source,
			},
		};
	},
};

function deriveTitle(markdown: string, source: string): string {
	const heading = markdown.match(/^\s*#\s+(.+?)\s*$/m);
	if (heading) return heading[1]!.trim();
	return basename(source, extname(source)).replace(/[-_]+/g, " ").trim();
}
