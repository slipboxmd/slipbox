import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs the explorer's Next app against a user's slipbox.
 *
 * The app ships inside this package, but the content lives in the user's slipbox
 * and build output has to land there too — and writing into `node_modules` breaks
 * on global installs and collides when two slipboxes build at once. So we
 * materialize a working copy into `<slipbox>/.slipbox-site/` (gitignored) and
 * symlink its `node_modules` back to this package's real dependencies.
 */

const here = dirname(fileURLToPath(import.meta.url));
/** packages/web root — `dist/` in a published install, `src/` in the repo. */
export const packageRoot = resolve(here, "..");
export const siteTemplate = join(packageRoot, "site");

export const WORKDIR = ".slipbox-site";

/** Where this package's dependencies actually live (next, react, …). */
function packageNodeModules(): string {
	// Walk up from the package looking for the node_modules that contains `next`.
	let dir = packageRoot;
	for (let i = 0; i < 6; i++) {
		const own = join(dir, "node_modules");
		if (existsSync(join(own, "next"))) return own;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(
		"Couldn't locate the explorer's dependencies (next). Reinstall slipbox, or run `pnpm install` if you're working in the repo.",
	);
}

async function packageVersion(): Promise<string> {
	try {
		const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as { version?: string };
		return pkg.version ?? "0.0.0";
	} catch {
		return "0.0.0";
	}
}

/**
 * Newest mtime across the app template and compiled data layer. Folded into the
 * stamp so the working copy refreshes whenever the source changes — a published
 * version bump does it for users, and every edit does it while developing here.
 */
function newestMtime(dir: string): number {
	let newest = 0;
	const walk = (d: string) => {
		let entries: import("node:fs").Dirent[];
		try {
			entries = readdirSync(d, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			if (e.name === "node_modules" || e.name === ".next") continue;
			const full = join(d, e.name);
			if (e.isDirectory()) walk(full);
			else {
				try {
					newest = Math.max(newest, statSync(full).mtimeMs);
				} catch {
					/* vanished mid-walk */
				}
			}
		}
	};
	walk(dir);
	return Math.round(newest);
}

/**
 * Ensure `<slipbox>/.slipbox-site/` holds a current copy of the app with its
 * dependencies linked. Refreshes when the package version changes so upgrades
 * take effect. Returns the working directory Next should run in.
 */
export async function ensureWorkdir(slipboxRoot: string): Promise<string> {
	const work = join(slipboxRoot, WORKDIR);
	const stampPath = join(work, ".slipbox-stamp");
	const version = await packageVersion();
	const fresh = Math.max(newestMtime(siteTemplate), newestMtime(join(packageRoot, "dist")));
	const stamp = `${version}:${siteTemplate}:${fresh}`;

	const current = existsSync(stampPath) ? (await readFile(stampPath, "utf8")).trim() : "";
	if (current !== stamp) {
		// Keep .next/ across refreshes — it's just a cache and rebuilding is slow.
		for (const entry of ["app", "components", "lib", "next.config.mjs", "package.json", "tsconfig.json"]) {
			await rm(join(work, entry), { recursive: true, force: true });
		}
		await mkdir(work, { recursive: true });
		await cp(siteTemplate, work, { recursive: true });
		// The app imports the data layer as `lib/` — the package's own compiled
		// output. Copying it (rather than resolving `@slipbox/web`) keeps the
		// working copy self-contained, since it lives outside node_modules.
		await cp(join(packageRoot, "dist"), join(work, "lib"), { recursive: true });
		await writeFile(stampPath, stamp, "utf8");
	}

	// Link dependencies. A symlink (not a copy) keeps this cheap and always current.
	const link = join(work, "node_modules");
	if (!existsSync(link)) {
		// `junction` is a no-op on POSIX and avoids needing admin rights on Windows.
		await symlink(packageNodeModules(), link, "junction");
	}

	// The working copy is derived; never let it into the user's git history.
	const ignore = join(work, ".gitignore");
	if (!existsSync(ignore)) await writeFile(ignore, "*\n", "utf8");

	return work;
}

export interface RunOptions {
	slipboxRoot: string;
	port?: number;
	basePath?: string;
	/** Extra env for the Next process. */
	env?: Record<string, string>;
}

function nextBin(): string {
	return join(packageNodeModules(), "next", "dist", "bin", "next");
}

/** Spawn a Next command in the working copy with the slipbox wired in. */
export function runNext(command: "dev" | "build", opts: RunOptions, work: string) {
	const args = [nextBin(), command];
	if (command === "dev" && opts.port) args.push("--port", String(opts.port));

	return spawn(process.execPath, args, {
		cwd: work,
		stdio: "inherit",
		env: {
			...process.env,
			...opts.env,
			SLIPBOX_ROOT: resolve(opts.slipboxRoot),
			...(opts.basePath ? { SLIPBOX_BASE_PATH: opts.basePath } : {}),
			// Next is noisy about telemetry on first run; the explorer shouldn't be.
			NEXT_TELEMETRY_DISABLED: "1",
		},
	});
}

/** Run a Next command to completion, resolving with its exit code. */
export function runNextToCompletion(command: "dev" | "build", opts: RunOptions, work: string): Promise<number> {
	return new Promise((resolveP, reject) => {
		const child = runNext(command, opts, work);
		child.on("error", reject);
		child.on("exit", (code) => resolveP(code ?? 1));
	});
}
