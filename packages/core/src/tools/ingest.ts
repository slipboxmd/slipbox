import { existsSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { dirFor, loadConfig } from "../config/slipbox-config.js";
import type { SlipboxConfig } from "../config/types.js";
import { yoloDefault } from "../env/mode.js";
import { isUrl } from "../extract/index.js";
import { ingestSource } from "../pipeline/ingest.js";
import { isAvailable } from "../qmd/cli.js";
import { say, type OnUpdate } from "./result.js";
import { qmdMissing } from "./search.js";

/**
 * Resolve a source argument to a real file. Sources live in `sources/`, so we
 * look there first (by full or base name), then fall back to a path relative to
 * cwd / the slipbox root. Returns null if nothing matches.
 */
function resolveSource(config: SlipboxConfig, cwd: string, given: string): string | null {
	const sourcesDir = dirFor(config, "sources");
	const candidates = [
		join(sourcesDir, given),
		join(sourcesDir, basename(given)),
		resolve(cwd, given),
		resolve(config.root, given),
	];
	for (const c of candidates) {
		if (existsSync(c) && statSync(c).isFile()) return c;
	}
	return null;
}

export function registerIngest(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_ingest",
		label: "Ingest source",
		description:
			"Ingest a source into the slipbox: extract → clean → index/embed with QMD → cluster the passages into idea groups. " +
			"Sources live in the slipbox's `sources/` folder — pass just the filename (e.g. `confessions.txt`) and it's resolved " +
			"there. Returns candidate idea clusters (recurring themes first) with excerpts. Review them and write a literature " +
			"note for each SUBSTANTIVE idea with slipbox_write_note — no fixed count; a longer source yields more; skip thin or " +
			"boilerplate clusters. Then slipbox_autolink and a reference note. A source may be a file in sources/ " +
				"(.txt/.md, .pdf, .epub/.docx/.html, or audio) OR an https:// URL (web article or YouTube video).",
		promptSnippet: "Bring a new source (from sources/) into the slipbox and get idea clusters.",
		parameters: Type.Object({
			source: Type.String({ description: "Source filename in sources/ (e.g. confessions.txt), a path to a file, or an https:// URL" }),
				yolo: Type.Optional(
					Type.Boolean({
						description:
							"One-shot: write every note, autolink, and the reference note without pausing for review. " +
							"Defaults to the session mode (`slipbox --yolo`), otherwise false (review at the seams).",
					}),
				),
		}),
		async execute(_id: string, params: { source: string; yolo?: boolean }, _signal: unknown, onUpdate: OnUpdate, ctx: ExtensionContext) {
			if (!(await isAvailable())) return say(qmdMissing(), { error: "qmd-missing" });
			const config = loadConfig(ctx.cwd);
			// URLs are ingested directly (fetched + archived); files are resolved under sources/.
			const sourcePath = isUrl(params.source) ? params.source.trim() : resolveSource(config, ctx.cwd, params.source);
			if (!sourcePath) {
				return say(
					`Couldn't find "${params.source}". Sources should be in ${dirFor(config, "sources")} — ` +
						`drop the file there (or pass a full path or https:// URL). Then ingest.`,
					{ error: "source-not-found" },
				);
			}

			onUpdate?.(say("Extracting + indexing (qmd update/embed)…"));
			const result = await ingestSource(config, sourcePath);
			onUpdate?.(say(`Clustered ${result.totalChunks} chunks into ${result.clusters.length} ideas.`));

			const yolo = params.yolo ?? yoloDefault();
			return say(renderIngest(result, config.found, yolo), { ingest: result, yolo });
		},
	});
}

/** How many recurring-theme clusters to spell out before summarizing the rest. */
const SHOW_THEMES = 40;
const EXCERPT_LEN = 220;

function renderIngest(r: import("../pipeline/ingest.js").IngestResult, found: boolean, yolo: boolean): string {
	const themes = r.clusters.filter((c) => c.size >= 2);
	const singles = r.clusters.filter((c) => c.size === 1);

	// Review mode (default) stops at the seams for human input; yolo runs the
	// whole pipeline through to the reference note in one go.
	const pacing = yolo
		? [
				"**One-shot mode (--yolo): do not stop for review.** Work through every substantive cluster now, then finish the",
				"whole pipeline in this turn: all literature notes → `slipbox_autolink` → `slipbox_write_reference_note`. Don't ask",
				"for confirmation between steps or report back mid-way; summarize what you wrote once it's all done.",
			]
		: [
				"**Review mode: keep the human in the loop.** Show what you found and check in before writing a batch of notes,",
				"rather than writing everything silently. (Run `slipbox --yolo`, or pass `yolo: true`, for one-shot.)",
			];

	const head = [
		found ? "" : "Note: no .slipbox config found — used defaults in the current directory.",
		`Ingested **${r.title}**.`,
		`- reference: ${r.reference.link}  (${r.reference.relPath})`,
		`- extracted text: ${r.extracted.relPath}`,
		`- ${r.totalChunks} chunks → ${themes.length} recurring themes + ${singles.length} one-off passages`,
		"",
		...pacing,
		"",
		"For each SUBSTANTIVE theme below: first call `slipbox_read_cluster` with this source and the cluster's chunk seqs to",
		"read the FULL passages, then write a literature note that EXPLAINS the idea — summarizing all those passages,",
		"describing what the author says and means, and quoting the author's own words where apt. Title = one short sentence",
		"stating the idea. Let length follow the material: a cluster with more/broader passages deserves a fuller note (several",
		"paragraphs); a small one a briefer note. No target length or count; skip thin/repetitive/boilerplate clusters.",
		`Use source link \`${r.reference.link}\` and each cluster's chunk seqs.`,
		"When ALL notes are written, run `slipbox_autolink` to connect related notes, then write a reference note.",
		"",
		"## Recurring themes (largest first)",
	].filter(Boolean);

	const shown = themes.slice(0, SHOW_THEMES).map((c) => {
		const excerpt = (c.excerpts[0] ?? "").slice(0, EXCERPT_LEN).replace(/\s+/g, " ").trim();
		return `• Cluster ${c.index} — ${c.size} chunks (seqs ${c.chunkSeqs.join(", ")})\n    ${excerpt}…`;
	});
	if (themes.length > SHOW_THEMES) {
		shown.push(`…and ${themes.length - SHOW_THEMES} more themes (full data in the tool result details).`);
	}

	const tail =
		singles.length > 0
			? `\n${singles.length} one-off single-passage clusters are in the details — mine them for any standout ideas.`
			: "";

	return [...head, ...shown, tail].join("\n");
}
