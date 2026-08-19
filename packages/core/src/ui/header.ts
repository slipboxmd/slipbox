/**
 * Branded startup splash for the slipbox harness.
 *
 * The pure content (wordmark, tagline, commands, footer) lives in exported
 * constants/functions so it can be unit-tested without a TUI. The pi-tui usage
 * is confined to `createSlipboxHeader`, the factory handed to
 * `ctx.ui.setHeader(...)`.
 */
import { readFileSync } from "node:fs";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { Container, Spacer, Text } from "@earendil-works/pi-tui";
import type { Component, TUI } from "@earendil-works/pi-tui";

/** The "slipbox" wordmark in the ANSI Shadow block font (6 lines). */
export const SLIPBOX_WORDMARK: readonly string[] = [
	"███████╗██╗     ██╗██████╗ ██████╗  ██████╗ ██╗  ██╗",
	"██╔════╝██║     ██║██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝",
	"███████╗██║     ██║██████╔╝██████╔╝██║   ██║ ╚███╔╝ ",
	"╚════██║██║     ██║██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗ ",
	"███████║███████╗██║██║     ██████╔╝╚██████╔╝██╔╝ ██╗",
	"╚══════╝╚══════╝╚═╝╚═╝     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝",
];

/** One-line description shown under the wordmark. */
export const SLIPBOX_TAGLINE = "Turn any source into a Zettelkasten of flat-markdown notes you own.";

/** Starter commands shown at startup. */
export const SLIPBOX_COMMANDS: ReadonlyArray<{ cmd: string; desc: string }> = [
	{ cmd: "/init", desc: "scaffold this folder into a slipbox" },
	{ cmd: "ingest <file|url>", desc: "bring a source in and cluster its ideas" },
	{ cmd: "/tutor", desc: "learn slipbox by using it" },
	{ cmd: "/help", desc: "all commands" },
];

/**
 * Footer line. Includes the version when known, otherwise omits it entirely
 * (never renders a dangling "slipbox v").
 */
export function slipboxFooter(version?: string): string {
	const base = "Requires QMD + a Pi login.";
	if (!version) return base;
	return `${base}  ·  slipbox v${version}`;
}

/**
 * Read `@slipbox/core`'s own version from its package.json at runtime.
 *
 * The compiled file lives at `dist/ui/header.js`, and package.json is two
 * levels up (`dist/ui/` -> `dist/` -> package root). Returns undefined on any
 * failure rather than throwing.
 */
export function coreVersion(): string | undefined {
	try {
		const url = new URL("../../package.json", import.meta.url);
		const pkg = JSON.parse(readFileSync(url, "utf8")) as { version?: unknown };
		return typeof pkg.version === "string" ? pkg.version : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Build the pi-tui factory for the startup header. All pi-tui usage is confined
 * here so the content layer above stays testable without a TUI host.
 */
export function createSlipboxHeader(): (tui: TUI, theme: Theme) => Component {
	return (_tui: TUI, theme: Theme): Component => {
		const container = new Container();

		container.addChild(new Text(theme.fg("accent", theme.bold(SLIPBOX_WORDMARK.join("\n"))), 1, 0));
		container.addChild(new Spacer(1));
		container.addChild(new Text(theme.fg("text", SLIPBOX_TAGLINE), 1, 0));
		container.addChild(new Spacer(1));

		const pad = Math.max(...SLIPBOX_COMMANDS.map((c) => c.cmd.length));
		for (const { cmd, desc } of SLIPBOX_COMMANDS) {
			const name = theme.fg("accent", cmd.padEnd(pad));
			const gap = theme.fg("muted", "  —  ");
			const text = theme.fg("muted", desc);
			container.addChild(new Text(`${name}${gap}${text}`, 1, 0));
		}

		container.addChild(new Spacer(1));
		container.addChild(new Text(theme.fg("muted", slipboxFooter(coreVersion())), 1, 0));

		return container;
	};
}
