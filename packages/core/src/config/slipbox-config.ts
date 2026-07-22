import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseFrontmatter } from "../util/frontmatter.js";
import { DEFAULT_PATHS, type SearchMode, type SlipboxConfig, type SlipboxPaths } from "./types.js";

export const SLIPBOX_FILE = ".slipbox";

/** Walk up from `startDir` looking for a `.slipbox` file. Returns its directory or null. */
export function findSlipboxRoot(startDir: string): string | null {
	let dir = resolve(startDir);
	for (;;) {
		if (existsSync(join(dir, SLIPBOX_FILE))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function asRecord(v: unknown): Record<string, unknown> {
	return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown, fallback: string): string {
	return typeof v === "string" && v.length > 0 ? v : fallback;
}

function num(v: unknown, fallback: number): number {
	return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Load slipbox configuration. If no `.slipbox` is found at/above `cwd`, returns
 * sensible defaults rooted at `cwd` with `found: false` so callers can offer to init.
 */
export function loadConfig(cwd: string): SlipboxConfig {
	const root = findSlipboxRoot(cwd);
	if (!root) return defaults(resolve(cwd), false, "");

	const raw = readFileSync(join(root, SLIPBOX_FILE), "utf8");
	const { data, body } = parseFrontmatter(raw);

	const paths = { ...DEFAULT_PATHS, ...asRecord(data.paths) } as SlipboxPaths;
	const qmd = asRecord(data.qmd);
	const clustering = asRecord(data.clustering);
	const notes = asRecord(data.notes);

	return {
		root,
		found: true,
		paths,
		qmd: {
			collection: str(qmd.collection, "slipbox"),
			search_mode: str(qmd.search_mode, "query") as SearchMode,
		},
		clustering: {
			method: str(clustering.method, "connected-components"),
			threshold: num(clustering.threshold, 0.75),
			min_cluster_size: num(clustering.min_cluster_size, 1),
		},
		notes: {
			id_style: str(notes.id_style, "timestamp") as SlipboxConfig["notes"]["id_style"],
			link_style: str(notes.link_style, "wikilink") as SlipboxConfig["notes"]["link_style"],
			frontmatter: "yaml",
		},
		houseStyle: body.trim(),
	};
}

function defaults(root: string, found: boolean, houseStyle: string): SlipboxConfig {
	return {
		root,
		found,
		paths: { ...DEFAULT_PATHS },
		qmd: { collection: "slipbox", search_mode: "query" },
		clustering: { method: "connected-components", threshold: 0.75, min_cluster_size: 1 },
		notes: { id_style: "timestamp", link_style: "wikilink", frontmatter: "yaml" },
		houseStyle,
	};
}

/** Absolute directory for a given note-type path key, ensuring trailing slash handling. */
export function dirFor(config: SlipboxConfig, key: keyof SlipboxPaths): string {
	return resolve(config.root, config.paths[key]);
}
