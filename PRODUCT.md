# Product

## Register

product

## Users

The primary user is the **session organizer**: the person who runs an informal
pickleball session for a group. They hold one phone courtside and operate it
one-handed, often outdoors in bright light, between games, while also playing
and talking to people. They are not a software user at a desk; they are a host
managing a rotation. Players are secondary: they read court assignments and the
leaderboard over the organizer's shoulder, or when the phone is handed across.

The job to be done: get the group fairly and quickly into the next round of
doubles, round after round, without anyone arguing about who partners with whom
or who sits out.

## Product Purpose

Court Shuffle randomizes doubles matchups for group pickleball sessions. It
honors partner constraints (locked pairs, restricted pools), maximizes fresh
partner and opponent combinations, distributes sit-outs evenly, and tracks
scores into a leaderboard. It runs fully client-side as an installable PWA, so
it works on a court with no signal.

Success: the organizer taps "Generate Next Round," the assignment is fair and
obviously correct, and the group is playing again within seconds. Across a
session nobody repeats partners more than they must, nobody sits out more than
anyone else, and the leaderboard is trusted without a second look.

## Brand Personality

Crisp and energetic. Sporty without being aggressive: quick, decisive,
confident. The voice is plain and direct, the language of a good rec-league
organizer, not a software product. Three words: **sharp, brisk, dependable.**
The interface should feel like a referee's whistle: clear, instant, no
ambiguity. Energy comes from pace and decisiveness, never from decoration.

## Anti-references

Court Shuffle should not look like any of these:

- **Generic SaaS dashboard.** Uniform card grids, gradient hero-metric tiles,
  indistinct corporate blue, "analytics" framing. This is a courtside tool, not
  a B2B dashboard.
- **Gamified, childish app.** Cartoon mascots, confetti, badge spam, everything
  oversized and bouncy. The fun is the sport; the app stays out of the way.
- **Dated enterprise sports software.** Dense gray tables, cramped forms,
  league-management heaviness. The opposite of fast and frictionless.
- **Trendy neon dark UI.** Glowing accents, glassmorphism, crypto/gamer styling
  for its own sake.

## Design Principles

1. **Courtside, not desk-side.** Assume every interaction happens in the worst
   conditions: direct sunlight, one hand, mid-conversation, a few seconds of
   attention. Optimize for that, not for a calm demo.
2. **Generate, glance, go.** The round generator is the heartbeat. The shortest
   path from "who's next" to "back on court" wins. Cut taps, cut confirmation
   steps, cut dead time.
3. **Fairness you can see.** The shuffle and the leaderboard are math the
   organizer vouches for to a group of people. Make honored constraints,
   balanced sit-outs, and correct scores obvious, so the result is never argued.
4. **Energy through pace, not props.** Personality comes from crisp transitions,
   decisive controls, and confident typography. No mascots, no confetti, no
   glow. Every anti-reference substitutes decoration for clarity.
5. **Show only the current step.** A constraint solver and a scoring engine sit
   underneath. Surface only what the task at hand needs; keep the rest invisible
   until summoned.

## Accessibility & Inclusion

Baseline WCAG 2.2 AA. Two needs are elevated by the courtside context:

- **High outdoor legibility.** Contrast must survive bright sunlight on a phone
  screen. Push primary text and key controls toward AAA contrast; avoid
  low-contrast gray-on-gray for anything that must be read mid-game.
- **Large touch targets.** Every interactive control is sized and spaced for
  confident one-handed taps, including with sweaty hands. Minimum 44px, 48px
  preferred for primary actions.

Color is never the sole carrier of meaning (winner, team, and status also use
text or shape), and no motion is required to understand state. The app stays
usable with reduced motion and for color-blind users, even though those were
not called out as primary needs.
