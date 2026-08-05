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
		return {
			markdown: text,
			metadata: { title: chooseTitle(info.title, text, source), ...(info.author ? { author: info.author } : {}), kind: "pdf", origin: source },
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

/**
 * Pick the best title from three sources, in order of trust:
 *  1. the PDF's embedded Title — but only if it's not junk (some PDFs embed a
 *     figure filename or journal boilerplate as the Title)
 *  2. a first-line heuristic over the extracted text
 *  3. the source filename
 * Every candidate is cleaned (emoji stripped, spacing fixed, shouting titles
 * title-cased) so a usable title survives even when the source is messy.
 */
export function chooseTitle(embedded: string | undefined, text: string, source: string): string {
	const fromEmbedded = clean(embedded);
	if (fromEmbedded && !isJunkTitle(fromEmbedded)) return fromEmbedded;

	const fromText = deriveTitle(text);
	if (fromText && !isJunkTitle(fromText)) return fromText;

	return fallbackName(source);
}

// Lines to skip before the title in the extracted text: page numbers, arXiv
// stamps, venue banners, copyright/permission notices, journal boilerplate, and
// figure/asset filenames.
const BANNER = /^(published|to appear|under review|preprint|proceedings|accepted|received|in submission|in press|journal of|conference on|vol\.?\s|volume\s)/i;
const NOISE = /permission|reproduce|attribution|journalistic|scholarly|copyright|all rights reserved|©/i;
// "Submitted 1/20; Revised 6/20; Published 6/20" and similar review-cycle lines.
const BOILERPLATE = /\b(submitted|revised|published|received|accepted)\b[^.]*\b(19|20)\d\/|\b(submitted|revised|accepted)\b.*;/i;
// A title that wraps continues if its last line ends on a joining word / comma / hyphen.
const CUE = /(?:\b(?:for|of|and|to|the|an?|in|on|with|from|via|using|by|through|into|over)\b|[,\-:])$/i;
// Author / affiliation markers that mean the title has ended.
const AUTHOR = /[@∗*]|\b(University|Institute|Google|Facebook|Meta|Microsoft|OpenAI|DeepMind|Anthropic|Labs?|Inc\b|Brain|Research|Abstract)\b/i;

/** Best-effort title from a PDF's text: first substantial line(s), skipping junk. */
export function deriveTitle(text: string): string | undefined {
	const lines = text.split(/\r?\n/).map((l) => l.trim());
	let i = 0;
	for (; i < Math.min(lines.length, 40); i++) {
		const l = lines[i]!;
		if (l.length < 8 || /^\d+$/.test(l) || /^arxiv:/i.test(l)) continue;
		if (BANNER.test(l) || NOISE.test(l) || BOILERPLATE.test(l) || isFilename(l)) continue;
		break;
	}
	if (i >= lines.length) return undefined;
	let title = lines[i]!;
	// Join at most a couple of wrapped title lines, stopping at author/affiliation lines.
	for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
		const next = lines[j]!;
		if (!next || AUTHOR.test(next) || !CUE.test(title)) break;
		title += ` ${next}`;
	}
	return clean(unspace(title));
}

function fallbackName(source: string): string {
	return basename(source, extname(source)).replace(/[-_]+/g, " ").trim();
}

/** A filename slipped in as a title, e.g. "countries.capitals.projections.eps". */
function isFilename(s: string): boolean {
	return /\.(eps|pdf|png|jpe?g|tex|svg|gif|docx?|pptx?)$/i.test(s.trim());
}

/** Junk that should never be used as a title. */
export function isJunkTitle(s: string): boolean {
	const t = s.trim();
	if (t.length < 6) return true;
	if (isFilename(t)) return true;
	if (BOILERPLATE.test(t)) return true;
	// mostly digits / punctuation (dates, page refs)
	const letters = t.replace(/[^A-Za-z]/g, "").length;
	if (letters < t.length * 0.4) return true;
	return false;
}

/** Emoji and pictographs — the Flamingo paper literally opens its title with one. */
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

/**
 * Normalize a raw title: drop emoji, tidy spacing around punctuation, and
 * title-case a SHOUTING (mostly-uppercase) title. Leaves normal mixed-case
 * titles — with their real acronyms — untouched.
 */
export function clean(raw: string | undefined): string {
	if (!raw) return "";
	let t = raw.replace(EMOJI, "").replace(/\s+/g, " ").trim();
	// pdftotext often leaves a space before punctuation ("REACT :", "ZERO -SHOT").
	t = t.replace(/\s+([:;,.])/g, "$1").replace(/\s+-\s+/g, "-").replace(/(\w)\s-(\w)/g, "$1-$2");
	return titleCaseIfShouting(t);
}

// Words kept lowercase in title case — articles, conjunctions, short prepositions.
// Verbs (is/are/be) are deliberately excluded: they stay capitalized.
const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "via", "with", "over"]);

/** Title-case a mostly-uppercase string; leave already-mixed-case titles alone. */
function titleCaseIfShouting(t: string): string {
	const letters = t.replace(/[^A-Za-z]/g, "");
	if (!letters) return t;
	const upperRatio = [...letters].filter((c) => c === c.toUpperCase()).length / letters.length;
	if (upperRatio < 0.75) return t; // not shouting — keep real acronyms/casing

	return t
		.split(/\s+/)
		.map((word, idx) => {
			const bare = word.replace(/[^A-Za-z]/g, "").toLowerCase();
			if (idx > 0 && SMALL_WORDS.has(bare)) return word.toLowerCase();
			// Capitalize the first letter of each hyphen-separated part.
			return word.toLowerCase().replace(/(^|[-–—/])([a-z])/g, (_m, sep, c) => sep + c.toUpperCase());
		})
		.join(" ");
}

/** Collapse pdftotext letter-tracking artifacts: "A DAM : A M ETHOD" → "ADAM : A METHOD". */
function unspace(line: string): string {
	const tokens = line.split(/\s+/);
	const singles = tokens.filter((t) => t.length === 1 && /[A-Za-z]/.test(t)).length;
	if (singles < 3 || singles / tokens.length < 0.3) return line;
	return line.replace(/\b([A-Za-z]) (?=[A-Za-z])/g, "$1").replace(/\s+/g, " ").trim();
}
