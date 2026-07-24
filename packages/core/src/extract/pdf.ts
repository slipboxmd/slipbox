import { basename, extname } from "node:path";
import { runTool } from "./exec.js";
import type { Extracted, Extractor } from "./types.js";

/** Extract a PDF to text via `pdftotext`, with metadata from `pdfinfo` (both poppler). */
export const pdfExtractor: Extractor = {
	supports(source: string): boolean {
		return extname(source).toLowerCase() === ".pdf";
	},
	async extract(source: string): Promise<Extracted> {
		const text = await runTool("pdftotext", {
			args: ["-nopgbrk", source, "-"],
			install: "brew install poppler   (macOS)  |  apt-get install poppler-utils  (Linux)",
			unlocks: "read PDF sources",
		});
		const info = await pdfInfo(source);
		const title = info.title || deriveTitle(text, source);
		return {
			markdown: text,
			metadata: { title, ...(info.author ? { author: info.author } : {}), kind: "pdf", origin: source },
		};
	},
};

/** Read the PDF's embedded Title/Author via `pdfinfo` (best-effort; empty on failure). */
async function pdfInfo(source: string): Promise<{ title?: string; author?: string }> {
	try {
		const out = await runTool("pdfinfo", {
			args: [source],
			install: "brew install poppler   (macOS)  |  apt-get install poppler-utils  (Linux)",
			unlocks: "read PDF metadata",
			timeout: 30_000,
		});
		// Horizontal whitespace only — \s would swallow the newline into the next field.
		const grab = (key: string) => out.match(new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "im"))?.[1]?.trim() || undefined;
		return { title: grab("Title"), author: grab("Author") };
	} catch {
		return {};
	}
}

// Leading lines to skip before the title: page numbers, arXiv stamps, venue
// banners, and copyright / permission notices (e.g. arXiv's Google attribution).
const BANNER = /^(published|to appear|under review|preprint|proceedings|accepted|in submission|journal of|conference on)/i;
const NOISE = /permission|reproduce|attribution|journalistic|scholarly|copyright|all rights reserved|©/i;
// A title that wraps continues if its last line ends on a joining word / comma / hyphen.
const CUE = /(?:\b(?:for|of|and|to|the|an?|in|on|with|from|via|using|by|through|into|over)\b|[,\-:])$/i;
// Author / affiliation markers that mean the title has ended.
const AUTHOR = /[@∗*]|\b(University|Institute|Google|Facebook|Meta|Microsoft|OpenAI|DeepMind|Anthropic|Labs?|Inc\b|Brain|Research|Abstract)\b/i;

/** Best-effort title from a PDF's text: first substantial line(s), skipping banners. */
function deriveTitle(text: string, source: string): string {
	const lines = text.split(/\r?\n/).map((l) => l.trim());
	let i = 0;
	for (; i < Math.min(lines.length, 40); i++) {
		const l = lines[i]!;
		if (l.length < 8 || /^\d+$/.test(l) || /^arxiv:/i.test(l) || BANNER.test(l) || NOISE.test(l)) continue;
		break;
	}
	if (i >= lines.length) return fallbackName(source);
	let title = lines[i]!;
	// Join at most a couple of wrapped title lines, stopping at author/affiliation lines.
	for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
		const next = lines[j]!;
		if (!next || AUTHOR.test(next) || !CUE.test(title)) break;
		title += ` ${next}`;
	}
	title = unspace(title);
	return title.length >= 8 ? title : fallbackName(source);
}

function fallbackName(source: string): string {
	return basename(source, extname(source)).replace(/[-_]+/g, " ").trim();
}

/** Collapse pdftotext letter-tracking artifacts: "A DAM : A M ETHOD" → "ADAM : A METHOD". */
function unspace(line: string): string {
	const tokens = line.split(/\s+/);
	const singles = tokens.filter((t) => t.length === 1 && /[A-Za-z]/.test(t)).length;
	if (singles < 3 || singles / tokens.length < 0.3) return line;
	return line.replace(/\b([A-Za-z]) (?=[A-Za-z])/g, "$1").replace(/\s+/g, " ").trim();
}
