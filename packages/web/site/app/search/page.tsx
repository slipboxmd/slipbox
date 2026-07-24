import { buildSearchIndex } from "@lib/indexes.js";
import { getSlipbox } from "@lib/load.js";
import { Search } from "../../components/Search";

export const metadata = { title: "Search — Slipbox" };

export default function SearchPage() {
	// The index is built here (server, at export time) and handed to the client
	// component, so it only loads for people who actually open this page.
	const docs = buildSearchIndex(getSlipbox());
	return (
		<main>
			<div className="container">
				<h1 className="page-title">Search</h1>
				<p className="page-intro">Titles, tags, and note text.</p>
				<Search docs={docs} />
			</div>
		</main>
	);
}
