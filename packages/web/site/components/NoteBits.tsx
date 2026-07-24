import Link from "next/link";
import type { Link as NoteLink, Note, NoteType } from "@lib/model.js";
import { TYPE_LABEL } from "@lib/model.js";

/** A list of links to other notes, with unresolvable ones shown as broken. */
export function LinkList({ links }: { links: NoteLink[] }) {
	return (
		<ul className="link-list">
			{links.map((l) => (
				<li key={`${l.target}-${l.href ?? "broken"}`}>
					{l.href ? (
						<Link href={l.href}>
							{l.label}
							{l.type ? <span className="link-type">{TYPE_LABEL[l.type]}</span> : null}
						</Link>
					) : (
						// Show broken links rather than hiding them — a dangling link is
						// a real signal that a note was renamed or never written.
						<span className="link-broken" title="This link doesn't resolve to a note">
							{l.label} (missing)
						</span>
					)}
				</li>
			))}
		</ul>
	);
}

export function Section({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<section className="note-section">
			<h2 className="section-label">{label}</h2>
			{children}
		</section>
	);
}

/** "Linked from" — every note that points at this one. */
export function Backlinks({ note }: { note: Note }) {
	if (note.backlinks.length === 0) return null;
	return (
		<Section label={`Linked from (${note.backlinks.length})`}>
			<LinkList links={note.backlinks} />
		</Section>
	);
}

export function Tags({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null;
	return (
		<div className="tags">
			{tags.map((t) => (
				<span className="tag" key={t}>
					{t}
				</span>
			))}
		</div>
	);
}

export function Kicker({ type, date, extra }: { type: NoteType; date?: string; extra?: React.ReactNode }) {
	return (
		<div className="note-kicker">
			<span>{TYPE_LABEL[type]}</span>
			{date ? (
				<>
					<span className="sep">·</span>
					<span>{date}</span>
				</>
			) : null}
			{extra ? (
				<>
					<span className="sep">·</span>
					{extra}
				</>
			) : null}
		</div>
	);
}

/** Where a source can be read: the live URL and the pinned Wayback snapshot. */
export function SourceLinks({ note }: { note: Note }) {
	if (!note.origin) return null;
	const isUrl = /^https?:\/\//i.test(note.origin);
	return (
		<>
			{isUrl ? (
				<a href={note.origin} rel="noreferrer noopener">
					Original
				</a>
			) : (
				<span className="meta">{note.origin.split("/").pop()}</span>
			)}
			{note.archived ? (
				<>
					{" · "}
					<a href={note.archived} rel="noreferrer noopener" title={`Wayback snapshot${note.archivedDate ? ` from ${note.archivedDate}` : ""}`}>
						Archived{note.archivedDate ? ` ${note.archivedDate}` : ""}
					</a>
				</>
			) : null}
		</>
	);
}
