/**
 * @slipbox/readwise — Pi extension entry point.
 *
 * Adds Readwise as a slipbox source: the agent fetches highlights with the
 * `readwise` CLI directly, then these tools turn them into a source capture and
 * incrementally into literature notes. Load alongside @slipbox/core.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerReadwiseTools } from "./tools.js";

export default function readwise(pi: ExtensionAPI): void {
	registerReadwiseTools(pi);
}
