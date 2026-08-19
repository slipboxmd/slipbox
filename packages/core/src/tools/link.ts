import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { autolink, autolinkPermanent } from "../pipeline/link.js";
import { embed, ensureIndex, isAvailable, update } from "../qmd/cli.js";
import { say, type OnUpdate } from "./result.js";
import { qmdMissing } from "./search.js";

export function registerAutolink(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_autolink",
		label: "Autolink notes",
		description:
			"Connect notes to each other by similarity, across ALL sources in the slipbox. Runs two passes: literature-to-literature " +
			"and permanent-to-permanent. Run this once notes exist (e.g. after ingesting a source + writing its notes, or after " +
			"writing a permanent note). By default it's INCREMENTAL — it only links the newly-written notes (those without links " +
			"yet) into the network, so it stays fast as the slipbox grows; pass relink_all to recompute every note. Links are " +
			"mutual and merged into frontmatter. Idempotent.",
		promptSnippet: "Link newly-written notes into the network (run after writing a source's notes).",
		parameters: Type.Object({
			max_per_note: Type.Optional(Type.Integer({ description: "Max links to add per note (default 6)" })),
			threshold: Type.Optional(Type.Number({ description: "Min cosine similarity for a link, 0..1 (default 0.55)" })),
			relink_all: Type.Optional(Type.Boolean({ description: "Recompute links for EVERY note, not just new ones (default false)" })),
		}),
		async execute(_id: string, params: { max_per_note?: number; threshold?: number; relink_all?: boolean }, _signal: unknown, onUpdate: OnUpdate, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);

			onUpdate?.(say("Re-indexing so notes are embedded…"));
			await ensureIndex(config.root, config.qmd.collection);
			await update(config.root);
			await embed(config.root);

			onUpdate?.(say("Linking related notes…"));
			const linkOpts = {
				k: params.max_per_note ?? 6,
				threshold: params.threshold ?? 0.55,
				minLinks: 2,
				floor: 0.45,
				relinkAll: params.relink_all ?? false,
			};
			const result = await autolink(config, linkOpts);
			const permanent = await autolinkPermanent(config, linkOpts);

			const parts: string[] = [];
			if (result.notes === 0) parts.push("No literature notes found to link yet.");
			else parts.push(`Literature: linked ${result.linkedFrom} note(s) of ${result.notes} — ${result.linksAdded} links added.`);
			if (permanent.notes > 0) parts.push(`Permanent: linked ${permanent.linkedFrom} note(s) of ${permanent.notes} — ${permanent.linksAdded} links added.`);
			return say(parts.join(" "), { autolink: result, autolinkPermanent: permanent });
		},
	});
}
