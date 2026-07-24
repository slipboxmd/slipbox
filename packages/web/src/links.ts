import type { Link, Note, NoteType } from "./model.js";
import { hrefFor } from "./model.js";

/**
 * Link handling.
 *
 * Notes reference each other two ways, depending on the slipbox's `link_style`:
 *   [[references/20260724T1043-some-source]]      (wikilink)
 *   [Some source](references/20260724T1043-some-source.md)   (markdown)
 *
 * Both appear in frontmatter (`links:`, `source:`) and inline in note bodies. We
 * normalize every target to a slug — a root-relative path without extension —
 * then resolve slugs against the loaded notes.
 *
 * A target that doesn't resolve is kept as a Link with no href, so the templates
 * can render it as visibly broken rather than silently dropping it.
 */

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
const MDLINK_RE = /\[([^\]]*)\]\(([^)\s]+?)\)/g;

/** Strip brackets, quotes, extension, leading `./` and trailing `/` from a target. */
export function normalizeTarget(raw: string): string {
	return raw
		.trim()
		.replace(/^\[\[|\]\]$/g, "")
		.replace(/^['"]|['"]$/g, "")
		.split("|")[0]!
		.split("#")[0]!
		.trim()
		.replace(/^\.\//, "")
		.replace(/\.md$/i, "")
		.replace(/\/$/, "");
}

/** Extract every link target from a piece of text (frontmatter value or body). */
export function extractTargets(text: string): { target: string; label?: string }[] {
	const out: { target: string; label?: string }[] = [];
	for (const m of text.matchAll(WIKILINK_RE)) {
		out.push({ target: normalizeTarget(m[1]!), label: m[2]?.trim() });
	}
	for (const m of text.matchAll(MDLINK_RE)) {
		const href = m[2]!;
		// Only internal note links — leave real URLs alone.
		if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
		out.push({ target: normalizeTarget(href), label: m[1]?.trim() || undefined });
	}
	return out;
}

export interface Resolver {
	bySlug: Map<string, { id: string; type: NoteType; title: string }>;
	/** Fallback: match on the final path segment, so `[[some-id]]` works too. */
	byId: Map<string, { id: string; type: NoteType; title: string }>;
}

/** Resolve a raw target into a Link, marking it unresolved when there's no match. */
export function resolveLink(raw: string, resolver: Resolver, label?: string): Link {
	const target = normalizeTarget(raw);
	const bare = target.split("/").pop() ?? target;
	const hit = resolver.bySlug.get(target) ?? resolver.byId.get(bare);
	if (!hit) return { target, label: label ?? bare };
	return { target, label: label ?? hit.title, href: hrefFor(hit.type, hit.id), type: hit.type };
}

/** Collect a note's outgoing links from frontmatter and body, de-duplicated. */
export function outgoingLinks(note: { links?: unknown; body: string }, resolver: Resolver): Link[] {
	const raw: { target: string; label?: string }[] = [];

	// frontmatter `links:` — an array of link strings
	if (Array.isArray(note.links)) {
		for (const entry of note.links) {
			if (typeof entry !== "string") continue;
			const found = extractTargets(entry);
			if (found.length) raw.push(...found);
			else raw.push({ target: normalizeTarget(entry) });
		}
	}
	// inline links in the body
	raw.push(...extractTargets(note.body));

	const seen = new Set<string>();
	const links: Link[] = [];
	for (const r of raw) {
		if (!r.target || seen.has(r.target)) continue;
		seen.add(r.target);
		links.push(resolveLink(r.target, resolver, r.label));
	}
	return links;
}

/**
 * Invert every note's outgoing links into backlinks. A note links to another via
 * its body, `links:`, or (for literature notes) `source:` — all of them count as
 * "linked from" on the target.
 */
export function deriveBacklinks(notes: Note[]): void {
	const byHref = new Map<string, Note>();
	for (const n of notes) byHref.set(n.href, n);

	for (const note of notes) {
		const outgoing = [...note.links, ...(note.source ? [note.source] : [])];
		for (const link of outgoing) {
			if (!link.href) continue;
			const target = byHref.get(link.href);
			if (!target || target.id === note.id) continue;
			if (target.backlinks.some((b) => b.href === note.href)) continue;
			target.backlinks.push({ target: note.slug, label: note.title, href: note.href, type: note.type });
		}
	}
	for (const note of notes) note.backlinks.sort((a, b) => a.label.localeCompare(b.label));
}

/** Rewrite inline links in a note body to site routes, for rendering. */
export function rewriteBodyLinks(body: string, resolver: Resolver): string {
	const wiki = body.replace(WIKILINK_RE, (_all, target: string, label?: string) => {
		const link = resolveLink(target, resolver, label);
		return link.href ? `[${link.label}](${link.href})` : `\`${link.label}\``;
	});
	return wiki.replace(MDLINK_RE, (all, label: string, href: string) => {
		if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("/")) return all;
		const link = resolveLink(href, resolver, label);
		return link.href ? `[${link.label}](${link.href})` : `\`${label || link.label}\``;
	});
}
