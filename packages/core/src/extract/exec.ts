import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

/** Thrown when an external extraction tool isn't installed — carries install guidance. */
export class MissingToolError extends Error {
	constructor(
		readonly tool: string,
		readonly install: string,
		readonly unlocks: string,
	) {
		super(`"${tool}" is required to ${unlocks} but isn't installed.\n  Install it with:  ${install}`);
		this.name = "MissingToolError";
	}
}

function isNotFound(err: unknown): boolean {
	return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}

export interface RunOptions {
	args: string[];
	/** install command shown if the tool is missing */
	install: string;
	/** what the tool unlocks, for the error message */
	unlocks: string;
	timeout?: number;
	maxBuffer?: number;
	/** treat output as binary-safe (return Buffer) — default returns utf8 string */
	cwd?: string;
}

/** Run an external CLI, turning "command not found" into a MissingToolError with guidance. */
export async function runTool(tool: string, opts: RunOptions): Promise<string> {
	try {
		const { stdout } = await execFileP(tool, opts.args, {
			timeout: opts.timeout ?? 180_000,
			maxBuffer: opts.maxBuffer ?? 256 * 1024 * 1024,
			cwd: opts.cwd,
		});
		return stdout;
	} catch (err) {
		if (isNotFound(err)) throw new MissingToolError(tool, opts.install, opts.unlocks);
		throw err;
	}
}
