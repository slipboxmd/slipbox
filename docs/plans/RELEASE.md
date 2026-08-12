# Release runbook — first beta (v0.1.0)

What ships, how to publish it to npm, and how to bring up the slipbox.md landing
page. The code prep is done (this doc records the manual steps only you can do —
they need your npm login, GitHub settings, and DNS).

## What ships in the beta

| Package | npm name | Notes |
| --- | --- | --- |
| CLI | `slipbox` | `npm i -g slipbox`. Base install is lean — the explorer is opt-in. |
| Core | `@slipbox/core` | The ingest → cluster → note harness (Pi extension + skill). |
| Explorer | `@slipbox/web` | `slipbox serve` / `build`. Pulled in only when you `npm i -g @slipbox/web`. |

Held back: **`@slipbox/readwise`** is marked `private` — it hasn't been run against
a live Readwise account yet. Flip `"private": false` and bump its version when ready.

All three are at **0.1.0**, published to the default `latest` tag (so
`npm i -g slipbox` gets it). Scoped packages carry `publishConfig.access: public`.

## Publish to npm

Prereqs: `npm login` as a user with publish rights on the `slipbox` package name
and the `@slipbox` org (you created it). Then, from the repo root:

```bash
pnpm install
pnpm build && pnpm test          # must be green

# Publish core + web + cli. pnpm converts workspace:* deps to 0.1.0 and orders
# by dependency. readwise is private, so it's skipped automatically.
# --no-git-checks: publishing doesn't require a clean tree. The example corpora are
# git submodules that may be mid-build (or just have a derived .qmd/ index), which
# leaves the parent "unclean" even though nothing in the packages changed. The
# tarballs come from each package's built dist/ + files globs, so this is safe.
pnpm -r publish --access public --no-git-checks
```

### 2FA on publish

npm requires 2FA (or a bypass token) to publish, and a one-time code is single-use
— so a bare `pnpm -r publish` fails partway (it can't reuse one code across three
packages). Two options:

**A. Automation token (recommended — one-shot, works in CI later).** Create a
Granular Access Token (npmjs.com → Access Tokens) with Read+Write on the `slipbox`
package and `@slipbox` scope and 2FA-bypass enabled (or a classic "Automation"
token, which bypasses 2FA by design). Then:

```bash
npm config set //registry.npmjs.org/:_authToken=<TOKEN>
pnpm -r publish --access public --no-git-checks   # no OTP prompts
```

**B. One code per package (no token).** Run each with a FRESH code from your
authenticator, in dependency order:

```bash
pnpm --filter @slipbox/core publish --access public --no-git-checks --otp=<code>
pnpm --filter @slipbox/web  publish --access public --no-git-checks --otp=<code>
pnpm --filter slipbox       publish --access public --no-git-checks --otp=<code>

# Verify
npm view slipbox version         # → 0.1.0
npm i -g slipbox @tobilu/qmd      # smoke test in a scratch dir
```

Then tag the release:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Notes:
- `pnpm -r publish` publishes every non-private workspace package. Because
  `@slipbox/readwise` is `private`, only the three intended packages go out.
- If npm rejects a scoped package as private, double-check `publishConfig.access`
  is `public` in that package.json (it is, for core + web).

## Landing page — slipbox.md via GitHub Pages

The repo already has `_config.yml` (theme: `jekyll-theme-cayman`), `index.md` (the
landing content), and `CNAME` (`slipbox.md`). GitHub builds it with its built-in
Jekyll — no Actions workflow needed (so the `workflow` token scope isn't required).

1. **Enable Pages.** Repo → Settings → Pages → Source: **Deploy from a branch** →
   Branch: `main`, folder `/ (root)` → Save.
2. **Custom domain.** The `CNAME` file sets it to `slipbox.md`. In Settings → Pages,
   confirm the domain shows and, once DNS resolves, tick **Enforce HTTPS**.
3. **DNS at your registrar (101domains).** Point the apex `slipbox.md` at GitHub
   Pages with four A records (and optionally AAAA for IPv6):

   ```
   A   @   185.199.108.153
   A   @   185.199.109.153
   A   @   185.199.110.153
   A   @   185.199.111.153
   ```
   (Optional IPv6:)
   ```
   AAAA @  2606:50c0:8000::153
   AAAA @  2606:50c0:8001::153
   AAAA @  2606:50c0:8002::153
   AAAA @  2606:50c0:8003::153
   ```
   Optional `www` redirect: `CNAME  www  slipboxmd.github.io`.

Until DNS propagates, the site is reachable at `https://slipboxmd.github.io/slipbox/`
(the theme's asset paths assume the custom-domain root, so a couple of styles may
look off on that interim URL — they resolve once `slipbox.md` is live).

To swap themes, change `theme:` in `_config.yml` to another supported one
(`jekyll-theme-minimal`, `jekyll-theme-architect`, `jekyll-theme-slate`, …).

## After the beta is out

- Announce with the install one-liner + a link to an example slipbox.
- Publish demo sites for the example corpora (each `example-*` repo can run
  `slipbox build` in CI once the explorer is on npm).
- When Readwise is validated: unmark `@slipbox/readwise` private, version it, publish.
