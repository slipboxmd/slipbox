import { describe, expect, it } from "vitest";
import { buildCandidate, cohesionOf, filterBySource, type GatherNote, groupNotes, labelFor } from "./gather.js";

const note = (path: string, title: string, vector: number[], source?: string, links: string[] = []): GatherNote => ({
	path,
	link: `[[${path.replace(/\.md$/, "")}]]`,
	title,
	source,
	vector,
	links,
});

describe("cohesionOf", () => {
	it("is 1 for a singleton (no pairs)", () => {
		expect(cohesionOf([[1, 2, 3]])).toBe(1);
	});
	it("is 1 for identical (parallel) vectors", () => {
		expect(cohesionOf([[1, 0], [2, 0]])).toBeCloseTo(1, 6);
	});
	it("is 0 for orthogonal vectors", () => {
		expect(cohesionOf([[1, 0], [0, 1]])).toBeCloseTo(0, 6);
	});
	it("averages pairwise cosine over all pairs", () => {
		// three unit-ish vectors; mean of the three pairwise cosines
		const c = cohesionOf([[1, 0], [0, 1], [1, 1]]);
		expect(c).toBeGreaterThan(0);
		expect(c).toBeLessThan(1);
	});
});

describe("labelFor", () => {
	it("returns the (whole) title for a singleton", () => {
		expect(labelFor(["The role of scaling laws in emergence"])).toBe("The role of scaling laws in emergence");
	});
	it("surfaces the term shared across titles", () => {
		const label = labelFor(["Attention is all you need", "Attention improves translation", "Scaling attention heads"]);
		expect(label).toContain("attention");
	});
	it("falls back to a representative title when nothing is shared", () => {
		const label = labelFor(["Reinforcement learning", "Diffusion models"]);
		expect(label.length).toBeGreaterThan(0);
	});
});

describe("filterBySource", () => {
	const notes = [
		note("literature-notes/a1.md", "A one", [1, 0], "[[references/src-1]]"),
		note("literature-notes/a2.md", "A two", [1, 0], "[[references/src-1]]"),
		note("literature-notes/b1.md", "B one", [0, 1], "[[references/src-2]]"),
	];
	it("keeps only notes tracing to the given reference links", () => {
		const got = filterBySource(notes, ["[[references/src-1]]"]).map((n) => n.path);
		expect(got.sort()).toEqual(["literature-notes/a1.md", "literature-notes/a2.md"]);
	});
	it("accepts bare reference ids too", () => {
		const got = filterBySource(notes, ["src-2"]).map((n) => n.path);
		expect(got).toEqual(["literature-notes/b1.md"]);
	});
});

describe("buildCandidate", () => {
	const members = [
		note("literature-notes/a1.md", "A one", [1, 0], "[[references/src-1]]"),
		note("literature-notes/a2.md", "A two", [1, 0], "[[references/src-2]]"),
	];
	it("assembles members, distinct sources, cohesion, and coverage", () => {
		const c = buildCandidate(members, new Set());
		expect(c.members).toEqual([
			{ link: "[[literature-notes/a1]]", title: "A one" },
			{ link: "[[literature-notes/a2]]", title: "A two" },
		]);
		expect(c.sources.sort()).toEqual(["[[references/src-1]]", "[[references/src-2]]"]);
		expect(c.cohesion).toBeCloseTo(1, 6);
		expect(c.coverage).toBe("new");
	});
	it("reports partial coverage when some members are covered", () => {
		expect(buildCandidate(members, new Set(["literature-notes/a1"])).coverage).toBe("partial");
	});
	it("reports full coverage when all members are covered", () => {
		expect(buildCandidate(members, new Set(["literature-notes/a1", "literature-notes/a2"])).coverage).toBe("covered");
	});
});

describe("groupNotes (ambient / density)", () => {
	const notes = [
		note("literature-notes/a1.md", "Idea A one", [1, 0, 0], "[[references/src-1]]"),
		note("literature-notes/a2.md", "Idea A two", [0.99, 0.01, 0], "[[references/src-1]]"),
		note("literature-notes/b1.md", "Idea B one", [0, 1, 0], "[[references/src-2]]"),
		note("literature-notes/b2.md", "Idea B two", [0.02, 0.98, 0], "[[references/src-2]]"),
	];

	it("groups similar notes and separates dissimilar ones", () => {
		const cands = groupNotes(notes, new Set(), { threshold: 0.9, minSize: 1 });
		expect(cands.length).toBe(2);
		const sizes = cands.map((c) => c.members.length);
		expect(sizes).toEqual([2, 2]);
	});

	it("excludes fully-covered neighborhoods by default", () => {
		const covered = new Set(["literature-notes/a1", "literature-notes/a2"]);
		const cands = groupNotes(notes, covered, { threshold: 0.9, minSize: 1 });
		expect(cands.length).toBe(1);
		expect(cands[0]!.members.map((m) => m.link).sort()).toEqual(["[[literature-notes/b1]]", "[[literature-notes/b2]]"]);
		expect(cands[0]!.coverage).toBe("new");
	});

	it("keeps covered neighborhoods when includeCovered is set", () => {
		const covered = new Set(["literature-notes/a1", "literature-notes/a2"]);
		const cands = groupNotes(notes, covered, { threshold: 0.9, minSize: 1, includeCovered: true });
		expect(cands.length).toBe(2);
		expect(cands.some((c) => c.coverage === "covered")).toBe(true);
	});

	it("keeps partially-covered neighborhoods even by default", () => {
		const covered = new Set(["literature-notes/b1"]);
		const cands = groupNotes(notes, covered, { threshold: 0.9, minSize: 1 });
		const b = cands.find((c) => c.members.some((m) => m.link === "[[literature-notes/b1]]"));
		expect(b?.coverage).toBe("partial");
	});

	it("honors limit", () => {
		const cands = groupNotes(notes, new Set(), { threshold: 0.9, minSize: 1, limit: 1 });
		expect(cands.length).toBe(1);
	});
});
