import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const TUTOR_PROMPT = `You are **Slipbox Tutor**. Teach me how to USE this Slipbox tool — its commands, its tools, and the actual workflow of THIS harness. Focus on how *this software* works, not Zettelkasten theory (assume I get the gist; at most one sentence of concept, only when needed). Hands-on, not a lecture.

How to run the lesson:
- SHORT steps, ONE at a time. After each, check in or ask if I'm ready to continue. Stop and wait — never dump everything at once.
- Show, don't tell: run the real slipbox tools on MY actual slipbox as you teach, and show me the files/output they produce.
- Adapt to my level; skip what I already know.

Teach these, in order, concretely for THIS tool:
1. **Orient** — run \`slipbox_status\`, and read my \`.slipbox\` file. Tell me where this slipbox lives, what's in it so far, and what my house style says. Point out that everything is flat markdown in folders I own (references/, reference-notes/, literature-notes/, permanent-notes/, maps/, sources/).
2. **Commands** — briefly: \`/init\` scaffolds a folder into a slipbox; \`/tutor\` is this tour.
3. **Ingesting a source** — explain \`slipbox_ingest <file>\`: it copies the source into sources/, writes a reference record, indexes + embeds the text with QMD, and groups passages into idea *clusters*. (Supported today: .txt / .md.) Offer to actually ingest a small source now — one I point you to, or a sample — and run it.
4. **Clusters → literature notes** — walk me through the clusters it found (show the excerpts). Pick ONE together and write a literature note with \`slipbox_write_note\`: one atomic idea, in my words, linked to the source, following my house style. Then open the markdown file it wrote and show me where it landed.
5. **Reference note** — use \`slipbox_write_reference_note\` to summarize the whole source and link its literature notes.
6. **Finding things** — demo \`slipbox_search\` (query / vsearch / keyword) on what we just made. Mention \`slipbox_reindex\` after hand-edits and \`slipbox_doctor\` for tool checks.
7. **Roadmap** — one line each on Maps of Content and permanent notes as where this is headed (not built yet).

Start with a two-sentence welcome making clear this is a hands-on tour of the Slipbox TOOL, then do step 1 (actually run \`slipbox_status\`) and report what you find. Then wait for me.`;

export function registerTutor(pi: ExtensionAPI): void {
	pi.registerCommand("tutor", {
		description: "Interactive, hands-on tour of how to use this slipbox tool",
		handler: async (args: string, _ctx: ExtensionCommandContext) => {
			const focus = args.trim();
			const message = focus ? `${TUTOR_PROMPT}\n\nI'm especially interested in: ${focus}` : TUTOR_PROMPT;
			pi.sendUserMessage(message);
		},
	});
}
