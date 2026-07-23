// Standalone chunk reader. Run under `node --experimental-sqlite`.
//
//   node --experimental-sqlite vectors.mjs <index.sqlite> [pathFilter] [--no-vectors]
//
// Emits JSON to stdout: an array of chunks with reconstructed (approximate,
// pos-sliced) text. With vectors (default) each chunk also carries its 768-d
// embedding — used by clustering + autolink. With --no-vectors it returns text
// only (much smaller / faster) — used by read_cluster, which needs passages not
// vectors, and avoids loading the sqlite-vec extension.
//
// Opens the DB read-only with a busy timeout so it never collides with QMD or a
// WAL checkpoint holding a write lock ("database is locked").
import { DatabaseSync } from "node:sqlite";

const [, , dbPath, ...rest] = process.argv;
if (!dbPath) {
	process.stderr.write("usage: vectors.mjs <index.sqlite> [pathFilter] [--no-vectors]\n");
	process.exit(2);
}
const withVectors = !rest.includes("--no-vectors");
const pathFilter = rest.find((a) => !a.startsWith("--"));

const db = new DatabaseSync(dbPath, { readOnly: true, allowExtension: withVectors });
db.exec("PRAGMA busy_timeout = 8000");
if (withVectors) {
	const { getLoadablePath } = await import("sqlite-vec");
	db.loadExtension(getLoadablePath());
}

const vecSelect = withVectors ? ", vec_to_json(v.embedding) AS vec" : "";
const vecJoin = withVectors ? "JOIN vectors_vec v ON (cv.hash || '_' || cv.seq) = v.hash_seq" : "";
const where = pathFilter ? "WHERE d.active = 1 AND d.path LIKE ?" : "WHERE d.active = 1";

const rows = db
	.prepare(
		`SELECT cv.hash          AS hash,
		        cv.seq           AS seq,
		        cv.pos           AS pos,
		        cv.total_chunks  AS totalChunks,
		        d.path           AS path,
		        d.title          AS title,
		        c.doc            AS doc${vecSelect}
		 FROM content_vectors cv
		 JOIN documents d ON d.hash = cv.hash
		 JOIN content c ON c.hash = cv.hash
		 ${vecJoin}
		 ${where}
		 ORDER BY d.path, cv.seq`,
	)
	.all(...(pathFilter ? [`%${pathFilter}%`] : []));

// Group by document to slice per-chunk text via pos offsets.
const byDoc = new Map();
for (const r of rows) {
	if (!byDoc.has(r.path)) byDoc.set(r.path, []);
	byDoc.get(r.path).push(r);
}

const out = [];
for (const [, chunks] of byDoc) {
	chunks.sort((a, b) => a.seq - b.seq);
	for (let i = 0; i < chunks.length; i++) {
		const r = chunks[i];
		const start = r.pos;
		const end = i + 1 < chunks.length ? chunks[i + 1].pos : r.doc.length;
		const text = String(r.doc).slice(start, end).replace(/\s+/g, " ").trim();
		out.push({
			id: `${r.hash}_${r.seq}`,
			path: r.path,
			title: r.title,
			seq: r.seq,
			pos: r.pos,
			totalChunks: r.totalChunks,
			text,
			vector: withVectors ? JSON.parse(r.vec) : [],
		});
	}
}

db.close();
process.stdout.write(JSON.stringify(out));
