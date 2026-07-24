import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTargets, normalizeTarget, resolveLink, rewriteBodyLinks, type Resolver } from "./links.js";
import { loadSlipbox } from "./load.js";

describe("normalizeTarget", () => {
	it("strips brackets, extension, quotes and anchors", () => {
		expect(normalizeTarget("[[references/abc]]")).toBe("references/abc");
		expect(normalizeTarget("references/abc.md")).toBe("references/abc");
		expect(normalizeTarget('"references/abc"')).toBe("references/abc");
		expect(normalizeTarget("./references/abc#section")).toBe("references/abc");
		expect(normalizeTarget("[[references/abc|Some label]]")).toBe("references/abc");
	});
});

describe("extractTargets", () => {
	it("finds wikilinks with and without labels", () => {
		const t = extractTargets("see [[notes/a]] and [[notes/b|Bee]] here");
		expect(t).toEqual([
			{ target: "notes/a", label: undefined },
			{ target: "notes/b", label: "Bee" },
		]);
	});

	it("finds internal markdown links but ignores external URLs", () => {
		const t = extractTargets("[A](literature-notes/a.md) and [ext](https://example.com)");
		expect(t).toEqual([{ target: "literature-notes/a", label: "A" }]);
	});
});

const resolver: Resolver = {
	bySlug: new Map([["references/r1", { id: "r1", type: "reference" as const, title: "Ref One" }]]),
	byId: new Map([["r1", { id: "r1", type: "reference" as const, title: "Ref One" }]]),
};

describe("resolveLink", () => {
	it("resolves a slug to a route and title", () => {
		const l = resolveLink("[[references/r1]]", resolver);
		expect(l).toMatchObject({ href: "/references/r1/", label: "Ref One", type: "reference" });
	});

	it("resolves by bare id as a fallback", () => {
		expect(resolveLink("r1", resolver).href).toBe("/references/r1/");
	});

	it("returns an unresolved link (no href) for a missing target", () => {
		const l = resolveLink("references/nope", resolver);
		expect(l.href).toBeUndefined();
		expect(l.label).toBe("nope");
	});
});

describe("rewriteBodyLinks", () => {
	it("rewrites resolvable wikilinks to routes and marks broken ones as code", () => {
		const out = rewriteBodyLinks("see [[references/r1]] and [[references/gone]]", resolver);
		expect(out).toBe("see [Ref One](/references/r1/) and `gone`");
	});

	it("leaves external links alone", () => {
		const md = "[pg](https://paulgraham.com/ds.html)";
		expect(rewriteBodyLinks(md, resolver)).toBe(md);
	});
});

function fixture(): string {
	const root = mkdtempSync(join(tmpdir(), "slipbox-web-"));
	for (const d of ["references", "literature-notes", "permanent-notes", "maps"]) {
		mkdirSync(join(root, d), { recursive: true });
	}
	writeFileSync(
		join(root, "references", "r1.md"),
		`---
id: r1
type: reference
title: Do Things that Don't Scale
kind: web
author: Paul Graham
origin: https://www.paulgraham.com/ds.html
archived: https://web.archive.org/web/20260724/https://www.paulgraham.com/ds.html
archived_date: 2026-07-24
created: 2026-07-24
links:
  - "[[literature-notes/n1]]"
---

# Do Things that Don't Scale

A summary of the essay.
`,
	);
	writeFileSync(
		join(root, "literature-notes", "n1.md"),
		`---
id: n1
type: literature-note
title: Recruit users manually at first
source: "[[references/r1]]"
chunks: [3, 4]
tags: [growth, founding]
links: []
created: 2026-07-24
---

Startups should do unscalable things early. See also [[literature-notes/n2]].
`,
	);
	writeFileSync(
		join(root, "literature-notes", "n2.md"),
		`---
id: n2
type: literature-note
title: Delight early users
source: "[[references/r1]]"
tags: [growth]
created: 2026-07-23
---

Make a small number of users very happy.
`,
	);
	return root;
}

describe("loadSlipbox", () => {
	const box = loadSlipbox(fixture());

	it("loads notes of every type with routes", () => {
		expect(box.notes).toHaveLength(3);
		expect(box.byId.get("r1")?.href).toBe("/references/r1/");
		expect(box.byId.get("n1")?.href).toBe("/notes/n1/");
	});

	it("reads reference metadata including the wayback snapshot", () => {
		const r = box.byId.get("r1")!;
		expect(r.author).toBe("Paul Graham");
		expect(r.origin).toBe("https://www.paulgraham.com/ds.html");
		expect(r.archivedDate).toBe("2026-07-24");
	});

	it("resolves a literature note's source to its reference", () => {
		expect(box.byId.get("n1")!.source).toMatchObject({ href: "/references/r1/", label: "Do Things that Don't Scale" });
	});

	it("derives backlinks in both directions", () => {
		// r1 links to n1 in frontmatter; n1 points back via source:
		expect(box.byId.get("n1")!.backlinks.map((b) => b.href)).toContain("/references/r1/");
		expect(box.byId.get("r1")!.backlinks.map((b) => b.href)).toContain("/notes/n1/");
		// n1's inline wikilink to n2 becomes a backlink on n2
		expect(box.byId.get("n2")!.backlinks.map((b) => b.href)).toContain("/notes/n1/");
	});

	it("keeps tags and chunk provenance", () => {
		const n1 = box.byId.get("n1")!;
		expect(n1.tags).toEqual(["growth", "founding"]);
		expect(n1.chunks).toEqual([3, 4]);
	});

	it("strips the leading heading from bodies", () => {
		expect(box.byId.get("r1")!.body.startsWith("A summary")).toBe(true);
	});

	it("sorts newest first", () => {
		expect(box.notes[box.notes.length - 1]!.id).toBe("n2");
	});
});
