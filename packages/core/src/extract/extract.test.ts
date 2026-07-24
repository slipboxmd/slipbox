import { describe, expect, it } from "vitest";
import { parseFeed } from "./rss.js";
import { isUrl, isYouTube, looksLikeFeed, ytDate } from "./url.js";
import { vttToText } from "./youtube.js";

describe("url helpers", () => {
	it("detects URLs vs file paths", () => {
		expect(isUrl("https://example.com/a")).toBe(true);
		expect(isUrl("http://example.com")).toBe(true);
		expect(isUrl("  https://example.com  ")).toBe(true);
		expect(isUrl("confessions.txt")).toBe(false);
		expect(isUrl("/tmp/paper.pdf")).toBe(false);
	});

	it("recognizes YouTube URLs (watch, youtu.be, shorts)", () => {
		expect(isYouTube("https://www.youtube.com/watch?v=aircAruvnKk")).toBe(true);
		expect(isYouTube("https://youtu.be/aircAruvnKk")).toBe(true);
		expect(isYouTube("https://www.youtube.com/shorts/abc")).toBe(true);
		expect(isYouTube("https://example.com/watch")).toBe(false);
	});

	it("recognizes feed-ish URLs", () => {
		expect(looksLikeFeed("https://simonwillison.net/atom/everything/")).toBe(true);
		expect(looksLikeFeed("https://example.com/feed/")).toBe(true);
		expect(looksLikeFeed("https://example.com/index.rss")).toBe(true);
		expect(looksLikeFeed("https://example.com/posts/hello")).toBe(false);
	});

	it("formats yt upload_date", () => {
		expect(ytDate("20171005")).toBe("2017-10-05");
		expect(ytDate("")).toBeUndefined();
		expect(ytDate(undefined)).toBeUndefined();
	});
});

describe("parseFeed", () => {
	it("parses RSS 2.0 items", () => {
		const xml = `<?xml version="1.0"?><rss><channel><title>My Blog</title>
			<item><title>First post</title><link>https://ex.com/1</link><pubDate>Fri, 24 Jul 2026 01:22:13 +0000</pubDate></item>
			<item><title><![CDATA[Second & last]]></title><link>https://ex.com/2</link></item>
		</channel></rss>`;
		const feed = parseFeed(xml);
		expect(feed.title).toBe("My Blog");
		expect(feed.items).toHaveLength(2);
		expect(feed.items[0]).toMatchObject({ title: "First post", link: "https://ex.com/1" });
		expect(feed.items[1]!.title).toBe("Second & last");
	});

	it("parses Atom entries with href links", () => {
		const xml = `<feed><title>Atom Feed</title>
			<entry><title>Entry one</title><link href="https://ex.com/a" rel="alternate"/><published>2026-07-23T22:53:08+00:00</published></entry>
		</feed>`;
		const feed = parseFeed(xml);
		expect(feed.title).toBe("Atom Feed");
		expect(feed.items[0]).toMatchObject({ title: "Entry one", link: "https://ex.com/a" });
		expect(feed.items[0]!.date).toBe("2026-07-23T22:53:08+00:00");
	});
});

describe("vttToText", () => {
	it("strips cues/timestamps/tags and collapses rolling-caption repeats", () => {
		const vtt = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
Hello there

00:00:02.000 --> 00:00:04.000
Hello there
this is a test

00:00:04.000 --> 00:00:06.000
<c>this is a test</c>`;
		expect(vttToText(vtt)).toBe("Hello there this is a test");
	});
});
