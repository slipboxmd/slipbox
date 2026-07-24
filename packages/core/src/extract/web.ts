import { runTool } from "./exec.js";
import { isUrl, isYouTube } from "./url.js";
import type { Extracted, Extractor } from "./types.js";

/**
 * Extract the readable article from a web page via `trafilatura` (fetches the URL
 * and strips nav/boilerplate). Returns markdown + title/author/date metadata.
 */
export const webExtractor: Extractor = {
	supports(source: string): boolean {
		return isUrl(source) && !isYouTube(source);
	},
	async extract(source: string): Promise<Extracted> {
		const url = source.trim();
		const out = await runTool("trafilatura", {
			args: ["--output-format", "json", "--with-metadata", "-u", url],
			install: "pipx install trafilatura   |  pip3 install trafilatura",
			unlocks: "read web page sources",
			timeout: 60_000,
		});
		const line = out.trim().split(/\r?\n/).filter(Boolean).pop() ?? "{}";
		const d = JSON.parse(line) as { title?: string; author?: string; date?: string; text?: string; raw_text?: string };
		const title = (d.title || url).trim();
		const body = (d.text || d.raw_text || "").trim();
		if (!body) throw new Error(`No readable content extracted from ${url} (page may be JS-rendered or paywalled).`);
		return {
			markdown: `# ${title}\n\n${body}`,
			metadata: { title, author: d.author || undefined, date: d.date || undefined, kind: "web", origin: url },
		};
	},
};
