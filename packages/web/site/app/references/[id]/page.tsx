import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyNote } from "../../../components/EmptyNote";
import { getSlipbox } from "@lib/load.js";
import { renderMarkdown } from "@lib/markdown.js";
import { EMPTY_ID, paramsForType } from "@lib/model.js";
import { Backlinks, Kicker, LinkList, Section, SourceLinks } from "../../../components/NoteBits";

export function generateStaticParams() {
	return paramsForType(getSlipbox(), "reference");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (id === EMPTY_ID) return { title: "Sources — Slipbox" };
	const note = getSlipbox().byId.get(id);
	return { title: note ? `${note.title} — Slipbox` : "Slipbox" };
}

export default async function ReferencePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const slipbox = getSlipbox();
	const note = slipbox.byId.get(id);
	if (!note || note.type !== "reference") notFound();

	// The literature notes drawn from this source: its own links, plus anything
	// whose `source:` points back here (belt and braces — either may be present).
	const drawn = [
		...note.links.filter((l) => l.type === "literature-note"),
		...slipbox.notes
			.filter((n) => n.type === "literature-note" && n.source?.href === note.href)
			.map((n) => ({ target: n.slug, label: n.title, href: n.href, type: n.type })),
	].filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i);

	const html = renderMarkdown(note.body);

	return (
		<main>
			<article className="container">
				<Kicker
					type={note.type}
					date={note.date ?? note.created}
					extra={note.kind ? <span>{note.kind}</span> : undefined}
				/>
				<h1 className="note-title">{note.title}</h1>

				<div className="provenance">
					{note.author ? <div>{note.author}</div> : null}
					<div>
						<SourceLinks note={note} />
					</div>
				</div>

				{note.body.trim() ? (
					<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
				) : (
					<p className="empty">
						No summary yet — run <code>slipbox_write_reference_note</code> to add one.
					</p>
				)}

				{drawn.length > 0 ? (
					<Section label={`Notes from this source (${drawn.length})`}>
						<LinkList links={drawn} />
					</Section>
				) : null}

				<Backlinks note={note} />

				<Section label="Elsewhere">
					<ul className="link-list">
						<li>
							<Link href="/references/">All sources</Link>
						</li>
					</ul>
				</Section>
			</article>
		</main>
	);
}
