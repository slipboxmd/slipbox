import Link from "next/link";
import { getSlipbox } from "@lib/load.js";
import { notesOfType } from "@lib/model.js";

export const metadata = { title: "Sources — Slipbox" };

export default function ReferenceIndex() {
	const slipbox = getSlipbox();
	const refs = notesOfType(slipbox, "reference");
	const countFor = (href: string) =>
		slipbox.notes.filter((n) => n.type === "literature-note" && n.source?.href === href).length;

	return (
		<main>
			<div className="container">
				<h1 className="page-title">Sources</h1>
				<p className="page-intro">
					{refs.length} source{refs.length === 1 ? "" : "s"} ingested into this slipbox.
				</p>
				{refs.length === 0 ? (
					<p className="empty">
						No sources yet. Ingest one with <code>slipbox_ingest</code>.
					</p>
				) : (
					<ul className="feed">
						{refs.map((r) => {
							const n = countFor(r.href);
							return (
								<li className="feed-item" key={r.href}>
									<div className="note-kicker">
										{r.kind ? <span>{r.kind}</span> : null}
										{r.author ? (
											<>
												<span className="sep">·</span>
												<span>{r.author}</span>
											</>
										) : null}
										{r.date ? (
											<>
												<span className="sep">·</span>
												<span>{r.date}</span>
											</>
										) : null}
									</div>
									<h2 className="feed-title">
										<Link href={r.href}>{r.title}</Link>
									</h2>
									<p className="feed-excerpt">
										{n} note{n === 1 ? "" : "s"} drawn from this source
									</p>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</main>
	);
}
