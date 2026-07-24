import type { NoteType } from "@lib/model.js";
import { TYPE_LABEL } from "@lib/model.js";

const HINT: Record<NoteType, string> = {
	reference: "Ingest a source to create one.",
	"literature-note": "Ingest a source and write notes from its idea clusters.",
	"permanent-note": "Promote a literature note once an idea is fully your own.",
	moc: "Group related notes into a map once themes emerge.",
};

/** Shown when a note type has no notes yet (see EMPTY_ID in the model). */
export function EmptyNote({ type }: { type: NoteType }) {
	return (
		<main>
			<div className="container">
				<h1 className="page-title">No {TYPE_LABEL[type].toLowerCase()}s yet</h1>
				<p className="empty">{HINT[type]}</p>
			</div>
		</main>
	);
}
