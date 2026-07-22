/** Turn arbitrary text into a lowercase, hyphenated slug suitable for filenames. */
export function slugify(text: string, maxLength = 60): string {
	const slug = text
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "") // strip accents
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return (slug || "note").slice(0, maxLength).replace(/-+$/g, "");
}
