<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/web — SUBXVoice website

Landing page + Mac / Windows download buttons. Later: account pages and the team admin dashboard.

- Download links come from `downloadUrl()` in `@subx/shared` — never hardcode release URLs here.
- Workspace packages must be listed in `transpilePackages` in `next.config.ts`.
- Styling: Tailwind v4 with the color tokens in `src/app/globals.css` (`background`, `foreground`,
  `muted`, `border`). Use them instead of raw colors so dark mode keeps working.
- Deploys to Vercel.
