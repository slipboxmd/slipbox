/**
 * Run mode for the ingestion pipeline.
 *
 * Default is **review mode**: the agent works through the pipeline a step at a
 * time and checks in with the human at the seams (after clustering, before
 * writing a batch of notes). **Yolo mode** runs the whole thing straight through
 * — cluster → every literature note → autolink → reference note — without
 * pausing. Set per-session with `slipbox --yolo`, or per-call with the
 * `slipbox_ingest` tool's `yolo` parameter.
 */
const ENV_VAR = "SLIPBOX_YOLO";

/** Whether the session was launched in one-shot mode (`slipbox --yolo`). */
export function yoloDefault(): boolean {
	const v = process.env[ENV_VAR];
	return v === "1" || v === "true" || v === "yes";
}

/** Set the session-wide default (used by the CLI's `--yolo` flag). */
export function setYoloDefault(on: boolean): void {
	if (on) process.env[ENV_VAR] = "1";
	else delete process.env[ENV_VAR];
}
