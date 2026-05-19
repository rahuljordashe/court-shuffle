# Decisions

Choices made where the brief left room for interpretation. Each is the simplest
reasonable option.

## Constraint model

- **Locked** is a bidirectional pair. Setting A locked to B also locks B to A;
  changing either back to Open frees both. A locked pair is treated by the
  generator as a single unit: they always play together as partners or sit out
  together. This structurally guarantees "always partner together when both play".
- **Pool** is modelled as a per-player allow-list (`poolIds`) of partners that
  player may be paired with. A "2-player pool" means two allowed partners. The
  listed members stay Open unless separately configured — matching the spec test
  setup ("one Pool player ... the rest Open"). Pool is enforced on the pool
  player's pairing; it does not restrict the listed members' own pairings.
- **Open** players may partner anyone not removed from the pool by a Locked
  pairing (locked players are never offered as open partners).

## Session / generation

- Default court count is **2**, set with a stepper. Minimum 1, no upper limit;
  each court is doubles (4 players). When the roster cannot fill every court the
  generator quietly uses fewer, and the Courts caption says so.
- The roster is one shared group; players are never tied to a specific court.
  If the roster exceeds court capacity the extras sit out. Sit-out selection
  benches units in strict order of prior sit-out count, so session totals stay
  even (spread 0–1), and within a tier anyone who sat the previous round is
  picked last, so nobody sits back-to-back unless it is unavoidable.
- A player can be **rested** (sits the next round, stays in the session) or
  **checked out** (removed from every future round, leaderboard record kept).
  Checkout is reversible: a checked-out player can be brought back into the
  session and returns as `resting`, so an accidental checkout never needs a
  full session clear to undo.
- Generation is a **scored randomised search**: 2500 candidate rounds are built,
  hard constraints filter out infeasible candidates, and the best-scored survivor
  is kept. Score priority: avoid back-to-back sit-outs >> new partnerships >>
  new opponents >> sit-out spread.
- "Generate Next Round" is disabled while a round is in progress; **End Round**
  must be pressed first. End Round locks the round's scores.

## Scoring / leaderboard

- The winner of a court is **derived from the two entered scores** (higher score
  wins); the winning team is highlighted with a "Winner" badge. Equal scores mark
  no winner.
- A court contributes to the leaderboard only once **both** team scores are
  entered and the round is ended.
- Win % = games won / games played (0 when no games played). Point differential
  = sum of (own team score − opponent score) across a player's games.
- The leaderboard is shown on its own tab; before round 1 it shows a placeholder.

## Tooling

- `bun run build` runs `vite build` (esbuild transpile). Type-checking is not in
  the build path to keep the acceptance build deterministic.
- shadcn/ui-style primitives (`Button`, `Card`, `TextInput`) are hand-written in
  `src/components/ui.tsx` with Tailwind v4 — same component conventions, without
  running the interactive shadcn CLI (which needs network/prompts).
- All Playwright specs run against the production `vite preview` build so the
  service worker and persisted state are exercised the same way a user sees them.
- App icons are generated dependency-free by `scripts/gen-icons.mjs`.
