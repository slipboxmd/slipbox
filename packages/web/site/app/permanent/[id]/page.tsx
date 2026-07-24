import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyNote } from "../../../components/EmptyNote";
import { getSlipbox } from "@lib/load.js";
import { renderMarkdown } from "@lib/markdown.js";
import { EMPTY_ID, paramsForType } from "@lib/model.js";
import { Backlinks, Kicker, Section, Tags } from "../../../components/NoteBits";

export function generateStaticParams() {
	return paramsForType(getSlipbox(), "permanent-note");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (id === EMPTY_ID) return { title: "Permanent notes — Slipbox" };
	const note = getSlipbox().byId.get(id);
	return { title: note ? `${note.title} — Slipbox` : "Slipbox" };
}

export default async function PermanentNotePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const note = getSlipbox().byId.get(id);
	if (!note || note.type !== "permanent-note") notFound();
	const html = renderMarkdown(note.body);

	return (
		<main>
			<article className="container">
				<Kicker type={note.type} date={note.created} />
				<h1 className="note-title">{note.title}</h1>
				<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
				<Tags tags={note.tags} />
				{note.links.length > 0 ? (
					<Section label={`Links to (${note.links.length})`}>
						<ul className="link-list">
							{note.links.map((l) => (
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
