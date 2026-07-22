import { slugify } from "../util/slug.js";

/** Two-digit zero-pad. */
function p2(n: number): string {
	return String(n).padStart(2, "0");
}

/** `YYYYMMDDTHHmm` timestamp for note ids. */
export function timestamp(date = new Date()): string {
	return (
		`${date.getFullYear()}${p2(date.getMonth() + 1)}${p2(date.getDate())}` +
		`T${p2(date.getHours())}${p2(date.getMinutes())}`
	);
}

/**
 * Build a stable note id like `20260722T1043-affect-heuristic`.
 * `id_style: "slug"` drops the timestamp; anything else keeps it.
 */
export function makeId(title: string, idStyle: "timestamp" | "slug" | "uid", date = new Date()): string {
	const slug = slugify(title);
	if (idStyle === "slug") return slug;
	return `${timestamp(date)}-${slug}`;
}
