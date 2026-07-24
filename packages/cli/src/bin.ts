#!/usr/bin/env node
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
	console.log(`slipbox ${pkg.version}`);
	process.exit(0);
}

if (args.includes("--help") || args.includes("-h") || args[0] === "help") {
	console.log(
		[
			"slipbox — a Zettelkasten harness for Pi",
			"",
			"Usage:",
			"  slipbox                  Open the harness in the current folder",
			"  slipbox --yolo           One-shot: ingest runs straight through without",
			"                           pausing for review",
			"",
			"  slipbox serve            Read the slipbox at http://localhost:3000",
			"                           (live-reloads as notes are written)",
			"    --port <n>             Port to listen on (default 3000)",
			"",
			"  slipbox build            Export the slipbox as a static site",
			"    --out <dir>            Output directory (default ./out)",
			"    --base-path <path>     Serve from a sub-path, e.g. /my-repo",
			"                           (required for GitHub Pages project sites)",
			"",
			"  slipbox site:init        Write deploy config (vercel.json + Pages workflow)",
			"    --repo <name>          GitHub repo name for the Pages base path",
			"                           (defaults to this folder's name)",
			"    --force                Overwrite existing files",
			"",
			"Inside the harness:",
			"  /init                    Scaffold this folder into a slipbox",
			"  ingest <file|url>        Bring a source in and cluster its ideas",
			"  /login                   Authenticate (reuses your Pi login if present)",
			"",
			"Requires QMD (npm i -g @tobilu/qmd; qmd pull) and a Pi login.",
		].join("\n"),
	);
	process.exit(0);
}

/** Read `--flag value` from argv. */
function flag(name: string): string | undefined {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : undefined;
}

function fail(err: unknown): never {
	const msg = err instanceof Error ? err.message : String(err);
	console.error(`\nslipbox: ${msg}\n`);
	process.exit(1);
}

const command = args[0];

if (command === "serve") {
	const { serve } = await import("@slipbox/web");
	const port = Number(flag("port") ?? 3000);
	try {
		const handle = await serve({ slipboxRoot: process.cwd(), port });
		console.log(`\n  slipbox → ${handle.url}\n  watching for note changes; ctrl-c to stop\n`);
		const stop = () => {
			handle.stop();
			process.exit(0);
		};
		process.on("SIGINT", stop);
		process.on("SIGTERM", stop);
	} catch (err) {
		fail(err);
	}
} else if (command === "build") {
	const { build } = await import("@slipbox/web");
	try {
		const { outDir } = await build({ slipboxRoot: process.cwd(), out: flag("out"), basePath: flag("base-path") });
		console.log(`\n  Static site written to ${outDir}\n`);
		process.exit(0);
	} catch (err) {
		fail(err);
	}
} else if (command === "site:init") {
	const { siteInit } = await import("@slipbox/web");
	try {
		const res = await siteInit(process.cwd(), { force: args.includes("--force"), repoName: flag("repo") });
		for (const p of res.written) console.log(`  wrote    ${p}`);
		for (const p of res.skipped) console.log(`  exists   ${p}  (--force to overwrite)`);
		console.log(
			[
				"",
				"  Vercel:  connect this repo — build command and output dir come from vercel.json.",
				"  Pages:   enable Pages with Source: GitHub Actions, then push.",
				"",
			].join("\n"),
		);
		process.exit(0);
	} catch (err) {
		fail(err);
	}
} else if (command && !command.startsWith("-")) {
	console.error(`slipbox: unknown command "${command}". Try \`slipbox --help\`.`);
	process.exit(1);
} else {
	// One-shot mode: the extension reads this when deciding how to pace ingestion.
	if (args.includes("--yolo")) process.env.SLIPBOX_YOLO = "1";

	// Defer the heavy Pi SDK import until we actually launch.
	const { launch } = await import("./launch.js");
	launch().catch((err: unknown) => {
		const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
		console.error(`\nslipbox: ${msg}`);
		console.error(
			"\nIf this happened around login: authenticate with the Pi CLI first —\n" +
				"  run `pi`, use /login, finish auth, then quit and run `slipbox` again.\n" +
				"slipbox reuses your Pi login from ~/.pi/agent.",
		);
		process.exit(1);
	});
}
