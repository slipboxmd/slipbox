import Link from "next/link";
import { getSlipbox } from "@lib/load.js";
import { excerpt } from "@lib/markdown.js";
import { TYPE_LABEL } from "@lib/model.js";

const FEED_LIMIT = 60;

export default function Home() {
	const slipbox = getSlipbox();
	// Notes are already newest-first from the loader.
	const feed = slipbox.notes.slice(0, FEED_LIMIT);

	if (feed.length === 0) {
		return (
			<main>
				<div className="container">
					<h1 className="page-title">{slipbox.name}</h1>
					<p className="page-intro">Nothing here yet.</p>
					<p className="empty">
						Ingest a source to get started — drop a file in <code>sources/</code> or pass a URL, then run{" "}
						<code>slipbox_ingest</code>. Notes will appear here as they're written.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main>
			<div className="container">
				<h1 className="page-title">{slipbox.name}</h1>
				<p className="page-intro">
					{slipbox.notes.length} note{slipbox.notes.length === 1 ? "" : "s"}, newest first.
				</p>
				<ul className="feed">
					{feed.map((n) => (
						<li className="feed-item" key={n.href}>
							<div className="note-kicker">
								<span>{TYPE_LABEL[n.type]}</span>
								{n.created ? (
									<>
										<span className="sep">·</span>
										<span>{n.created}</span>
									</>
								) : null}
								{n.source?.label ? (
									<>
										<span className="sep">·</span>
										<span>{n.source.label}</span>
									</>
								) : null}
							</div>
							<h2 className="feed-title">
								<Link href={n.href}>{n.title}</Link>
							</h2>
							<p className="feed-excerpt">{excerpt(n.body, 220)}</p>
						</li>
					))}
				</ul>
				{slipbox.notes.length > FEED_LIMIT ? (
					<p className="search-meta">
						Showing the {FEED_LIMIT} most recent. <Link href="/references/">Browse by source</Link> or{" "}
						<Link href="/search/">search</Link> for the rest.
					</p>
				) : null}
			</div>
		</main>
	);
}
