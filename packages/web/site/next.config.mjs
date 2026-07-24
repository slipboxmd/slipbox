/** @type {import('next').NextConfig} */
const nextConfig = {
	// Static export: the explorer must run on GitHub Pages / any static host.
	output: "export",
	// GitHub Pages project sites are served from /<repo>/, so assets need a prefix.
	basePath: process.env.SLIPBOX_BASE_PATH || undefined,
	assetPrefix: process.env.SLIPBOX_BASE_PATH || undefined,
	// Directory listings on static hosts want trailing slashes.
	trailingSlash: true,
	images: { unoptimized: true },
	// The content lives outside this directory; nothing here should be traced.
	outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
