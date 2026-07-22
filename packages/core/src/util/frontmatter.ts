import YAML from "yaml";

export interface Frontmatter {
	data: Record<string, unknown>;
	body: string;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Split a markdown file into its YAML frontmatter object and body. */
export function parseFrontmatter(text: string): Frontmatter {
	const match = text.match(FM_RE);
	if (!match) return { data: {}, body: text };
	const data = (YAML.parse(match[1]!) as Record<string, unknown>) ?? {};
	return { data, body: match[2] ?? "" };
}

/** Serialize a frontmatter object + body back into a markdown file. */
export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
	const yaml = YAML.stringify(data).trimEnd();
	const spacer = body.startsWith("\n") ? "" : "\n";
	return `---\n${yaml}\n---\n${spacer}${body.replace(/^\n+/, "")}`.replace(/\s*$/, "\n");
}
