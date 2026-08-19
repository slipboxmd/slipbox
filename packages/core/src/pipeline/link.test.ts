import { describe, expect, it } from "vitest";
import type { SlipboxConfig } from "../config/types.js";
import { DEFAULT_PATHS } from "../config/types.js";
import { type AutolinkOptions, linkNotes, type NoteState } from "./link.js";

function config(): SlipboxConfig {
	return {
		root: "/tmp/slipbox",
		found: true,
		paths: { ...DEFAULT_PATHS },
		qmd: { collection: "slipbox", search_mode: "query" },
		clustering: { method: "average-linkage", threshold: 0.64, min_cluster_size: 1 },
		notes: { id_style: "slug", link_style: "wikilink", frontmatter: "yaml" },
		houseStyle: "",
	};
}

const state = (path: string, vec: number[], links: string[] = []): NoteState => ({
	path,
	vec,
	abs: `/tmp/slipbox/${path}`,
	data: { links: [...links] },
	body: "body\n",
	links: new Set(links),
});

const opts: AutolinkOptions = { k: 6, threshold: 0.55, minLinks: 1, floor: 0.45, relinkAll: false };

describe("linkNotes (permanent-note pass)", () => {
	it("cross-links similar permanent notes to each other, mutually", () => {
		const notes = [
			state("permanent-notes/p1.md", [1, 0, 0]),
			state("permanent-notes/p2.md", [0.98, 0.02, 0]),
			state("permanent-notes/p3.md", [0, 0, 1]),
		];
		const { changed, linksAdded } = linkNotes(config(), notes, opts);
		expect(linksAdded).toBeGreaterThan(0);
		// p1 and p2 are near-parallel → they link to each other.
		expect(notes[0]!.links.has("[[permanent-notes/p2]]")).toBe(true);
		expect(notes[1]!.links.has("[[permanent-notes/p1]]")).toBe(true);
		// The changed set is exactly the notes whose links grew.
		expect(changed.map((c) => c.path).sort()).toContain("permanent-notes/p1.md");
	});

	it("is incremental: only links notes that have none yet", () => {
		const notes = [
			state("permanent-notes/p1.md", [1, 0], ["[[permanent-notes/existing]]"]),
			state("permanent-notes/p2.md", [0.99, 0.01]),
		];
		const { linkedFrom } = linkNotes(config(), notes, opts);
		// p1 already has a link → skipped as a source; only p2 is linked-from.
		expect(linkedFrom).toBe(1);
	});

	it("preserves existing links (idempotent merge)", () => {
		const notes = [
			state("permanent-notes/p1.md", [1, 0], ["[[permanent-notes/keep]]"]),
			state("permanent-notes/p2.md", [0.99, 0.01]),
		];
		linkNotes(config(), notes, { ...opts, relinkAll: true });
		expect(notes[0]!.links.has("[[permanent-notes/keep]]")).toBe(true);
		expect(notes[0]!.links.has("[[permanent-notes/p2]]")).toBe(true);
	});

	it("writes markdown-style links when configured", () => {
		const cfg = { ...config(), notes: { id_style: "slug" as const, link_style: "markdown" as const, frontmatter: "yaml" as const } };
		const notes = [state("permanent-notes/p1.md", [1, 0]), state("permanent-notes/p2.md", [1, 0])];
		linkNotes(cfg, notes, opts);
		expect(notes[0]!.links.has("[p2](permanent-notes/p2.md)")).toBe(true);
	});
});
