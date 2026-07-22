// Standalone chunk-vector reader. Run under `node --experimental-sqlite`.
//
//   node --experimental-sqlite vectors.mjs <index.sqlite> [pathFilter]
//
// Emits JSON to stdout: an array of chunks, each with its 768-d vector and the
// reconstructed (approximate, pos-sliced) source text. Reused by vectors.ts via
// a subprocess so the harness needs no native SQLite build.
import { DatabaseSync } from "node:sqlite";
import { getLoadablePath } from "sqlite-vec";

const [, , dbPath, pathFilter] = process.argv;
if (!dbPath) {
	process.stderr.write("usage: vectors.mjs <index.sqlite> [pathFilter]\n");
	process.exit(2);
}

const db = new DatabaseSync(dbPath, { allowExtension: true });
db.loadExtension(getLoadablePath());

const where = pathFilter ? "WHERE d.active = 1 AND d.path LIKE ?" : "WHERE d.active = 1";
const rows = db
	.prepare(
		`SELECT v.hash_seq       AS hashSeq,
		        cv.hash          AS hash,
		        cv.seq           AS seq,
		        cv.pos           AS pos,
		        cv.total_chunks  AS totalChunks,
		        d.collection     AS collection,
		        d.path           AS path,
		        d.title          AS title,
		        c.doc            AS doc,
		        vec_to_json(v.embedding) AS vec
		 FROM vectors_vec v
		 JOIN content_vectors cv ON (cv.hash || '_' || cv.seq) = v.hash_seq
		 JOIN documents d ON d.hash = cv.hash
		 JOIN content c ON c.hash = cv.hash
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
			id: r.hashSeq,
			path: r.path,
			title: r.title,
			seq: r.seq,
			pos: r.pos,
			totalChunks: r.totalChunks,
			text,
			vector: JSON.parse(r.vec),
		});
	}
}

db.close();
process.stdout.write(JSON.stringify(out));
