/**
 * pi-slipbox — Pi extension entry point.
 *
 * SCAFFOLD / PLACEHOLDER. This registers the shape of the harness (commands +
 * a status tool) so the wiring is clear. The real pipeline tools (ingest,
 * search, cluster, moc, …) land once Phase-1 design is settled — see
 * docs/ARCHITECTURE.md.
 */
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function slipbox(pi: ExtensionAPI) {
	// One-time setup runs before session_start (async factory supported).

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("pi-slipbox loaded (scaffold)", "info");
		// TODO: locate + parse the nearest `.slipbox` config from ctx.cwd upward.
	});

	// TODO(context event): inject the slipbox's house-style config into the
	// agent's context each turn so it always knows this slipbox's conventions.

	pi.registerTool({
		name: "slipbox_status",
		label: "Slipbox status",
		description:
			"Report the state of the slipbox: note counts by type, orphans, and " +
			"whether the derived index is up to date. (Scaffold: not yet implemented.)",
		promptSnippet: "Use to check the health and size of the slipbox.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
			return {
				content: [
					{
						type: "text",
						text: "slipbox_status is not implemented yet — Phase 1 pipeline pending.",
					},
				],
				details: {},
			};
		},
	});

	// Planned tools (see docs/ARCHITECTURE.md "Tool surface"):
	//   slipbox_ingest, slipbox_search, slipbox_link,
	//   slipbox_cluster, slipbox_moc, slipbox_reindex
}
