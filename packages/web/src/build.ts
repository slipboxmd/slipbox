import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { ensureWorkdir, runNextToCompletion } from "./runner.js";

/**
 * `slipbox build` — export the slipbox as a static site.
 *
 * Next writes its export into the working copy; we move it to the user's chosen
 * output directory so `out/` sits in the slipbox where hosts expect it.
 */

export interface BuildOptions {
	slipboxRoot: string;
	/** Output directory, relative to the slipbox root unless absolute. */
	out?: string;
	/**
	 * Sub-path the site will be served from, e.g. `/my-slipbox` for a GitHub Pages
	 * project site. Without it, every asset 404s on those hosts.
	 */
	basePath?: string;
}

export interface BuildResult {
	outDir: string;
}

export async function build(opts: BuildOptions): Promise<BuildResult> {
	const slipboxRoot = resolve(opts.slipboxRoot);
	const outDir = resolve(slipboxRoot, opts.out ?? "out");
	const work = await ensureWorkdir(slipboxRoot);

	const basePath = normalizeBasePath(opts.basePath);
	const code = await runNextToCompletion("build", { slipboxRoot, basePath }, work);
	if (code !== 0) throw new Error(`Site build failed (exit ${code}).`);

	const exported = join(work, "out");
	if (!existsSync(exported)) throw new Error(`Build finished but produced no output at ${exported}.`);

	if (outDir !== exported) {
		await rm(outDir, { recursive: true, force: true });
		await cp(exported, outDir, { recursive: true });
	}
	return { outDir };
}

/** `repo` / `/repo/` → `/repo`; empty stays undefined. */
export function normalizeBasePath(basePath?: string): string | undefined {
	if (!basePath) return undefined;
	const trimmed = basePath.trim().replace(/\/+$/, "");
	if (!trimmed || trimmed === "/") return undefined;
	return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
