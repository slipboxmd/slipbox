import { describe, expect, it } from "vitest";
import { buildCapture, parseHighlightIds } from "./capture.js";
import { normalizeHighlight, parseSource } from "./parse.js";
import { mapChunksToHighlights, reconcile, type ClusterLite, type ExistingNote } from "./reconcile.js";
import type { Highlight, ReadwiseSource } from "./types.js";

const H = (id: string, text: string, note?: string): Highlight => ({ id, text, note, tags: [] });

describe("parse", () => {
	it("normalizes a highlight across field-name variants", () => {
		expect(normalizeHighlight({ id: 7, plaintext: "the passage", highlight_note: "my note" })).toMatchObject({
			id: "7",
			text: "the passage",
			note: "my note",
		});
	});
	it("drops objects without id or text", () => {
		expect(normalizeHighlight({ id: 7 })).toBeNull();
		expect(normalizeHighlight({ text: "x" })).toBeNull();
	});
	it("parses an array of highlights with metadata overrides", () => {
		const src = parseSource([{ id: 1, text: "a" }, { id: 2, text: "b" }], { title: "My Book", author: "Ann", id: "bk1" });
		expect(src.title).toBe("My Book");
		expect(src.author).toBe("Ann");
		expect(src.id).toBe("bk1");
		expect(src.highlights).toHaveLength(2);
	});
	it("reads metadata nested in the response when not overridden", () => {
		const src = parseSource({ title: "Nested", results: [{ id: 1, text: "a" }] });
		expect(src.title).toBe("Nested");
		expect(src.highlights).toHaveLength(1);
	});
});

describe("capture", () => {
	const source: ReadwiseSource = {
		product: "readwise",
		id: "bk1",
		title: "Thinking, Fast and Slow",
		author: "Daniel Kahneman",
		category: "books",
		highlights: [H("11", "System 1 is fast."), H("12", "System 2 is slow.", "the effortful one")],
	};

	it("embeds a stable marker per highlight and round-trips the ids", () => {
		const md = buildCapture(source, "rw-tfs", "2026-08-05");
		expect(parseHighlightIds(md)).toEqual(["11", "12"]);
	});
	it("renders passages as blockquotes and carries metadata + notes", () => {
		const md = buildCapture(source, "rw-tfs", "2026-08-05");
		expect(md).toContain("readwise_id: bk1");
		expect(md).toContain("> System 1 is fast.");
		expect(md).toContain("the effortful one");
		expect(md).toContain("# Thinking, Fast and Slow");
	});
});

describe("mapChunksToHighlights", () => {
	const highlights = [H("a", "Recruit users manually at first, one by one."), H("b", "Delight a small number of early users."), H("c", "Do things that do not scale.")];
	it("maps several short highlights sharing one chunk", () => {
		const map = mapChunksToHighlights([{ seq: 0, text: "Recruit users manually at first, one by one. Delight a small number of early users." }], highlights);
		expect([...map.get(0)!].sort()).toEqual(["a", "b"]);
	});
	it("maps a highlight split across chunks", () => {
		const map = mapChunksToHighlights(
			[{ seq: 0, text: "Recruit users manually at first," }, { seq: 1, text: "one by one. Delight a small number" }],
			highlights,
		);
		expect(map.get(0)!.has("a")).toBe(true);
	});
});

describe("reconcile", () => {
	const highlights = [H("a", "alpha idea about growth"), H("b", "beta idea about growth"), H("c", "gamma idea about hiring")];
	const chunkMap = new Map<number, Set<string>>([
		[0, new Set(["a", "b"])],
		[1, new Set(["c"])],
	]);
	const clusters: ClusterLite[] = [
		{ index: 1, chunkSeqs: [0], excerpts: ["growth"] },
		{ index: 2, chunkSeqs: [1], excerpts: ["hiring"] },
	];

	it("marks a cluster with no existing notes as new", () => {
		const plan = reconcile(clusters, chunkMap, highlights, []);
		expect(plan.clusters.map((c) => c.suggestion)).toEqual(["new", "new"]);
		expect(plan.newHighlightCount).toBe(3);
	});

	it("suggests extending when new highlights join a single existing note", () => {
		// Note already covers highlight a; highlight b is new in the same cluster.
		const notes: ExistingNote[] = [{ id: "n1", title: "Growth", link: "[[literature-notes/n1]]", highlightIds: ["a"] }];
		const plan = reconcile(clusters, chunkMap, highlights, notes);
		const growth = plan.clusters.find((c) => c.index === 1)!;
		expect(growth.suggestion).toBe("extend");
		expect(growth.newHighlightIds).toEqual(["b"]);
		expect(growth.relatedNotes[0]!.id).toBe("n1");
	});

	it("settles (skips) a cluster fully covered by one note with nothing new", () => {
		const notes: ExistingNote[] = [{ id: "n1", title: "Growth", link: "[[literature-notes/n1]]", highlightIds: ["a", "b"] }];
		const plan = reconcile(clusters, chunkMap, highlights, notes);
		expect(plan.clusters.find((c) => c.index === 1)).toBeUndefined();
		expect(plan.settledCount).toBe(1);
	});

	it("suggests split when a cluster spans two existing notes", () => {
		const notes: ExistingNote[] = [
			{ id: "n1", title: "Alpha", link: "[[literature-notes/n1]]", highlightIds: ["a"] },
			{ id: "n2", title: "Beta", link: "[[literature-notes/n2]]", highlightIds: ["b"] },
		];
		const plan = reconcile(clusters, chunkMap, highlights, notes);
		expect(plan.clusters.find((c) => c.index === 1)!.suggestion).toBe("split");
	});
});
