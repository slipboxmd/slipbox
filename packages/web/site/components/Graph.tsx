"use client";

import { forceCenter, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation } from "d3-force";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphData, GraphNode } from "@lib/indexes.js";
import type { NoteType } from "@lib/model.js";
import { TYPE_LABEL } from "@lib/model.js";

/**
 * The slipbox as a force-directed graph.
 *
 * Canvas rather than SVG: at a few hundred notes SVG hit-testing and repaints
 * start to stutter, while canvas stays smooth. Layout runs in a d3 simulation and
 * we draw every tick; labels appear only above a zoom threshold so a dense graph
 * doesn't turn into a wall of text.
 */

type SimNode = GraphNode & { x: number; y: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null };
type SimEdge = { source: SimNode | string; target: SimNode | string };

const TYPE_ORDER: NoteType[] = ["reference", "literature-note", "permanent-note", "moc"];

/** Read theme colours from CSS so the graph follows light/dark automatically. */
function themeColors() {
	const css = getComputedStyle(document.documentElement);
	const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
	return {
		ink: v("--ink", "#1b1a17"),
		muted: v("--ink-muted", "#6a675f"),
		faint: v("--ink-faint", "#949086"),
		rule: v("--rule", "#e3e0d9"),
		accent: v("--accent", "#8a5a2b"),
		bg: v("--bg-raised", "#fff"),
	};
}

const TYPE_COLOR: Record<NoteType, string> = {
	reference: "#8a5a2b",
	"literature-note": "#4a7c8c",
	"permanent-note": "#6b7c4a",
	moc: "#8c5a7c",
};

export function Graph({ data }: { data: GraphData }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const [hidden, setHidden] = useState<Set<NoteType>>(new Set());
	const [hover, setHover] = useState<SimNode | null>(null);

	const present = useMemo(() => TYPE_ORDER.filter((t) => data.nodes.some((n) => n.type === t)), [data.nodes]);

	// Everything mutable the render loop needs, kept out of React state so the
	// simulation isn't restarted on every pan/zoom frame.
	const view = useRef({ scale: 1, x: 0, y: 0 });
	const nodesRef = useRef<SimNode[]>([]);
	const simRef = useRef<Simulation<SimNode, undefined> | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const wrap = wrapRef.current;
		if (!canvas || !wrap) return;

		const visible = new Set(data.nodes.filter((n) => !hidden.has(n.type)).map((n) => n.id));
		const nodes: SimNode[] = data.nodes.filter((n) => visible.has(n.id)).map((n) => ({ ...n, x: 0, y: 0 }));
		const byId = new Map(nodes.map((n) => [n.id, n]));
		const edges: SimEdge[] = data.edges
			.filter((e) => visible.has(e.source) && visible.has(e.target))
			.map((e) => ({ source: byId.get(e.source)!, target: byId.get(e.target)! }));
		nodesRef.current = nodes;

		let width = wrap.clientWidth;
		let height = Math.max(420, Math.min(720, Math.round(window.innerHeight * 0.7)));
		const dpr = window.devicePixelRatio || 1;

		const resize = () => {
			width = wrap.clientWidth;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
		};
		resize();

		const radius = (n: SimNode) => 3 + Math.min(7, Math.sqrt(n.degree) * 2);

		const sim = forceSimulation<SimNode>(nodes)
			.force("charge", forceManyBody<SimNode>().strength(-160).distanceMax(600))
			.force(
				"link",
				forceLink<SimNode, SimEdge>(edges)
					.id((d) => (d as SimNode).id)
					.distance(60)
					.strength(0.35),
			)
			.force("center", forceCenter(width / 2, height / 2))
			// Gentle centring pull keeps disconnected notes from drifting off-canvas.
			.force("x", forceX(width / 2).strength(0.02))
			.force("y", forceY(height / 2).strength(0.02));
		simRef.current = sim;

		let colors = themeColors();
		const draw = () => {
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			const { scale, x: tx, y: ty } = view.current;
			ctx.save();
			ctx.scale(dpr, dpr);
			ctx.clearRect(0, 0, width, height);
			ctx.translate(tx, ty);
			ctx.scale(scale, scale);

			ctx.strokeStyle = colors.rule;
			ctx.globalAlpha = 0.9;
			ctx.lineWidth = 1 / scale;
			ctx.beginPath();
			for (const e of edges) {
				const s = e.source as SimNode;
				const t = e.target as SimNode;
				ctx.moveTo(s.x, s.y);
				ctx.lineTo(t.x, t.y);
			}
			ctx.stroke();
			ctx.globalAlpha = 1;

			for (const n of nodes) {
				ctx.beginPath();
				ctx.arc(n.x, n.y, radius(n), 0, Math.PI * 2);
				ctx.fillStyle = TYPE_COLOR[n.type];
				ctx.fill();
				if (hover?.id === n.id) {
					ctx.lineWidth = 2 / scale;
					ctx.strokeStyle = colors.ink;
					ctx.stroke();
				}
			}

			// Labels only when zoomed in enough to read them, or on hover.
			if (scale > 1.4 || hover) {
				ctx.fillStyle = colors.muted;
				ctx.font = `${12 / scale}px ui-sans-serif, system-ui, sans-serif`;
				ctx.textAlign = "center";
				for (const n of nodes) {
					if (scale <= 1.4 && hover?.id !== n.id) continue;
					const label = n.label.length > 42 ? `${n.label.slice(0, 40)}…` : n.label;
					ctx.fillText(label, n.x, n.y - radius(n) - 5 / scale);
				}
			}
			ctx.restore();
		};

		sim.on("tick", draw);

		// --- interaction -----------------------------------------------------
		const toGraph = (clientX: number, clientY: number) => {
			const rect = canvas.getBoundingClientRect();
			const { scale, x, y } = view.current;
			return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale };
		};

		const nodeAt = (clientX: number, clientY: number): SimNode | null => {
			const p = toGraph(clientX, clientY);
			let best: SimNode | null = null;
			let bestD = Infinity;
			for (const n of nodes) {
				const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
				const r = radius(n) + 6;
				if (d < r * r && d < bestD) {
					best = n;
					bestD = d;
				}
			}
			return best;
		};

		let dragging = false;
		let dragNode: SimNode | null = null;
		let last = { x: 0, y: 0 };
		let moved = false;

		const onDown = (e: PointerEvent) => {
			canvas.setPointerCapture(e.pointerId);
			moved = false;
			last = { x: e.clientX, y: e.clientY };
			dragNode = nodeAt(e.clientX, e.clientY);
			if (dragNode) {
				sim.alphaTarget(0.2).restart();
				const p = toGraph(e.clientX, e.clientY);
				dragNode.fx = p.x;
				dragNode.fy = p.y;
			} else {
				dragging = true;
			}
		};

		const onMove = (e: PointerEvent) => {
			if (Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y) > 3) moved = true;
			if (dragNode) {
				const p = toGraph(e.clientX, e.clientY);
				dragNode.fx = p.x;
				dragNode.fy = p.y;
				return;
			}
			if (dragging) {
				view.current.x += e.clientX - last.x;
				view.current.y += e.clientY - last.y;
				last = { x: e.clientX, y: e.clientY };
				draw();
				return;
			}
			const hit = nodeAt(e.clientX, e.clientY);
			canvas.style.cursor = hit ? "pointer" : "grab";
			setHover((prev) => (prev?.id === hit?.id ? prev : hit));
		};

		const onUp = (e: PointerEvent) => {
			if (dragNode) {
				sim.alphaTarget(0);
				dragNode.fx = null;
				dragNode.fy = null;
				if (!moved) router.push(dragNode.href);
			}
			dragNode = null;
			dragging = false;
			canvas.releasePointerCapture(e.pointerId);
		};

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			const factor = Math.exp(-e.deltaY * 0.0015);
			const next = Math.min(6, Math.max(0.25, view.current.scale * factor));
			const k = next / view.current.scale;
			// Zoom toward the cursor rather than the origin.
			view.current.x = mx - (mx - view.current.x) * k;
			view.current.y = my - (my - view.current.y) * k;
			view.current.scale = next;
			draw();
		};

		canvas.addEventListener("pointerdown", onDown);
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerup", onUp);
		canvas.addEventListener("wheel", onWheel, { passive: false });

		const onResize = () => {
			resize();
			sim.force("center", forceCenter(width / 2, height / 2));
			sim.alpha(0.3).restart();
		};
		window.addEventListener("resize", onResize);

		const themeObserver = new MutationObserver(() => {
			colors = themeColors();
			draw();
		});
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

		return () => {
			sim.stop();
			canvas.removeEventListener("pointerdown", onDown);
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerup", onUp);
			canvas.removeEventListener("wheel", onWheel);
			window.removeEventListener("resize", onResize);
			themeObserver.disconnect();
		};
		// `hover` intentionally excluded: it's read through a ref-like closure and
		// re-running the effect would restart the whole simulation on every hover.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, hidden, router]);

	function toggle(type: NoteType) {
		setHidden((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	}

	return (
		<div>
			<div className="graph-controls">
				<div className="graph-legend">
					{present.map((t) => (
						<label key={t}>
							<input type="checkbox" checked={!hidden.has(t)} onChange={() => toggle(t)} />
							<span className="swatch" style={{ background: TYPE_COLOR[t] }} />
							{TYPE_LABEL[t]}
						</label>
					))}
				</div>
				<span className="graph-hint">drag to pan · scroll to zoom · click a note to open it</span>
			</div>
			<div className="graph-shell" ref={wrapRef}>
				<canvas ref={canvasRef} className="graph-canvas" />
			</div>
			{hover ? <p className="search-meta">{hover.label}</p> : null}
		</div>
	);
}
