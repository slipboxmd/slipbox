import { buildGraph } from "@lib/indexes.js";
import { getSlipbox } from "@lib/load.js";
import { Graph } from "../../components/Graph";

export const metadata = { title: "Graph — Slipbox" };

export default function GraphPage() {
	const slipbox = getSlipbox();
	const data = buildGraph(slipbox);
	const linked = data.nodes.filter((n) => n.degree > 0).length;

	return (
		<main>
			<div className="container container-wide">
				<h1 className="page-title">Graph</h1>
				<p className="page-intro">
					{data.nodes.length} note{data.nodes.length === 1 ? "" : "s"}, {data.edges.length} connection
					{data.edges.length === 1 ? "" : "s"}
					{data.nodes.length > 0 ? ` · ${data.nodes.length - linked} unlinked` : ""}.
				</p>
				{data.nodes.length === 0 ? (
					<p className="empty">Nothing to draw yet — ingest a source and write some notes.</p>
				) : (
					<Graph data={data} />
				)}
			</div>
		</main>
	);
}
