"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchDoc } from "@lib/indexes.js";
import { TYPE_LABEL } from "@lib/model.js";

/**
 * Client-side search over the prebuilt index.
 *
 * Deliberately hand-rolled rather than pulling in a search library: for a few
 * hundred notes a weighted substring scorer is instant and adds no dependency.
 * Scoring favours titles, then tags, then body excerpts, with a bonus for
 * whole-word and prefix matches so "growth" beats "growths" in a long excerpt.
 */
function score(doc: SearchDoc, terms: string[]): number {
	const title = doc.t.toLowerCase();
	const tags = doc.g.join(" ").toLowerCase();
	const body = doc.x.toLowerCase();
	const source = (doc.s ?? "").toLowerCase();
	let total = 0;

	for (const term of terms) {
		let best = 0;
		if (title.startsWith(term)) best = 120;
		else if (new RegExp(`\\b${escapeRe(term)}`).test(title)) best = 90;
		else if (title.includes(term)) best = 60;
		else if (tags.includes(term)) best = 45;
		else if (new RegExp(`\\b${escapeRe(term)}`).test(body)) best = 25;
		else if (body.includes(term)) best = 15;
		else if (source.includes(term)) best = 10;
		// Every term must match something, or the doc is out.
		if (best === 0) return 0;
		total += best;
	}
	return total;
}

function escapeRe(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Search({ docs }: { docs: SearchDoc[] }) {
	const [query, setQuery] = useState("");

	const results = useMemo(() => {
		const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (terms.length === 0) return [];
		return docs
			.map((d) => ({ doc: d, s: score(d, terms) }))
			.filter((r) => r.s > 0)
			.sort((a, b) => b.s - a.s || a.doc.t.localeCompare(b.doc.t))
			.slice(0, 50);
	}, [query, docs]);

	const terms = query.trim().split(/\s+/).filter(Boolean);

	return (
		<div>
			<input
				className="search-input"
				type="search"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Search notes…"
				autoFocus
				aria-label="Search notes"
			/>

			{terms.length === 0 ? (
				<p className="search-meta">
					{docs.length} note{docs.length === 1 ? "" : "s"} indexed.
				</p>
			) : (
				<p className="search-meta">
					{results.length === 0 ? "No matches" : `${results.length} match${results.length === 1 ? "" : "es"}`}
				</p>
			)}

			<ul className="feed">
				{results.map(({ doc }) => (
					<li className="feed-item" key={doc.h}>
						<div className="note-kicker">
							<span>{TYPE_LABEL[doc.y]}</span>
							{doc.s ? (
								<>
									<span className="sep">·</span>
									<span>{doc.s}</span>
								</>
							) : null}
						</div>
						<h2 className="feed-title">
							<Link href={doc.h}>{doc.t}</Link>
						</h2>
						<p className="feed-excerpt">{doc.x}</p>
					</li>
				))}
			</ul>
		</div>
	);
}
