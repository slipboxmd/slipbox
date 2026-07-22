/**
 * @slipbox/core — library entry.
 *
 * Exposes the Pi extension factory (default export) and the path to the bundled
 * skill, so a host CLI (e.g. the `slipbox` binary) can load them programmatically
 * via the Pi SDK. Loading as a plain Pi package instead uses the `pi` field in
 * package.json (which points at src/extension.ts + skills/).
 */
import { fileURLToPath } from "node:url";

export { default } from "./extension.js";
export { scaffoldSlipbox } from "./config/scaffold.js";
export { loadConfig, findSlipboxRoot } from "./config/slipbox-config.js";
export type { SlipboxConfig } from "./config/types.js";

/** Absolute path to the bundled skills directory (contains slipbox/SKILL.md). */
export const skillsDir = fileURLToPath(new URL("../skills", import.meta.url));
