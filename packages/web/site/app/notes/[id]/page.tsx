import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyNote } from "../../../components/EmptyNote";
import { getSlipbox } from "@lib/load.js";
import { renderMarkdown } from "@lib/markdown.js";
import { EMPTY_ID, paramsForType } from "@lib/model.js";
import { Backlinks, Kicker, Section, SourceLinks, Tags } from "../../../components/NoteBits";

export function generateStaticParams() {
	return paramsForType(getSlipbox(), "literature-note");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (id === EMPTY_ID) return { title: "Notes — Slipbox" };
	const note = getSlipbox().byId.get(id);
	return { title: note ? `${note.title} — Slipbox` : "Slipbox" };
}

export default async function LiteratureNotePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const slipbox = getSlipbox();
	const note = slipbox.byId.get(id);
	if (!note || note.type !== "literature-note") notFound();

	const reference = note.source?.href ? slipbox.notes.find((n) => n.href === note.source!.href) : undefined;
	const html = renderMarkdown(note.body);
	const outgoing = note.links.filter((l) => l.href !== note.source?.href);

	return (
		<main>
			<article className="container">
				<Kicker type={note.type} date={note.created} />
				<h1 className="note-title">{note.title}</h1>

				{/* Provenance: an idea should always name where it came from. */}
				{note.source ? (
					<div className="provenance">
						<div>
							From{" "}
							{note.source.href ? <Link href={note.source.href}>{note.source.label}</Link> : <span>{note.source.label}</span>}
							{reference?.author ? <span className="meta"> · {reference.author}</span> : null}
						</div>
						{reference?.origin ? (
							<div className="meta">
								<SourceLinks note={reference} />
							</div>
						) : null}
					</div>
				) : null}

				<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

				<Tags tags={note.tags} />

				{note.chunks.length > 0 ? (
					<p className="chunk-note">
						Distilled from passage{note.chunks.length === 1 ? "" : "s"} {note.chunks.join(", ")} of the source.
					</p>
				) : null}

				{outgoing.length > 0 ? (
					<Section label={`Links to (${outgoing.length})`}>
						<ul className="link-list">
							{outgoing.map((l) => (
								<li key={l.target}>
									{l.href ? <Link href={l.href}>{l.label}</Link> : <span className="link-broken">{l.label} (missing)</span>}
								</li>
							))}
						</ul>
					</Section>
				) : null}

				<Backlinks note={note} />
			</article>
		</main>
	);
}
