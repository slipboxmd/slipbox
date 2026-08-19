import { describe, expect, it } from "vitest";
import { SLIPBOX_COMMANDS, SLIPBOX_TAGLINE, SLIPBOX_WORDMARK, slipboxFooter } from "./header.js";

describe("SLIPBOX_WORDMARK", () => {
	it("has 6 lines of block characters", () => {
		expect(SLIPBOX_WORDMARK).toHaveLength(6);
		expect(SLIPBOX_WORDMARK.join("\n")).toContain("█");
	});
});

describe("SLIPBOX_TAGLINE", () => {
	it("mentions Zettelkasten", () => {
		expect(SLIPBOX_TAGLINE).toContain("Zettelkasten");
	});
});

describe("SLIPBOX_COMMANDS", () => {
	it("includes the starter commands", () => {
		const names = SLIPBOX_COMMANDS.map((c) => c.cmd);
		expect(names).toContain("/init");
		expect(names).toContain("ingest <file|url>");
		expect(names).toContain("/tutor");
		expect(names).toContain("/help");
	});

	it("gives every command a description", () => {
		for (const { desc } of SLIPBOX_COMMANDS) {
			expect(desc.length).toBeGreaterThan(0);
		}
	});
});

describe("slipboxFooter", () => {
	it("renders the version when given one", () => {
		const footer = slipboxFooter("9.9.9");
		expect(footer).toContain("slipbox v9.9.9");
		expect(footer).toContain("QMD");
	});

	it("omits the version gracefully when undefined", () => {
		const footer = slipboxFooter(undefined);
		expect(footer.length).toBeGreaterThan(0);
		expect(footer).not.toContain("slipbox v");
		expect(footer).toContain("QMD");
	});
});
