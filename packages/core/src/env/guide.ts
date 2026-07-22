import type { ToolInfo } from "./detect.js";

/** Render a human-readable readiness report for a set of detected tools. */
export function renderReadiness(tools: ToolInfo[]): string {
	const lines: string[] = ["# Slipbox environment", ""];
	for (const t of tools) {
		const mark = t.present ? "✓" : t.required ? "✗" : "○";
		const status = t.present ? t.version ?? "installed" : t.required ? "MISSING (required)" : "not installed";
		lines.push(`${mark} ${t.name} — ${status}`);
		lines.push(`    unlocks: ${t.unlocks}`);
		if (!t.present) lines.push(`    install: ${t.installHint}`);
	}
	const missingRequired = tools.filter((t) => t.required && !t.present);
	lines.push("");
	if (missingRequired.length > 0) {
		lines.push(`Required tools missing: ${missingRequired.map((t) => t.name).join(", ")}. Install them before ingesting.`);
	} else {
		lines.push("All required tools are present. Optional tools expand which source formats you can ingest.");
	}
	return lines.join("\n");
}
