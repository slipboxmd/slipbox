import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import YAML from "yaml";
import { deriveBacklinks, outgoingLinks, resolveLink, type Resolver } from "./links.js";
import { DIR_TYPES, hrefFor, type DirKey, type Note, type NoteType, type Slipbox } from "./model.js";

/** Defaults mirror the harness's DEFAULT_PATHS; `.slipbox` can override them. */
const DEFAULT_DIRS: Record<DirKey, string> = {
	references: "references/",
	literature_notes: "literature-notes/",
	permanent_notes: "permanent-notes/",
	maps: "maps/",
};

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
	const m = text.match(FM_RE);
	if (!m) return { data: {}, body: text };
	try {
		return { data: (YAML.parse(m[1]!) as Record<string, unknown>) ?? {}, body: m[2] ?? "" };
	} catch {
		// A malformed note shouldn't take down the whole site.
		return { data: {}, body: m[2] ?? text };
	}
}

/** Read the note directory layout from `.slipbox`, falling back to defaults. */
export function readDirs(root: string): Record<DirKey, string> {
	const configPath = join(root, ".slipbox");
	if (!existsSync(configPath)) return { ...DEFAULT_DIRS };
	try {
		const { data } = parseFrontmatter(readFileSync(configPath, "utf8"));
		const paths = (data.paths ?? {}) as Partial<Record<DirKey, string>>;
		return {
			references: paths.references ?? DEFAULT_DIRS.references,
			literature_notes: paths.literature_notes ?? DEFAULT_DIRS.literature_notes,
			permanent_notes: paths.permanent_notes ?? DEFAULT_DIRS.permanent_notes,
			maps: paths.maps ?? DEFAULT_DIRS.maps,
		};
	} catch {
		return { ...DEFAULT_DIRS };
	}
}

function str(v: unknown): string | undefined {
	return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function strArray(v: unknown): string[] {
	return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function numArray(v: unknown): number[] {
	return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}

/** Strip a leading `# Title` from a body — templates render the title themselves. */
function stripLeadingHeading(body: string): string {
	return body.replace(/^\s*#\s+.+?(\r?\n|$)/, "").trimStart();
}

interface RawNote {
	data: Record<string, unknown>;
	body: string;
	slug: string;
	id: string;
	type: NoteType;
}

function readDir(root: string, rel: string, type: NoteType): RawNote[] {
	const dir = resolve(root, rel);
	if (!existsSync(dir)) return [];
	const out: RawNote[] = [];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".md") || file.startsWith(".")) continue;
		const full = join(dir, file);
		let text: string;
		try {
			text = readFileSync(full, "utf8");
		} catch {
			continue;
		}
		const { data, body } = parseFrontmatter(text);
		const id = str(data.id) ?? basename(file, ".md");
		const slug = `${rel.replace(/\/$/, "")}/${basename(file, ".md")}`;
		out.push({ data, body, slug, id, type });
	}
	return out;
}

/** Load a slipbox from disk into the model the site renders. */
export function loadSlipbox(root: string): Slipbox {
	const abs = resolve(root);
	const dirs = readDirs(abs);

	const raw: RawNote[] = [];
	for (const [key, type] of Object.entries(DIR_TYPES) as [DirKey, NoteType][]) {
		raw.push(...readDir(abs, dirs[key], type));
	}

	// Build the resolver first so links can point at any note, in any direction.
	const resolver: Resolver = { bySlug: new Map(), byId: new Map() };
	for (const r of raw) {
		const entry = { id: r.id, type: r.type, title: str(r.data.title) ?? r.id };
		resolver.bySlug.set(r.slug, entry);
		resolver.byId.set(r.id, entry);
	}

	const notes: Note[] = raw.map((r) => {
		const title = str(r.data.title) ?? r.id;
		const note: Note = {
			id: r.id,
			type: r.type,
			title,
			slug: r.slug,
			href: hrefFor(r.type, r.id),
			body: stripLeadingHeading(r.body),
			created: str(r.data.created) ?? str(r.data.captured),
			tags: strArray(r.data.tags),
			links: [],
			backlinks: [],
			chunks: numArray(r.data.chunks),
			kind: str(r.data.kind),
			author: str(r.data.author),
			date: str(r.data.date),
			origin: str(r.data.origin),
			archived: str(r.data.archived),
			archivedDate: str(r.data.archived_date),
		};
		note.links = outgoingLinks({ links: r.data.links, body: note.body }, resolver);
		const source = str(r.data.source);
		if (source) note.source = resolveLink(source, resolver);
		return note;
	});

	deriveBacklinks(notes);

	// Newest first — the home feed and indexes both want this order.
	notes.sort((a, b) => (b.created ?? "").localeCompare(a.created ?? "") || a.title.localeCompare(b.title));

	return {
		name: basename(abs) || "Slipbox",
		root: abs,
		notes,
		byId: new Map(notes.map((n) => [n.id, n])),
		bySlug: new Map(notes.map((n) => [n.slug, n])),
	};
}

/** The slipbox the site is being built against. */
export function slipboxRoot(): string {
	return process.env.SLIPBOX_ROOT || process.cwd();
}

let cached: Slipbox | undefined;
/** Load once per build/render pass. */
export function getSlipbox(): Slipbox {
	if (!cached || process.env.NODE_ENV === "development") cached = loadSlipbox(slipboxRoot());
	return cached;
}
