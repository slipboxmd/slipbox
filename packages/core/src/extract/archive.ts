/**
 * Wayback Machine archiving for URL sources.
 *
 * A web source can change or vanish after you take notes from it, so on ingest we
 * pin a snapshot: the reference records both the live `origin` URL and an
 * `archived` Wayback URL for the page as it was when you read it.
 *
 * Two calls, both best-effort and non-fatal (offline / rate-limited / blocked all
 * degrade to "no archive link" rather than failing the ingest):
 *  1. Save Page Now — asks Wayback to capture the page *now*. Fire-and-forget:
 *     SPN routinely takes minutes, far too long to block ingestion on.
 *  2. Availability API — fast lookup of the closest existing snapshot, which is
 *     what we actually record.
 *
 * Consequence worth knowing: on a page Wayback has never seen, the first ingest
 * records nothing (the SPN we just fired hasn't finished); re-ingesting later
 * picks up that snapshot.
 */
const AVAILABILITY_API = "https://archive.org/wayback/available";
const SAVE_ENDPOINT = "https://web.archive.org/save/";
const UA = "slipbox (https://slipbox.md)";

const LOOKUP_TIMEOUT = 10_000;
/** SPN is fire-and-forget; this only bounds how long the request lingers. */
const SAVE_TIMEOUT = 20_000;

export interface ArchiveInfo {
	/** Permanent Wayback snapshot URL. */
	url: string;
	/** Snapshot date (YYYY-MM-DD). */
	date: string;
}

/** `20260724151219` → `2026-07-24`. */
export function waybackDate(ts: string): string | undefined {
	return /^\d{14}$/.test(ts) ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}` : undefined;
}

/** Ask the Wayback Machine to capture this URL now. Fire-and-forget by design. */
function requestSnapshot(url: string): void {
	fetch(SAVE_ENDPOINT + url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(SAVE_TIMEOUT) }).catch(() => {
		/* best-effort: SPN is slow and rate-limited; we never block or fail on it */
	});
}

/** Look up the closest existing snapshot for a URL. */
export async function closestSnapshot(url: string): Promise<ArchiveInfo | undefined> {
	const res = await fetch(`${AVAILABILITY_API}?url=${encodeURIComponent(url)}`, {
		headers: { "user-agent": UA },
		signal: AbortSignal.timeout(LOOKUP_TIMEOUT),
	});
	if (!res.ok) return undefined;
	const data = (await res.json()) as {
		archived_snapshots?: { closest?: { available?: boolean; url?: string; timestamp?: string } };
	};
	const snap = data.archived_snapshots?.closest;
	if (!snap?.available || !snap.url) return undefined;
	const date = waybackDate(snap.timestamp ?? "");
	// Wayback hands back http:// links; https is the same snapshot and safer to store.
	return { url: snap.url.replace(/^http:\/\//, "https://"), date: date ?? "" };
}

/**
 * Pin a Wayback snapshot for a URL: trigger a fresh capture, then return the
 * closest snapshot we can link to. Never throws — returns undefined if archiving
 * isn't possible right now.
 */
export async function archiveUrl(url: string): Promise<ArchiveInfo | undefined> {
	try {
		requestSnapshot(url);
		return await closestSnapshot(url);
	} catch {
		return undefined;
	}
}
