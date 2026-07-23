import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { dirFor, loadConfig } from "../config/slipbox-config.js";
import { say } from "./result.js";

/** Cheaply peek a source's title without reading the whole file. */
function peekTitle(path: string): string {
	let head = "";
	try {
		head = readFileSync(path, "utf8").slice(0, 8192);
	} catch {
		return basename(path);
	}
	const gutenberg = head.match(/^\s*Title:\s*(.+?)\s*$/im);
	if (gutenberg) return gutenberg[1]!.trim();
	const heading = head.match(/^\s*#\s+(.+?)\s*$/m);
	if (heading) return heading[1]!.trim();
	return basename(path);
}

export function registerSources(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_sources",
		label: "List sources",
		description:
			"List the source files available to ingest (in the slipbox's sources/ folder), each with its detected title. Use " +
			"this to see what's there and pick one — then ingest by filename. Don't hunt with find/grep.",
		promptSnippet: "See which sources are available to ingest.",
		parameters: Type.Object({}),
		async execute(_id: string, _params: unknown, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
			const config = loadConfig(ctx.cwd);
			const dir = dirFor(config, "sources");
			if (!existsSync(dir)) {
				return say(`No sources/ folder yet. Create one and drop source files in ${dir}.`, { sources: [] });
			}
			const files = readdirSync(dir)
				.filter((f) => !f.startsWith(".") && statSync(join(dir, f)).isFile())
				.sort();
			if (files.length === 0) {
				return say(`No sources found in ${dir}. Drop files there, then ingest by filename.`, { sources: [] });
			}
			const sources = files.map((f) => ({ file: f, title: peekTitle(join(dir, f)) }));
			const text = ["Sources available to ingest (in sources/):", ...sources.map((s) => `  • ${s.file} — ${s.title}`)].join("\n");
			return say(text, { sources });
		},
	});
}
