import { basename, extname } from "node:path";
import { runTool } from "./exec.js";
import type { Extracted, Extractor, SourceKind } from "./types.js";

const KIND: Record<string, SourceKind> = { ".epub": "epub", ".html": "html", ".htm": "html" };
const PANDOC_EXTS = new Set([".epub", ".docx", ".html", ".htm", ".odt", ".rtf"]);

/** Extract epub / docx / html / odt / rtf to markdown via pandoc. */
export const docExtractor: Extractor = {
	supports(source: string): boolean {
		return PANDOC_EXTS.has(extname(source).toLowerCase());
	},
	async extract(source: string): Promise<Extracted> {
		// Disable every structural markdown extension so pandoc emits plain prose:
		// no raw HTML, wrapper divs/spans, fenced `:::` blocks, `[]{#anchor}` spans,
		// or `{#id .class}` header attributes (which otherwise leak into headings).
		const format =
			"markdown-raw_html-native_divs-native_spans-fenced_divs-bracketed_spans-header_attributes-auto_identifiers-link_attributes-inline_code_attributes-smart";
		const raw = await runTool("pandoc", {
			args: [source, "-t", format, "--wrap=none"],
			install: "brew install pandoc   |  apt-get install pandoc",
			unlocks: "read epub/docx/html sources",
		});
		const md = tidy(raw);
		const ext = extname(source).toLowerCase();
		return {
			markdown: md,
			metadata: { title: deriveTitle(md, source), kind: KIND[ext] ?? "text", origin: source },
		};
	},
};

/** Drop image-only lines and stray anchor artifacts pandoc leaves behind. */
function tidy(md: string): string {
	return md
		.split(/\r?\n/)
		.filter((l) => !/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(l)) // standalone images (covers, figures)
		.join("\n")
		.replace(/\[\]\{[^}]*\}/g, "") // empty `[]{#anchor}` spans
		.replace(/\{#[^}]*\}/g, "") // leftover `{#id}` attribute blocks
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function deriveTitle(md: string, source: string): string {
	const heading = md.match(/^\s*#\s+(.+?)\s*$/m);
	if (heading) return heading[1]!.replace(/\s*\{[^}]*\}\s*$/, "").trim();
	return basename(source, extname(source)).replace(/[-_]+/g, " ").trim();
}
