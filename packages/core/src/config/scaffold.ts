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

- One idea per literature note. The **title** is a single short sentence that
  states the idea — what it is or what it means.
- The **body explains that idea**, summarizing ALL the passages in its cluster:
  explore what the author is saying and what it means, in your own words, and
  **quote the author's own words** where they capture it best (weave quotes into
  the prose — not a bare list). Be explanatory and self-contained: a reader should
  grasp the idea, and how the author argues it, without opening the source.
- **Let length follow the material.** A cluster drawn from many passages, or one
  spanning several facets of an idea, deserves a fuller note (several paragraphs);
  a slim cluster a shorter one. Don't inflate or compress to hit a size.
- **Write like a person, not an AI.** Plain, direct prose. Avoid the tells: no
  "isn't just X, it's Y", no tidy rule-of-three lists, use em-dashes sparingly, no
  "In conclusion / Overall / It's worth noting" filler, and no abstractions that
  stand in for the author's concrete claims. Vary sentence length; prefer
  specifics and the author's own words over smooth summary.
- One idea per note — if a cluster really holds two ideas, make two notes.
- Tag with lowercase, hyphenated topics.
- Link each note back to its source reference. (Links between notes are added
  after all the notes exist.)
`;

const GITIGNORE_BLOCK = `# QMD's derived index (rebuildable cache; the markdown is the source of truth)
.qmd/index.sqlite
.qmd/*.sqlite-*

# Derived cleaned-text the harness generates for indexing (rebuildable from sources/)
extracted/
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

	const dirKeys = ["references", "reference_notes", "literature_notes", "permanent_notes", "maps", "sources", "extracted"] as const;
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
