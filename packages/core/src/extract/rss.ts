/** Minimal RSS / Atom feed parsing (no external deps). First-pass, regex-based. */
export interface FeedItem {
	title: string;
	link?: string;
	date?: string;
}

export interface ParsedFeed {
	title: string;
	items: FeedItem[];
}

function decode(s: string): string {
	return s
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function tag(block: string, name: string): string | undefined {
	const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
	return m ? decode(m[1]!) : undefined;
}

export function parseFeed(xml: string): ParsedFeed {
	const head = xml.split(/<item[\s>]|<entry[\s>]/i)[0] ?? "";
	const feedTitle = tag(head, "title") || "feed";
	const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
	const items: FeedItem[] = blocks.map((b) => {
		const title = tag(b, "title") || "(untitled)";
		let link = tag(b, "link");
		if (!link || /^https?:\/\//i.test(link) === false) {
			const href = b.match(/<link[^>]*\bhref="([^"]+)"/i); // Atom
			if (href) link = href[1];
		}
		const date = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated");
		return { title, link, date };
	});
	return { title: feedTitle, items };
}

/** Fetch + parse a feed URL. Uses global fetch (Node ≥ 22). */
export async function fetchFeed(url: string): Promise<ParsedFeed> {
	const res = await fetch(url, { headers: { "user-agent": "slipbox-feed-fetch (slipbox.md)" }, redirect: "follow" });
	if (!res.ok) throw new Error(`Feed fetch failed (${res.status}) for ${url}`);
	return parseFeed(await res.text());
}
