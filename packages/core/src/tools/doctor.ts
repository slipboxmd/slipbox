import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { detectTools } from "../env/detect.js";
import { renderReadiness } from "../env/guide.js";

export function registerDoctor(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_doctor",
		label: "Slipbox doctor",
		description:
			"Check which external tools (qmd, pandoc, yt-dlp, ffmpeg, whisper) are installed and what each unlocks. " +
			"Run before ingesting; guide the user to install any missing required tool.",
		promptSnippet: "Verify the slipbox environment / available source formats.",
		parameters: Type.Object({}),
		async execute() {
			const tools = await detectTools();
			return { content: [{ type: "text", text: renderReadiness(tools) }], details: { tools } };
		},
	});
}
