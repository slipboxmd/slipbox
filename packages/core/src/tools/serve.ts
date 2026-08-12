import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config/slipbox-config.js";
import { say } from "./result.js";

/** The running explorer, if this session started one. */
let running: { url: string; stop(): void } | undefined;

/**
 * The explorer ships in `@slipbox/web`, which pulls in Next. Core shouldn't
 * depend on that directly — a slipbox used purely as a Pi extension has no reason
 * to install it. So we import it on demand and explain the fix if it's absent.
 */
async function loadWeb(): Promise<typeof import("@slipbox/web") | null> {
	try {
		return (await import("@slipbox/web")) as typeof import("@slipbox/web");
	} catch {
		return null;
	}
}

export function registerServe(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_serve",
		label: "Open the slipbox explorer",
		description:
			"Start the local explorer — a readable site for this slipbox at localhost — and return its URL. It live-reloads, " +
			"so notes appear in the open page as they're written; offer this when the user wants to read, browse, or watch the " +
			"slipbox grow. Safe to call twice: it returns the existing URL if already running.",
		promptSnippet: "Open a local site to read and browse this slipbox.",
		parameters: Type.Object({
			port: Type.Optional(Type.Number({ description: "Port to listen on (default 3000)" })),
		}),
		async execute(_id: string, params: { port?: number }, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
			if (running) return say(`The explorer is already running at ${running.url}.`, { url: running.url, alreadyRunning: true });

			const web = await loadWeb();
			if (!web) {
				return say(
					"The explorer package isn't installed.\n" +
						"  Install it with:  npm i -g @slipbox/web\n" +
						"Then run `slipbox serve` in this folder, or call this tool again.",
					{ error: "web-missing" },
				);
			}

			const config = loadConfig(ctx.cwd);
			try {
				const handle = await web.serve({ slipboxRoot: config.root, port: params.port ?? 3000 });
				running = { url: handle.url, stop: handle.stop };
				handle.onExit(() => {
					running = undefined;
				});
				return say(
					`Explorer running at ${handle.url} — it live-reloads, so new notes appear as they're written.`,
					{ url: handle.url, root: config.root },
				);
			} catch (err) {
				return say(`Couldn't start the explorer: ${(err as Error).message}`, { error: "serve-failed" });
			}
		},
	});
}
