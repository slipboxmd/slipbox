import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ name }: { name: string }) {
	return (
		<header className="site-header">
			<div className="container">
				<Link href="/" className="site-title">
					{name}
				</Link>
				<nav className="site-nav">
					<Link href="/references/">Sources</Link>
					<Link href="/graph/">Graph</Link>
					<Link href="/search/">Search</Link>
					<ThemeToggle />
				</nav>
			</div>
		</header>
	);
}
