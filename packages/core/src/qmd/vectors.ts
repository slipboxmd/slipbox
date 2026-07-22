import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface Chunk {
	/** `<contentHash>_<seq>` — unique per chunk. */
	id: string;
	/** Document path relative to the QMD collection root. */
	path: string;
	title: string;
	seq: number;
	pos: number;
	totalChunks: number;
	/** Approximate (pos-sliced) chunk text. */
	text: string;
	/** Raw 768-d embedding (NOT unit-normalized). */
	vector: number[];
}

const READER = fileURLToPath(new URL("./vectors.mjs", import.meta.url));

/**
 * Read chunk vectors + reconstructed text from a QMD sqlite index. Runs a
 * subprocess with `--experimental-sqlite` so we depend only on `sqlite-vec`
 * (no native compile). `pathFilter` narrows to documents whose path matches.
 */
export async function readChunks(dbPath: string, pathFilter?: string): Promise<Chunk[]> {
	const args = ["--experimental-sqlite", READER, dbPath];
	if (pathFilter) args.push(pathFilter);
	const { stdout } = await execFileP(process.execPath, args, {
		timeout: 60_000,
		maxBuffer: 256 * 1024 * 1024,
	});
	return JSON.parse(stdout) as Chunk[];
}
