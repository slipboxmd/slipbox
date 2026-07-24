/**
 * Icons.
 *
 * Paths are from Lucide (https://lucide.dev, ISC licensed, the community fork of
 * Feather) and inlined rather than pulled in as a dependency: we need a handful,
 * the site must work under a strict CSP with no external requests, and inlining
 * keeps `npm i -g slipbox` small.
 *
 * All icons are 24x24 on a 2px stroke and inherit `currentColor`, so they take
 * their colour from the surrounding text and stay consistent at any size.
 *
 * To add one: copy the inner elements from node_modules/lucide-static/icons/<name>.svg.
 */
import type { SVGProps } from "react";

const BASE: SVGProps<SVGSVGElement> = {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": true,
	focusable: false,
};

export interface IconProps {
	/** Rendered size in px. Defaults to 1em so it tracks the text it sits beside. */
	size?: number | string;
	className?: string;
}

function svgProps({ size = "1em", className }: IconProps) {
	return { ...BASE, width: size, height: size, className };
}

export function SunIcon(props: IconProps) {
	return (
		<svg {...svgProps(props)}>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</svg>
	);
}

export function MoonIcon(props: IconProps) {
	return (
		<svg {...svgProps(props)}>
			<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
		</svg>
	);
}

export function SearchIcon(props: IconProps) {
	return (
		<svg {...svgProps(props)}>
			<path d="m21 21-4.34-4.34" />
			<circle cx="11" cy="11" r="8" />
		</svg>
	);
}

/** The note network — used for the graph view. */
export function GraphIcon(props: IconProps) {
	return (
		<svg {...svgProps(props)}>
			<path d="m10.586 5.414-5.172 5.172" />
			<path d="m18.586 13.414-5.172 5.172" />
			<path d="M6 12h12" />
			<circle cx="12" cy="20" r="2" />
			<circle cx="12" cy="4" r="2" />
			<circle cx="20" cy="12" r="2" />
			<circle cx="4" cy="12" r="2" />
		</svg>
	);
}

/** The ingested sources. */
export function SourcesIcon(props: IconProps) {
	return (
		<svg {...svgProps(props)}>
			<rect width="8" height="18" x="3" y="3" rx="1" />
			<path d="M7 3v18" />
			<path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" />
		</svg>
	);
}
