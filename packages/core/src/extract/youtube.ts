import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool } from "./exec.js";
import { isUrl, isYouTube, ytDate } from "./url.js";
import type { Extracted, Extractor } from "./types.js";

/**
 * Capture a YouTube video as a markdown source: title + link + metadata + the
 * transcript (auto-captions via yt-dlp). No transcript → falls back to the
 * description.
 */
export const youtubeExtractor: Extractor = {
	supports(source: string): boolean {
		return isUrl(source) && isYouTube(source);
	},
	async extract(source: string): Promise<Extracted> {
		const url = source.trim();
		const install = "brew install yt-dlp   |  pipx install yt-dlp";
		const metaJson = await runTool("yt-dlp", {
			args: ["--skip-download", "--dump-json", "--no-warnings", url],
			install,
			unlocks: "read YouTube sources",
			timeout: 120_000,
		});
		const meta = JSON.parse(metaJson.trim().split(/\r?\n/)[0]!) as {
			title?: string;
			uploader?: string;
			channel?: string;
			upload_date?: string;
			webpage_url?: string;
			description?: string;
		};

		let transcript = "";
		const dir = await mkdtemp(join(tmpdir(), "slipbox-yt-"));
		try {
			// Request only English (+ its original/regional variants). A broad `en.*`
			// pulls dozens of auto-translated tracks and trips YouTube's 429 limiter.
			await runTool("yt-dlp", {
				args: ["--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en,en-orig,en-US,en-GB", "--convert-subs", "vtt", "-o", join(dir, "%(id)s.%(ext)s"), "--no-warnings", url],
				install,
				unlocks: "read YouTube transcripts",
				timeout: 180_000,
			}).catch(() => {
				/* best-effort: some sub tracks may 429; we still use whatever downloaded */
			});
			// Read whatever vtt landed even if the command exited non-zero. Prefer a
			// manual/original track (shorter name) over auto-translations.
			const vtts = (await readdir(dir)).filter((f) => f.endsWith(".vtt")).sort((a, b) => a.length - b.length || a.localeCompare(b));
			if (vtts[0]) transcript = vttToText(await readFile(join(dir, vtts[0]), "utf8"));
		} finally {
			await rm(dir, { recursive: true, force: true });
		}

		const title = (meta.title || url).trim();
		const byline = [meta.uploader || meta.channel, ytDate(meta.upload_date)].filter(Boolean).join(" · ");
		const header = `# ${title}\n\n[Watch on YouTube](${meta.webpage_url || url})${byline ? ` · ${byline}` : ""}\n\n`;
		const body = transcript || (meta.description || "").trim() || "(no transcript available)";
		return {
			markdown: header + body,
			metadata: { title, author: meta.uploader || meta.channel || undefined, date: ytDate(meta.upload_date), kind: "youtube", origin: url },
		};
	},
};

/** WEBVTT → plain transcript: drop cues/timestamps/tags and collapse rolling-caption repeats. */
export function vttToText(vtt: string): string {
	const out: string[] = [];
	let last = "";
	for (const raw of vtt.split(/\r?\n/)) {
		if (/^WEBVTT/.test(raw) || /-->/.test(raw) || /^\s*$/.test(raw) || /^\s*(Kind|Language|NOTE|STYLE):/i.test(raw) || /^\d+$/.test(raw)) continue;
		const line = raw.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
		if (!line || line === last) continue;
		// Auto-captions roll: each cue often repeats the tail of the previous. Skip if contained in the last line.
		if (last && last.endsWith(line)) continue;
		out.push(line);
		last = line;
	}
	return out.join(" ").replace(/\s+/g, " ").trim();
}
