import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

/**
 * `slipbox site:init` — write deploy configuration, and nothing else.
 *
 * The explorer itself ships inside the package, so there's no app to scaffold.
 * What a host needs is a build command: both files below just run `slipbox build`
 * and publish the result.
 */

const VERCEL_JSON = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npx --yes slipbox build",
  "outputDirectory": "out",
  "framework": null
}
`;

function pagesWorkflow(repoName: string): string {
	return `# Publish this slipbox to GitHub Pages.
#
# Project sites are served from /<repo>/, so the build needs --base-path or every
# asset 404s. Enable Pages for this repo with "Source: GitHub Actions" first.
name: Publish slipbox

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Build the site
        run: npx --yes slipbox build --base-path "/${repoName}"
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;
}

export interface SiteInitResult {
	written: string[];
	skipped: string[];
}

export async function siteInit(slipboxRoot: string, opts: { repoName?: string; force?: boolean } = {}): Promise<SiteInitResult> {
	const root = resolve(slipboxRoot);
	const repoName = opts.repoName ?? basename(root);
	const written: string[] = [];
	const skipped: string[] = [];

	const targets: { path: string; contents: string }[] = [
		{ path: join(root, "vercel.json"), contents: VERCEL_JSON },
		{ path: join(root, ".github", "workflows", "publish-slipbox.yml"), contents: pagesWorkflow(repoName) },
	];

	for (const t of targets) {
		if (existsSync(t.path) && !opts.force) {
			skipped.push(t.path);
			continue;
		}
		await mkdir(join(t.path, ".."), { recursive: true });
		await writeFile(t.path, t.contents, "utf8");
		written.push(t.path);
	}
	return { written, skipped };
}
