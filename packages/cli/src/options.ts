/**
 * Parse the flags that shape how the harness launches. Pure and side-effect
 * free so it can be unit-tested without importing bin.ts (which reads argv and
 * dispatches at module load time).
 */
export function resolveLaunchOptions(argv: readonly string[]): { resume: boolean; yolo: boolean } {
	return { resume: argv.includes("--resume"), yolo: argv.includes("--yolo") };
}
