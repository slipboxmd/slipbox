import "./slipbox.css";
import type { Metadata } from "next";
import { getSlipbox } from "@lib/load.js";
import { SiteHeader } from "../components/SiteHeader";
import { RELOAD_TOKEN } from "./reload-token";

export const metadata: Metadata = {
	title: "Slipbox",
	description: "A Zettelkasten slipbox.",
};

/**
 * Set the theme before first paint so a dark-mode reader never sees a white
 * flash. Runs inline, ahead of the stylesheet's media query.
 */
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem('slipbox-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const slipbox = getSlipbox();
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			</head>
			<body data-reload={RELOAD_TOKEN}>
				<div className="page">
					<SiteHeader name={slipbox.name} />
					{children}
					<footer className="site-footer">
						<div className="container">
							<span>
								{slipbox.notes.length} note{slipbox.notes.length === 1 ? "" : "s"}
							</span>
							<span>
								Built with <a href="https://slipbox.md">slipbox</a>
							</span>
						</div>
					</footer>
				</div>
			</body>
		</html>
	);
}
