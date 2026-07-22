import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { scaffoldSlipbox } from "../config/scaffold.js";

export function registerInit(pi: ExtensionAPI): void {
	pi.registerCommand("init", {
		description: "Turn the current folder into a slipbox (create .slipbox + note folders)",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const result = await scaffoldSlipbox(ctx.cwd);
			if (result.existed) {
				ctx.ui.notify("This folder is already a slipbox (.slipbox exists).", "info");
				return;
			}
			ctx.ui.notify(
				`Initialized slipbox in ${ctx.cwd}\n` +
					`  created .slipbox and folders: ${result.createdDirs.join(", ")}\n` +
					`Next: hand me a source, e.g. "ingest <path-to-file>".`,
				"info",
			);
		},
	});
}
