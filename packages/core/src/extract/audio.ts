import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { runTool } from "./exec.js";
import type { Extracted, Extractor } from "./types.js";

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".flac", ".aac", ".opus"]);

/** Transcribe a local audio file (podcast/talk) to text via `whisper`. */
export const audioExtractor: Extractor = {
	supports(source: string): boolean {
		return AUDIO_EXTS.has(extname(source).toLowerCase());
	},
	async extract(source: string): Promise<Extracted> {
		const dir = await mkdtemp(join(tmpdir(), "slipbox-whisper-"));
		try {
			await runTool("whisper", {
				args: [source, "--model", "base.en", "--output_format", "txt", "--output_dir", dir, "--verbose", "False"],
				install: "pipx install openai-whisper   |  or use whisper.cpp",
				unlocks: "transcribe audio sources",
				timeout: 3_600_000, // transcription can be slow
			});
			const txt = (await readdir(dir)).find((f) => f.endsWith(".txt"));
			const transcript = txt ? joinSegments(await readFile(join(dir, txt), "utf8")) : "";
			const title = basename(source, extname(source)).replace(/[-_]+/g, " ").trim();
			return {
				markdown: `# ${title}\n\n${transcript || "(transcription produced no text)"}`,
				metadata: { title, kind: "audio", origin: source },
			};
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	},
};

/**
 * Whisper's .txt output is one line per speech segment. Join them back into
 * flowing prose so QMD chunks on sentences rather than on transcript segments.
 */
export function joinSegments(txt: string): string {
	return txt
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}
