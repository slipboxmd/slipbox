#!/usr/bin/env node
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
	console.log(`slipbox ${pkg.version}`);
	process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
	console.log(
		[
			"slipbox — a Zettelkasten harness for Pi",
			"",
			"Usage:",
			"  slipbox            Open the harness in the current folder",
			"",
			"Inside the harness:",
			"  /init              Scaffold this folder into a slipbox",
			'  ingest <file>      Bring a source in and cluster its ideas',
			"  /login             Authenticate (reuses your Pi login if present)",
			"",
			"Requires QMD (npm i -g @tobilu/qmd; qmd pull) and a Pi login.",
		].join("\n"),
	);
	process.exit(0);
}

// Defer the heavy Pi SDK import until we actually launch.
const { launch } = await import("./launch.js");
launch().catch((err: unknown) => {
	const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
	console.error(`slipbox: ${msg}`);
	process.exit(1);
});
