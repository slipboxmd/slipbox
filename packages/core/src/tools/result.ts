/** A tool result / progress update. `details` is always present (Pi requires it on updates). */
export interface ToolUpdate {
	content: { type: "text"; text: string }[];
	details: Record<string, unknown>;
}

/** Build a text tool result/update with an optional structured `details` payload. */
export function say(text: string, details: Record<string, unknown> = {}): ToolUpdate {
	return { content: [{ type: "text", text }], details };
}

export type OnUpdate = ((u: ToolUpdate) => void) | undefined;
