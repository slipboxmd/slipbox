import { describe, expect, it } from "vitest";
import { cluster, type HasVector } from "./cluster.js";

const item = (id: string, vector: number[]): HasVector & { id: string } => ({ id, vector });

describe("cluster", () => {
	it("returns [] for no items", () => {
		expect(cluster([], { threshold: 0.6, minSize: 1 })).toEqual([]);
	});

	it("groups near-parallel vectors and separates orthogonal ones", () => {
		const items = [
			item("a1", [1, 0, 0]),
			item("a2", [0.99, 0.01, 0]),
			item("b1", [0, 1, 0]),
			item("b2", [0.02, 0.98, 0]),
			item("c1", [0, 0, 1]),
		];
		const clusters = cluster(items, { threshold: 0.9, minSize: 1 });
		expect(clusters.length).toBe(3);
		const ids = clusters.map((c) => c.map((x) => (x as { id: string }).id).sort());
		expect(ids).toContainEqual(["a1", "a2"]);
		expect(ids).toContainEqual(["b1", "b2"]);
		expect(ids).toContainEqual(["c1"]);
	});

	it("is transitive: a~b and b~c chain into one component", () => {
		const items = [item("x", [1, 0]), item("y", [0.8, 0.6]), item("z", [0.2, 0.98])];
		// x·y and y·z are high, x·z is lower — connected components still merges all three.
		const clusters = cluster(items, { threshold: 0.7, minSize: 1 });
		expect(clusters.length).toBe(1);
		expect(clusters[0]!.length).toBe(3);
	});

	it("drops clusters below minSize", () => {
		const items = [item("a1", [1, 0]), item("a2", [0.99, 0.01]), item("lonely", [0, 1])];
		const clusters = cluster(items, { threshold: 0.9, minSize: 2 });
		expect(clusters.length).toBe(1);
		expect(clusters[0]!.map((x) => (x as { id: string }).id).sort()).toEqual(["a1", "a2"]);
	});

	it("sorts clusters largest-first", () => {
		const items = [
			item("a1", [1, 0]),
			item("a2", [0.99, 0.01]),
			item("a3", [0.98, 0.02]),
			item("b1", [0, 1]),
			item("b2", [0.01, 0.99]),
		];
		const clusters = cluster(items, { threshold: 0.9, minSize: 1 });
		expect(clusters[0]!.length).toBe(3);
		expect(clusters[1]!.length).toBe(2);
	});
});
