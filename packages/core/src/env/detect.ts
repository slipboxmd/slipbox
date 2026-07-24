import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface ToolInfo {
	name: string;
	present: boolean;
	version?: string;
	/** What this tool unlocks in the slipbox pipeline. */
	unlocks: string;
	required: boolean;
	installHint: string;
}

interface ToolSpec {
	name: string;
	versionArgs: string[];
	unlocks: string;
	required: boolean;
	installHint: string;
}

const TOOLS: ToolSpec[] = [
	{
		name: "qmd",
		versionArgs: ["--version"],
		unlocks: "indexing, embedding, and search (required for the whole pipeline)",
		required: true,
		installHint: "npm i -g @tobilu/qmd   (macOS also: brew install sqlite)",
	},
	{
		name: "pdftotext",
		versionArgs: ["-v"],
		unlocks: "PDF → text extraction",
		required: false,
		installHint: "brew install poppler  (macOS)  |  apt-get install poppler-utils  (Linux)",
	},
	{
		name: "pandoc",
		versionArgs: ["--version"],
		unlocks: "epub / docx / html → markdown extraction",
		required: false,
		installHint: "brew install pandoc  |  https://pandoc.org/installing.html",
	},
	{
		name: "trafilatura",
		versionArgs: ["--version"],
		unlocks: "web article → markdown extraction (URL sources)",
		required: false,
		installHint: "pipx install trafilatura  |  pip3 install trafilatura",
	},
	{
		name: "yt-dlp",
		versionArgs: ["--version"],
		unlocks: "YouTube subtitles / audio download",
		required: false,
		installHint: "brew install yt-dlp  |  pipx install yt-dlp",
	},
	{
		name: "ffmpeg",
		versionArgs: ["-version"],
		unlocks: "audio extraction / conversion for transcription",
		required: false,
		installHint: "brew install ffmpeg",
	},
	{
		name: "whisper",
		versionArgs: ["--help"],
		unlocks: "audio / podcast → transcript",
		required: false,
		installHint: "pipx install openai-whisper  |  or use whisper.cpp",
	},
];

async function detectOne(spec: ToolSpec): Promise<ToolInfo> {
	try {
		const { stdout, stderr } = await execFileP(spec.name, spec.versionArgs, { timeout: 5000 });
		const out = (stdout || stderr || "").trim();
		const version = out.split(/\r?\n/)[0]?.slice(0, 80);
		return { name: spec.name, present: true, version, unlocks: spec.unlocks, required: spec.required, installHint: spec.installHint };
	} catch {
		return { name: spec.name, present: false, unlocks: spec.unlocks, required: spec.required, installHint: spec.installHint };
	}
}

/** Probe every known external tool the slipbox may use. */
export async function detectTools(): Promise<ToolInfo[]> {
	return Promise.all(TOOLS.map(detectOne));
}

/** Probe a single tool by name (returns null for unknown names). */
export async function detectTool(name: string): Promise<ToolInfo | null> {
	const spec = TOOLS.find((t) => t.name === name);
	return spec ? detectOne(spec) : null;
}
