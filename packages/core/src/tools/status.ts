import { existsSync, readdirSync } from "node:fs";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { dirFor, loadConfig } from "../config/slipbox-config.js";
import type { SlipboxPaths } from "../config/types.js";
import { isAvailable, qmdDbPath } from "../qmd/cli.js";

function countMd(dir: string): number {
	if (!existsSync(dir)) return 0;
	return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

export function registerStatus(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_status",
		label: "Slipbox status",
		description: "Report the slipbox: note counts by type, whether a .slipbox config was found, and QMD index/tool readiness.",
		promptSnippet: "Check the size and health of the slipbox.",
		parameters: Type.Object({}),
		async execute(_id: string, _params: unknown, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
			const config = loadConfig(ctx.cwd);
			const keys: (keyof SlipboxPaths)[] = ["references", "reference_notes", "literature_notes", "permanent_notes", "maps"];
			const counts = Object.fromEntries(keys.map((k) => [k, countMd(dirFor(config, k))]));
			const qmdOk = await isAvailable();
			const indexed = existsSync(qmdDbPath(config.root));

			const lines = [
				`Slipbox root: ${config.root}${config.found ? "" : "  (no .slipbox found — using defaults)"}`,
				"",
				"Notes:",
				`  references:       ${counts.references}`,
				`  reference-notes:  ${counts.reference_notes}`,
				`  literature-notes: ${counts.literature_notes}`,
				`  permanent-notes:  ${counts.permanent_notes}`,
				`  maps:             ${counts.maps}`,
				"",
				`QMD installed: ${qmdOk ? "yes" : "no"}`,
				`Index present: ${indexed ? "yes" : "no (run slipbox_reindex or ingest a source)"}`,
			];
			return { content: [{ type: "text", text: lines.join("\n") }], details: { counts, qmdOk, indexed, found: config.found } };
		},
	});
}
