# Court Shuffle

A mobile-first PWA for randomising pickleball doubles matchups in group
sessions. Built to be used courtside, one-handed, in direct sunlight, with no
network connection.

## What it does

- **Players** — add, rename, and remove players. Each player has one
  partner-constraint mode:
  - **Locked**: one fixed partner for the whole session (bidirectional).
  - **Pool**: may only partner with players from a defined subset.
  - **Open**: may partner with anyone not blocked by another constraint.
- **Match generation** — "Generate Next Round" uses a scored randomised search
  that honours every Locked and Pool constraint, maximises never-before-paired
  partners, then never-before-faced opponents, and distributes sit-outs evenly.
- **Score entry** — per-court score entry with a derived winner.
- **Leaderboard** — per-player win percentage and point differential, sortable.
- **Offline** — an installable PWA; fully functional offline after first load.

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, Zustand (persisted to
localStorage), `vite-plugin-pwa` (Workbox), Playwright for e2e tests. Bun as the
package manager and runtime. No backend; fully client-side.

## Getting started

Requires [Bun](https://bun.sh).

```sh
bun install            # install dependencies
bun run dev            # start the dev server
bun run build          # production build (regenerates icons, then builds)
bun run preview        # preview the production build on :4173
bun run test:e2e       # run the Playwright end-to-end suite
```

The dev server does not run a service worker; the PWA and offline behaviour are
only active in the production build (`build` + `preview`). The e2e suite builds
and previews automatically.

## Project layout

```
src/lib/        store, types, round generator, leaderboard math
src/components/ screens (Players, Round, Leaderboard) and UI primitives
e2e/            Playwright specs and helpers
scripts/        dependency-free PNG icon generator
```

## Design and decisions

- `PRODUCT.md` — strategic context: users, purpose, principles, anti-references.
- `DESIGN.md` — the visual system: tokens, type, components, do's and don'ts.
- `DECISIONS.md` — choices made where the brief left room for interpretation.
