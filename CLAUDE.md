# Court Shuffle

## Design Context

This project uses the `impeccable` design skill. Before any UI work, read
`PRODUCT.md` (strategic context) and `DESIGN.md` (visual system, once present).

**Register:** product. A courtside utility; design serves the task.

**Design principles:**
1. Courtside, not desk-side. Optimize for sunlight, one hand, split attention.
2. Generate, glance, go. Shortest path from "who's next" to "back on court."
3. Fairness you can see. Honored constraints, balanced sit-outs, correct scores.
4. Energy through pace, not props. Personality from motion and type, not decoration.
5. Show only the current step. Keep the solver and scoring invisible until summoned.

See `PRODUCT.md` for users, purpose, anti-references, and accessibility needs.

## Testing note

Playwright e2e specs key off `data-testid` and `data-*` attributes. Any redesign
must preserve those hooks or the acceptance suite breaks. Run `bun run build`
and `bun run test:e2e` after UI changes.
