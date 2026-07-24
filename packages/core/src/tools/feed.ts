import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { fetchFeed } from "../extract/rss.js";
import { say } from "./result.js";

export function registerFeed(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "slipbox_feed",
		label: "List feed items",
		description:
			"Fetch an RSS/Atom feed (blog, newsletter, or podcast) and list its recent items with title, link, and date. A feed " +
			"is NOT ingested as one source — instead, review the items and ingest the ones worth keeping individually by passing " +
			"each item's link to slipbox_ingest (a web-page link is read as an article; a podcast/audio link would need the audio " +
			"file). Use this to triage a feed, then ingest selectively.",
		promptSnippet: "List the recent items in an RSS/Atom feed to pick which to ingest.",
		parameters: Type.Object({
			url: Type.String({ description: "The feed URL (RSS or Atom), e.g. https://example.com/feed.xml" }),
			limit: Type.Optional(Type.Number({ description: "Max items to list (default 20)" })),
		}),
		async execute(_id: string, params: { url: string; limit?: number }, _signal: unknown, _onUpdate: unknown, _ctx: ExtensionContext) {
			let feed;
			try {
				feed = await fetchFeed(params.url.trim());
			} catch (err) {
				return say(`Couldn't read the feed: ${(err as Error).message}`, { error: "feed-fetch-failed" });
			}
			const limit = params.limit && params.limit > 0 ? params.limit : 20;
			const items = feed.items.slice(0, limit);
			if (items.length === 0) {
				return say(`No items found in the feed at ${params.url}. It may not be a valid RSS/Atom feed.`, { feed: { title: feed.title, items: [] } });
			}
			const lines = items.map((it, i) => {
				const date = it.date ? ` (${it.date})` : "";
				const link = it.link ? `\n      ${it.link}` : "";
				return `  ${i + 1}. ${it.title}${date}${link}`;
			});
			const text = [
				`Feed: ${feed.title} — ${items.length} recent item(s).`,
				"Ingest the worthwhile ones individually by passing each link to slipbox_ingest.",
				"",
				...lines,
			].join("\n");
			return say(text, { feed: { title: feed.title, items } });
		},
	});
}
