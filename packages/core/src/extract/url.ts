/** URL-type detection shared by the URL-based extractors. */
export function isUrl(s: string): boolean {
	return /^https?:\/\//i.test(s.trim());
}

export function isYouTube(s: string): boolean {
	return /(?:youtube\.com\/(?:watch|shorts|embed|live|v)|youtu\.be\/)/i.test(s);
}

/** Heuristic: does this URL look like an RSS/Atom feed (vs a single page)? */
export function looksLikeFeed(s: string): boolean {
	return /(?:\/feed\b|\/rss\b|\/atom\b|\.rss\b|\.atom\b|[?&]feed=|feeds\.)/i.test(s) || /\.xml(?:$|\?)/i.test(s);
}

/** yt-dlp upload_date (YYYYMMDD) → ISO date. */
export function ytDate(d?: string): string | undefined {
	return d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : undefined;
}
