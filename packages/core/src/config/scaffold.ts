import { existsSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_PATHS } from "./types.js";
import { SLIPBOX_FILE } from "./slipbox-config.js";

export interface ScaffoldResult {
	root: string;
	created: boolean;
	/** True if a `.slipbox` already existed (nothing overwritten). */
	existed: boolean;
	createdDirs: string[];
	wroteGitignore: boolean;
}

const SLIPBOX_TEMPLATE = `---
qmd:
  collection: slipbox
  search_mode: query

clustering:
  method: average-linkage
  # Average-linkage cosine cutoff (0..1): merge clusters while their average
  # similarity is >= this. Higher = more, tighter clusters; lower = fewer,
  # broader. ~0.64 suits embeddinggemma book prose.
  threshold: 0.64
  min_cluster_size: 1

notes:
  id_style: timestamp
  link_style: wikilink
  frontmatter: yaml
---

# House style

Instructions the agent should follow when writing notes for THIS slipbox.

- One idea per literature note — but **develop it**. Write a substantial
  paragraph (or two): state the idea in your own words, unfold the reasoning or
  evidence behind it, and note why it matters or what it connects to. A good note
  stands on its own and is genuinely useful months later without reopening the
  source.
- Don't shrink a rich passage to a single sentence, and don't merge unrelated
  ideas to pad length. Depth on ONE idea; if it's really two ideas, make two notes.
- Restate in your own words — never a quote dump.
- Title each note as a full sentence that states the idea.
- Tag with lowercase, hyphenated topics.
- Always link a note back to its source reference, and to related notes.
`;

const GITIGNORE_BLOCK = `# QMD's derived index (rebuildable cache; the markdown is the source of truth)
.qmd/index.sqlite
.qmd/*.sqlite-*
`;

/**
 * Turn `root` into a slipbox: create `.slipbox` and the note-type folders.
 * Idempotent — if `.slipbox` already exists, nothing is overwritten.
 */
export async function scaffoldSlipbox(root: string): Promise<ScaffoldResult> {
	const slipboxPath = join(root, SLIPBOX_FILE);
	if (existsSync(slipboxPath)) {
		return { root, created: false, existed: true, createdDirs: [], wroteGitignore: false };
	}

	await writeFile(slipboxPath, SLIPBOX_TEMPLATE, "utf8");

	const dirKeys = ["references", "reference_notes", "literature_notes", "permanent_notes", "maps", "sources"] as const;
	const createdDirs: string[] = [];
	for (const key of dirKeys) {
		const rel = DEFAULT_PATHS[key];
		await mkdir(join(root, rel), { recursive: true });
		await writeFile(join(root, rel, ".gitkeep"), "", "utf8");
		createdDirs.push(rel);
	}

	let wroteGitignore = false;
	const gitignorePath = join(root, ".gitignore");
	if (existsSync(gitignorePath)) {
		await appendFile(gitignorePath, `\n${GITIGNORE_BLOCK}`, "utf8");
		wroteGitignore = true;
	} else {
		await writeFile(gitignorePath, GITIGNORE_BLOCK, "utf8");
		wroteGitignore = true;
	}

	return { root, created: true, existed: false, createdDirs, wroteGitignore };
}
