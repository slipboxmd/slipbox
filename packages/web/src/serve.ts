import type { ChildProcess } from "node:child_process";
import { watch, type FSWatcher } from "node:fs";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { readDirs } from "./load.js";
import { ensureWorkdir, runNext } from "./runner.js";

/**
 * `slipbox serve` — a live-reloading local read of the slipbox.
 *
 * Next's dev server watches its own project directory, but the notes live outside
 * it, so edits there wouldn't trigger anything. We watch the note directories
 * ourselves and, on a change, rewrite a tiny token module inside the working copy.
 * Next sees one of its own files change and pushes a refresh — no extra websocket
 * or client code of our own, and the page updates as the agent writes notes.
 */

const RELOAD_MODULE = "app/reload-token.ts";
const DEBOUNCE_MS = 150;

export interface ServeOptions {
	slipboxRoot: string;
	port?: number;
	/** Open a browser once the server is listening. */
	open?: boolean;
}

export interface ServeHandle {
	url: string;
	port: number;
	child: ChildProcess;
	stop(): void;
	/** Called when the server process exits. Avoids consumers touching `child`. */
	onExit(cb: (code: number | null) => void): void;
}

async function writeToken(work: string): Promise<void> {
	const path = join(work, RELOAD_MODULE);
	await writeFile(path, `// regenerated on note changes to trigger a dev refresh\nexport const RELOAD_TOKEN = "${Date.now()}";\n`, "utf8");
}

function watchNotes(slipboxRoot: string, onChange: () => void): FSWatcher[] {
	const dirs = readDirs(slipboxRoot);
	const watchers: FSWatcher[] = [];
	for (const rel of Object.values(dirs)) {
		const dir = resolve(slipboxRoot, rel);
		if (!existsSync(dir)) continue;
		try {
			watchers.push(watch(dir, { persistent: false }, onChange));
		} catch {
			// Watching is a convenience; a failure here shouldn't stop the server.
		}
	}
	return watchers;
}

export async function serve(opts: ServeOptions): Promise<ServeHandle> {
	const slipboxRoot = resolve(opts.slipboxRoot);
	const port = opts.port ?? 3000;
	const work = await ensureWorkdir(slipboxRoot);
	await writeToken(work);

	const child = runNext("dev", { slipboxRoot, port }, work);

	let timer: NodeJS.Timeout | undefined;
	const watchers = watchNotes(slipboxRoot, () => {
		clearTimeout(timer);
		// A single note write touches several files; debounce so we refresh once.
		timer = setTimeout(() => void writeToken(work), DEBOUNCE_MS);
	});

	const stop = () => {
		clearTimeout(timer);
		for (const w of watchers) w.close();
		if (!child.killed) child.kill();
	};
	child.on("exit", stop);

	return {
		url: `http://localhost:${port}`,
		port,
		child,
		stop,
		onExit: (cb) => {
			child.on("exit", (code) => cb(code));
		},
	};
}
