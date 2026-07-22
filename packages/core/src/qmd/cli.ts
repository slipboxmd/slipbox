import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export interface QmdResult {
	docid: string;
	score: number;
	file: string;
	line?: number;
	title?: string;
	snippet?: string;
}

/** Absolute path to the project-local QMD sqlite index for a slipbox root. */
export function qmdDbPath(root: string): string {
	return join(root, ".qmd", "index.sqlite");
}

async function qmd(root: string, args: string[], timeout = 120_000): Promise<string> {
	// qmd resolves its project-local index from `process.env.PWD`, which execFile
	// does NOT update when you set `cwd`. Set both so `.qmd/` lands in `root`.
	const { stdout } = await execFileP("qmd", args, {
		cwd: root,
		env: { ...process.env, PWD: root },
		timeout,
		maxBuffer: 32 * 1024 * 1024,
	});
	return stdout;
}

/** Ensure a project-local index + collection exist for this slipbox. Idempotent. */
export async function ensureIndex(root: string, collection: string): Promise<void> {
	if (!existsSync(join(root, ".qmd", "index.sqlite"))) {
		await qmd(root, ["init"]);
	}
	// `collection add` errors if it already exists — that's fine, treat as idempotent.
	try {
		await qmd(root, ["collection", "add", ".", "--name", collection]);
	} catch {
		/* already registered */
	}
}

/** Re-scan the filesystem into the FTS index. */
export async function update(root: string): Promise<void> {
	await qmd(root, ["update"]);
}

/** Generate embeddings for anything that needs them. */
export async function embed(root: string): Promise<void> {
	await qmd(root, ["embed"], 600_000);
}

export type SearchMode = "query" | "vsearch" | "search";

/** Search the slipbox. `query` = hybrid+rerank, `vsearch` = vector, `search` = BM25. */
export async function search(
	root: string,
	query: string,
	mode: SearchMode = "query",
	opts: { collection?: string; limit?: number } = {},
): Promise<QmdResult[]> {
	const args = [mode, query, "--json"];
	if (opts.collection) args.push("-c", opts.collection);
	if (opts.limit) args.push("-n", String(opts.limit));
	const out = await qmd(root, args);
	try {
		return JSON.parse(out) as QmdResult[];
	} catch {
		return [];
	}
}

/** Whether the `qmd` binary is callable. */
export async function isAvailable(): Promise<boolean> {
	try {
		await execFileP("qmd", ["--version"], { timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}
