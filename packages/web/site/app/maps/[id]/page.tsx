import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyNote } from "../../../components/EmptyNote";
import { getSlipbox } from "@lib/load.js";
import { renderMarkdown } from "@lib/markdown.js";
import { EMPTY_ID, paramsForType } from "@lib/model.js";
import { Backlinks, Kicker, Section, Tags } from "../../../components/NoteBits";

export function generateStaticParams() {
	return paramsForType(getSlipbox(), "moc");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	if (id === EMPTY_ID) return { title: "Maps of Content — Slipbox" };
	const note = getSlipbox().byId.get(id);
	return { title: note ? `${note.title} — Slipbox` : "Slipbox" };
}

export default async function MocPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const note = getSlipbox().byId.get(id);
	if (!note || note.type !== "moc") notFound();
	// A MOC's body is usually framing prose with the links woven in, so we render
	// the prose first and list any frontmatter links that weren't mentioned inline.
	const html = renderMarkdown(note.body);
	const inBody = new Set(
		[...note.body.matchAll(/\[\[([^\]|]+)/g)].map((m) => m[1]!.trim().replace(/\.md$/, "")),
	);
	const extra = note.links.filter((l) => !inBody.has(l.target));

	return (
		<main>
			<article className="container">
				<Kicker type={note.type} date={note.created} />
				<h1 className="note-title">{note.title}</h1>
				<div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
				<Tags tags={note.tags} />
				{extra.length > 0 ? (
					<Section label={`Also gathers (${extra.length})`}>
						<ul className="link-list">
							{extra.map((l) => (
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
