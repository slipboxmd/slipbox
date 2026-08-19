import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SlipboxConfig } from "../config/types.js";
import { DEFAULT_PATHS } from "../config/types.js";
import { parseFrontmatter } from "../util/frontmatter.js";
import { writeLiterature, writePermanent } from "./write.js";

let root: string;

function config(): SlipboxConfig {
	return {
		root,
		found: true,
		paths: { ...DEFAULT_PATHS },
		qmd: { collection: "slipbox", search_mode: "query" },
		clustering: { method: "average-linkage", threshold: 0.64, min_cluster_size: 1 },
		notes: { id_style: "slug", link_style: "wikilink", frontmatter: "yaml" },
		houseStyle: "",
	};
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "slipbox-write-"));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("writePermanent", () => {
	it("writes correct frontmatter, deriving sources from the draws_on notes", async () => {
		const cfg = config();
		const a = await writeLiterature(cfg, { title: "Idea A", body: "a", sourceLink: "[[references/src-1]]" });
		const b = await writeLiterature(cfg, { title: "Idea B", body: "b", sourceLink: "[[references/src-2]]" });
		const c = await writeLiterature(cfg, { title: "Idea C", body: "c", sourceLink: "[[references/src-1]]" });

		const ref = await writePermanent(cfg, {
			title: "The synthesized claim",
			body: "  My own words.  ",
			drawsOn: [a.link, b.link, c.link],
			links: ["[[permanent-notes/other]]"],
			tags: ["synthesis", "epistemics"],
		});

		expect(ref.id).toBe("the-synthesized-claim");
		expect(ref.relPath).toBe("permanent-notes/the-synthesized-claim.md");
		expect(ref.link).toBe("[[permanent-notes/the-synthesized-claim]]");

		const { data, body } = parseFrontmatter(readFileSync(ref.path, "utf8"));
		expect(data.id).toBe("the-synthesized-claim");
		expect(data.type).toBe("permanent-note");
		expect(data.title).toBe("The synthesized claim");
		expect(data.draws_on).toEqual([a.link, b.link, c.link]);
		expect(data.links).toEqual(["[[permanent-notes/other]]"]);
		// Union of the draws_on notes' `source:` frontmatter, distinct, order-preserved.
		expect(data.sources).toEqual(["[[references/src-1]]", "[[references/src-2]]"]);
		expect(data.tags).toEqual(["synthesis", "epistemics"]);
		expect(typeof data.created).toBe("string");
		expect(body.trim()).toBe("My own words.");
	});

	it("overwrites in place when an id is supplied", async () => {
		const cfg = config();
		const a = await writeLiterature(cfg, { title: "Idea A", body: "a", sourceLink: "[[references/src-1]]" });

		const first = await writePermanent(cfg, { title: "Claim", body: "v1", drawsOn: [a.link] });
		const second = await writePermanent(cfg, { title: "A different title", body: "v2", drawsOn: [a.link], id: first.id });

		expect(second.id).toBe(first.id);
		expect(second.path).toBe(first.path);
		const { data, body } = parseFrontmatter(readFileSync(first.path, "utf8"));
		expect(data.title).toBe("A different title");
		expect(body.trim()).toBe("v2");
	});

	it("derives no sources when the draws_on notes have none, and round-trips", async () => {
		const cfg = config();
		const ref = await writePermanent(cfg, { title: "Standalone", body: "x", drawsOn: ["[[literature-notes/missing]]"] });
		const { data } = parseFrontmatter(readFileSync(ref.path, "utf8"));
		expect(data.sources).toEqual([]);
		expect(data.draws_on).toEqual(["[[literature-notes/missing]]"]);
	});

	it("resolves markdown-style draws_on links to derive sources", async () => {
		const cfg = { ...config(), notes: { id_style: "slug" as const, link_style: "markdown" as const, frontmatter: "yaml" as const } };
		const a = await writeLiterature(cfg, { title: "Idea A", body: "a", sourceLink: "[references/src-1](references/src-1.md)" });
		const ref = await writePermanent(cfg, { title: "Claim", body: "x", drawsOn: [a.link] });
		const { data } = parseFrontmatter(readFileSync(ref.path, "utf8"));
		expect(data.sources).toEqual(["[references/src-1](references/src-1.md)"]);
	});
});
