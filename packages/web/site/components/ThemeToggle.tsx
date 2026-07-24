"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icon";

type Theme = "light" | "dark";

/**
 * Light/dark toggle. The initial theme is applied by an inline script in the
 * layout (before paint); this only reflects and changes it, so there's no flash
 * and no hydration mismatch on the icon.
 */
export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme | null>(null);

	useEffect(() => {
		const attr = document.documentElement.getAttribute("data-theme") as Theme | null;
		if (attr) return setTheme(attr);
		setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
	}, []);

	function toggle() {
		const next: Theme = theme === "dark" ? "light" : "dark";
		setTheme(next);
		document.documentElement.setAttribute("data-theme", next);
		try {
			localStorage.setItem("slipbox-theme", next);
		} catch {
			/* private browsing — the theme just won't persist */
		}
	}

	return (
		<button type="button" onClick={toggle} aria-label="Toggle light and dark theme" title="Toggle theme">
			{/* Nothing until the effect resolves the theme, so the icon can't flip after paint. */}
			{theme === null ? <span className="icon-placeholder" /> : theme === "dark" ? <MoonIcon /> : <SunIcon />}
		</button>
	);
}
