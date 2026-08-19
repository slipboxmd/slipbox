import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { gather, type GatherCandidate } from "../pipeline/gather.js";
import { isAvailable } from "../qmd/cli.js";
import { say } from "./result.js";
import { qmdMissing } from "./search.js";

function renderCandidate(c: GatherCandidate, i: number): string {
	const cov = c.coverage === "new" ? "new" : c.coverage === "partial" ? "partially covered" : "already covered";
	const members = c.members.map((m) => `     - ${m.title} ${m.link}`).join("\n");
	const srcs = c.sources.length ? `\n   sources: ${c.sources.join(", ")}` : "";
	return `${i + 1}. ${c.label}  (cohesion ${c.cohesion.toFixed(2)}, ${c.members.length} note(s), ${cov})${srcs}\n${members}`;
}

export function registerGather(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_gather",
		label: "Gather notes for a permanent note",
		description:
			"Discover where a PERMANENT note is warranted by gathering related literature notes — it retrieves and organizes, it " +
			"does NOT write prose or generate a note. Three seed modes (presence of an argument selects the mode): pass `query` " +
			"to gather what the slipbox has on a topic (concept search); pass `sources` to see what emerged from specific sources; " +
			"pass neither to surface dense, un-synthesized neighborhoods (ambient/density). Each candidate reports its members, " +
			"cohesion, sources, and coverage vs. existing permanent notes. Use the result to open a conversation with the author " +
			"about writing one up — you never author it for them.",
		promptSnippet: "Find clusters of literature notes ripe for a permanent note (concept / ambient / source-scoped).",
		parameters: Type.Object({
			query: Type.Optional(Type.String({ description: "Concept-query seed: a phrase to gather notes about" })),
			sources: Type.Optional(Type.Array(Type.String(), { description: "Source-scoped seed: reference ids/links to scope to, e.g. [[references/<id>]]" })),
			include_covered: Type.Optional(Type.Boolean({ description: "Ambient mode: include neighborhoods already covered by a permanent note (default false)" })),
			limit: Type.Optional(Type.Number({ description: "Max candidates to return" })),
		}),
		async execute(
			_id: string,
			params: { query?: string; sources?: string[]; include_covered?: boolean; limit?: number },
			_signal: unknown,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			const result = await gather(config, {
				query: params.query,
				sources: params.sources,
				includeCovered: params.include_covered,
				limit: params.limit,
			});

			if (result.notes === 0) {
				const scope = result.mode === "source-scoped" ? " for those sources" : "";
				return say(`No literature notes found${scope} yet. Ingest and write some literature notes first, then gather.`, { gather: result });
			}
			if (result.candidates.length === 0) {
				if (result.mode === "concept-query") {
					return say(`Nothing in the slipbox groups around "${params.query}". Try broadening the phrase or a different angle.`, { gather: result });
				}
				if (result.mode === "ambient") {
					return say("No un-synthesized neighborhoods found — the slipbox looks well-synthesized. Pass include_covered to review covered ones.", { gather: result });
				}
				return say("Those sources' notes didn't group into a candidate. Try more sources or the concept-query mode.", { gather: result });
			}

			const header = `Gathered ${result.candidates.length} candidate grouping(s) [${result.mode}] from ${result.notes} literature note(s). ` +
				`Each is a possible permanent note — discuss with the author, then help them write one (never author it yourself):`;
			const body = result.candidates.map(renderCandidate).join("\n\n");
			return say(`${header}\n\n${body}`, { gather: result });
		},
	});
}
