import { Marked } from "marked";
import { rewriteBodyLinks, type Resolver } from "./links.js";

/**
 * Note bodies are markdown written by the agent (and edited by the human). We
 * render them to HTML at build time.
 *
 * The content is the user's own files, not untrusted input, so we don't sanitize —
 * but we do disable raw HTML passthrough so a stray `<script>` in a source-derived
 * note can't end up in the published site.
 */
const marked = new Marked({ gfm: true, breaks: false });

/** Escape the handful of characters that matter when HTML is disallowed. */
function escapeHtml(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderMarkdown(body: string, resolver?: Resolver): string {
	const src = resolver ? rewriteBodyLinks(body, resolver) : body;
	// Neutralize raw HTML before parsing; markdown syntax still works.
	const safe = src.replace(/<(\/?)([a-zA-Z][^\s>]*)([^>]*)>/g, (m) => escapeHtml(m));
	return marked.parse(safe, { async: false }) as string;
}

/** A short plain-text excerpt for feeds and the search index. */
export function excerpt(body: string, max = 240): string {
	const text = body
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_a, t: string, l?: string) => l ?? t.split("/").pop() ?? "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/^#+\s+/gm, "")
		.replace(/[*_`>#-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max)}…`;
}
