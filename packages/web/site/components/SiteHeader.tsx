import Link from "next/link";
import { GraphIcon, SearchIcon, SourcesIcon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ name }: { name: string }) {
	return (
		<header className="site-header">
			<div className="container">
				<Link href="/" className="site-title">
					{name}
				</Link>
				<nav className="site-nav">
					<Link href="/references/">
						<SourcesIcon />
						<span>Sources</span>
					</Link>
					<Link href="/graph/">
						<GraphIcon />
						<span>Graph</span>
					</Link>
					<Link href="/search/">
						<SearchIcon />
						<span>Search</span>
					</Link>
					<ThemeToggle />
				</nav>
			</div>
		</header>
	);
}
