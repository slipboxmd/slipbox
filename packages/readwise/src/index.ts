/**
 * @slipbox/readwise — library entry.
 *
 * Default export is the Pi extension factory; the rest is exposed for reuse/testing.
 */
export { default } from "./extension.js";
export { parseSource, normalizeHighlight } from "./parse.js";
export { buildCapture, writeCapture, parseHighlightIds, findExistingCapture } from "./capture.js";
export { syncSource, readSourceNotes } from "./sync.js";
export { reconcile, mapChunksToHighlights } from "./reconcile.js";
export type { Highlight, ReadwiseSource, SourceSummary } from "./types.js";
export type { ReconcilePlan, ClusterPlan, ExistingNote } from "./reconcile.js";
export type { SyncResult } from "./sync.js";
