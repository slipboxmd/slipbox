/**
 * @slipbox/core — library entry.
 *
 * Exposes the Pi extension factory (default export), the bundled skill path, and
 * the pipeline primitives that other packages (e.g. @slipbox/readwise) compose to
 * add new source types on top of the same ingest → cluster → note machinery.
 */
import { fileURLToPath } from "node:url";

export { default } from "./extension.js";

// Config
export { scaffoldSlipbox } from "./config/scaffold.js";
export { loadConfig, findSlipboxRoot, dirFor } from "./config/slipbox-config.js";
export type { SlipboxConfig } from "./config/types.js";

// Pipeline
export { ingestSource } from "./pipeline/ingest.js";
export type { IngestResult, IngestCluster } from "./pipeline/ingest.js";
export { cluster } from "./pipeline/cluster.js";
export { autolink } from "./pipeline/link.js";
export type { AutolinkOptions, AutolinkResult } from "./pipeline/link.js";

// Notes
export { writeReference, writeLiterature, updateReference, writeExtracted, writeSourceCapture } from "./notes/write.js";
export type { NoteRef, LiteratureNoteInput } from "./notes/write.js";
export { makeId } from "./notes/ids.js";

// QMD + vectors
export { ensureIndex, update as qmdUpdate, embed as qmdEmbed, qmdDbPath, isAvailable as qmdAvailable } from "./qmd/cli.js";
export { readChunks } from "./qmd/vectors.js";
export type { Chunk } from "./qmd/vectors.js";

// Utilities
export { parseFrontmatter, stringifyFrontmatter } from "./util/frontmatter.js";
export { slugify } from "./util/slug.js";

/** Absolute path to the bundled skills directory (contains slipbox/SKILL.md). */
export const skillsDir = fileURLToPath(new URL("../skills", import.meta.url));
