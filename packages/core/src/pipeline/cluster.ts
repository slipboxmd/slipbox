export interface HasVector {
	vector: number[];
}

export interface ClusterOptions {
	/**
	 * Merge two clusters while their AVERAGE pairwise cosine similarity is at/above
	 * this value (0..1). Higher = more, tighter clusters; lower = fewer, broader.
	 */
	threshold: number;
	/** Clusters with fewer members than this are dropped. */
	minSize: number;
}

/** Above this chunk count, refuse rather than allocate an O(n²) matrix. */
const MAX_ITEMS = 4000;

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

/**
 * Group items by similarity using **average-linkage agglomerative clustering**
 * (UPGMA): repeatedly merge the two clusters with the highest average pairwise
 * cosine similarity until the best merge falls below `threshold`. Unlike
 * single-linkage/connected-components this resists "chaining" (one giant blob),
 * so a document yields a sensible spread of idea clusters. Deterministic;
 * clusters are returned largest-first and filtered by `minSize`.
 */
export function cluster<T extends HasVector>(items: T[], opts: ClusterOptions): T[][] {
	const n = items.length;
	if (n === 0) return [];
	if (n === 1) return opts.minSize <= 1 ? [[items[0]!]] : [];
	if (n > MAX_ITEMS) {
		throw new Error(`cluster(): ${n} items exceeds the ${MAX_ITEMS} limit; split the source or pre-summarize.`);
	}

	const unit = items.map((it) => normalize(it.vector));

	// Symmetric average-similarity matrix between currently-active clusters.
	const sim: Float64Array[] = Array.from({ length: n }, () => new Float64Array(n));
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const s = dot(unit[i]!, unit[j]!);
			sim[i]![j] = s;
			sim[j]![i] = s;
		}
	}

	const active = new Uint8Array(n).fill(1);
	const size = new Int32Array(n).fill(1);
	const members: number[][] = items.map((_, i) => [i]);
	const nn = new Int32Array(n).fill(-1); // nearest active neighbor of each cluster
	const nnSim = new Float64Array(n).fill(Number.NEGATIVE_INFINITY);

	const recomputeNN = (i: number): void => {
		let best = Number.NEGATIVE_INFINITY;
		let bj = -1;
		const row = sim[i]!;
		for (let j = 0; j < n; j++) {
			if (j === i || !active[j]) continue;
			const s = row[j]!;
			if (s > best || (s === best && (bj < 0 || j < bj))) {
				best = s;
				bj = j;
			}
		}
		nn[i] = bj;
		nnSim[i] = best;
	};
	for (let i = 0; i < n; i++) recomputeNN(i);

	let remaining = n;
	while (remaining > 1) {
		// Active cluster with the highest nearest-neighbor similarity.
		let bi = -1;
		let best = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < n; i++) {
			if (!active[i]) continue;
			if (nnSim[i]! > best || (nnSim[i]! === best && (bi < 0 || i < bi))) {
				best = nnSim[i]!;
				bi = i;
			}
		}
		if (bi < 0 || best < opts.threshold) break;

		const bj = nn[bi]!;
		if (bj < 0 || !active[bj]) {
			recomputeNN(bi);
			continue;
		}

		// Merge the higher index into the lower for determinism.
		const lo = Math.min(bi, bj);
		const hi = Math.max(bi, bj);
		const na = size[lo]!;
		const nb = size[hi]!;
		for (let k = 0; k < n; k++) {
			if (!active[k] || k === lo || k === hi) continue;
			const merged = (na * sim[lo]![k]! + nb * sim[hi]![k]!) / (na + nb);
			sim[lo]![k] = merged;
			sim[k]![lo] = merged;
		}
		members[lo] = members[lo]!.concat(members[hi]!);
		size[lo] = na + nb;
		active[hi] = 0;
		remaining--;

		recomputeNN(lo);
		// Any cluster whose nearest neighbor was one of the merged pair must refresh.
		for (let k = 0; k < n; k++) {
			if (!active[k] || k === lo) continue;
			const cur = nn[k]!;
			if (cur === hi || cur === lo || cur < 0 || !active[cur]) recomputeNN(k);
		}
	}

	const clusters: T[][] = [];
	for (let i = 0; i < n; i++) {
		if (active[i]) clusters.push(members[i]!.map((idx) => items[idx]!));
	}
	return clusters.filter((c) => c.length >= opts.minSize).sort((a, b) => b.length - a.length);
}
