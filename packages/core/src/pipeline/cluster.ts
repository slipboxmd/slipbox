export interface HasVector {
	vector: number[];
}

export interface ClusterOptions {
	/** Cosine similarity at/above which two items are linked (0..1). */
	threshold: number;
	/** Clusters with fewer members than this are dropped. */
	minSize: number;
}

function normalize(v: number[]): number[] {
	let norm = 0;
	for (const x of v) norm += x * x;
	norm = Math.sqrt(norm) || 1;
	return v.map((x) => x / norm);
}

function dot(a: number[], b: number[]): number {
	let s = 0;
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
	return s;
}

/** Union-find with path compression. */
class DSU {
	private parent: number[];
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i);
	}
	find(i: number): number {
		while (this.parent[i] !== i) {
			this.parent[i] = this.parent[this.parent[i]!]!;
			i = this.parent[i]!;
		}
		return i;
	}
	union(a: number, b: number): void {
		this.parent[this.find(a)] = this.find(b);
	}
}

/**
 * Group items into clusters by similarity: build a graph where items are linked
 * when their cosine similarity ≥ `threshold`, then return connected components.
 * Deterministic; order within a cluster follows input order. Clusters smaller
 * than `minSize` are discarded.
 */
export function cluster<T extends HasVector>(items: T[], opts: ClusterOptions): T[][] {
	const n = items.length;
	if (n === 0) return [];
	const unit = items.map((it) => normalize(it.vector));
	const dsu = new DSU(n);

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (dot(unit[i]!, unit[j]!) >= opts.threshold) dsu.union(i, j);
		}
	}

	const groups = new Map<number, T[]>();
	for (let i = 0; i < n; i++) {
		const root = dsu.find(i);
		if (!groups.has(root)) groups.set(root, []);
		groups.get(root)!.push(items[i]!);
	}

	return [...groups.values()]
		.filter((g) => g.length >= opts.minSize)
		.sort((a, b) => b.length - a.length);
}
