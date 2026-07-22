#!/usr/bin/env node
import { launch } from "./launch.js";

launch().catch((err: unknown) => {
	const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
	console.error(`slipbox: ${msg}`);
	process.exit(1);
});
