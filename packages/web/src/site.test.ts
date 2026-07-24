import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeBasePath } from "./build.js";
import { buildGraph, buildSearchIndex } from "./indexes.js";
import { loadSlipbox } from "./load.js";
import { excerpt, renderMarkdown } from "./markdown.js";
import { EMPTY_ID, paramsForType } from "./model.js";

function fixture(): string {
	const root = mkdtempSync(join(tmpdir(), "slipbox-site-"));
	for (const d of ["references", "literature-notes", "permanent-notes", "maps"]) mkdirSync(join(root, d), { recursive: true });
	writeFileSync(
		join(root, "references", "r1.md"),
		`---\nid: r1\ntype: reference\ntitle: Source One\ncreated: 2026-07-24\nlinks: ["[[literature-notes/n1]]"]\n---\n\nSummary.\n`,
	);
	writeFileSync(
		join(root, "literature-notes", "n1.md"),
		`---\nid: n1\ntype: literature-note\ntitle: Idea One\nsource: "[[references/r1]]"\ntags: [growth]\ncreated: 2026-07-24\n---\n\nAn idea, linking [[literature-notes/n2]].\n`,
	);
	writeFileSync(
		join(root, "literature-notes", "n2.md"),
		`---\nid: n2\ntype: literature-note\ntitle: Idea Two\nsource: "[[references/r1]]"\ncreated: 2026-07-23\n---\n\nAnother idea.\n`,
	);
	return root;
}

const box = loadSlipbox(fixture());

describe("normalizeBasePath", () => {
	it("normalizes to a leading slash with no trailing slash", () => {
		expect(normalizeBasePath("repo")).toBe("/repo");
		expect(normalizeBasePath("/repo/")).toBe("/repo");
	});
	it("treats empty and root as unset", () => {
		expect(normalizeBasePath("")).toBeUndefined();
		expect(normalizeBasePath("/")).toBeUndefined();
		expect(normalizeBasePath(undefined)).toBeUndefined();
	});
});

describe("paramsForType", () => {
	it("returns real ids when notes exist", () => {
		expect(paramsForType(box, "literature-note").map((p) => p.id).sort()).toEqual(["n1", "n2"]);
	});

	it("falls back to the placeholder so static export still builds", () => {
		// A fresh slipbox has no MOCs; an empty param list fails `output: export`.
		expect(paramsForType(box, "moc")).toEqual([{ id: EMPTY_ID }]);
	});
});

describe("buildSearchIndex", () => {
	const docs = buildSearchIndex(box);
	it("indexes every note with a route and excerpt", () => {
		expect(docs).toHaveLength(3);
		const n1 = docs.find((d) => d.id === "n1")!;
		expect(n1.h).toBe("/notes/n1/");
		expect(n1.g).toEqual(["growth"]);
		expect(n1.s).toBe("Source One");
		expect(n1.x.length).toBeGreaterThan(0);
	});
});

describe("buildGraph", () => {
	const graph = buildGraph(box);

	it("includes every note as a node", () => {
		expect(graph.nodes.map((n) => n.id).sort()).toEqual(["n1", "n2", "r1"]);
	});

	it("de-duplicates the reference↔note relationship into one edge", () => {
		// r1 links to n1 in frontmatter and n1 points back via source: — one edge.
		const between = graph.edges.filter(
			(e) => [e.source, e.target].includes("r1") && [e.source, e.target].includes("n1"),
		);
		expect(between).toHaveLength(1);
	});

	it("counts degree for node sizing", () => {
		expect(graph.nodes.find((n) => n.id === "r1")!.degree).toBe(2); // n1 + n2
	});
});

describe("renderMarkdown", () => {
	it("renders markdown to html", () => {
		expect(renderMarkdown("**bold** text")).toContain("<strong>bold</strong>");
	});

	it("neutralizes raw html so source-derived notes can't inject scripts", () => {
		const html = renderMarkdown("hello <script>alert(1)</script>");
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});
});

describe("excerpt", () => {
	it("strips markdown syntax and wikilinks", () => {
		expect(excerpt("# Title\n\nSome **bold** and [[notes/x|a link]].")).toBe("Title Some bold and a link.");
	});

	it("truncates on a word boundary", () => {
		const out = excerpt("word ".repeat(100), 40);
		expect(out.length).toBeLessThanOrEqual(41);
		expect(out.endsWith("…")).toBe(true);
	});
});
