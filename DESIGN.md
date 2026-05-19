---
name: Court Shuffle
description: A courtside pickleball matchup randomiser, designed like a departure board.
colors:
  signal: "oklch(0.535 0.205 34)"
  signal-deep: "oklch(0.46 0.185 34)"
  signal-wash: "oklch(0.955 0.035 46)"
  on-signal: "oklch(0.99 0.014 78)"
  paper: "oklch(0.98 0.007 78)"
  raised: "oklch(0.995 0.003 80)"
  sunk: "oklch(0.955 0.009 78)"
  ink: "oklch(0.235 0.014 62)"
  ink-soft: "oklch(0.505 0.016 62)"
  ink-faint: "oklch(0.55 0.016 62)"
  rule: "oklch(0.235 0.014 62 / 0.16)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  sm: "4px"
  md: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "32px"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    height: "48px"
    padding: "0 16px"
  button-signal-hover:
    backgroundColor: "{colors.signal-deep}"
    textColor: "{colors.on-signal}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 16px"
  panel:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.md}"
    padding: "12px"
  input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 12px"
  chip-pool:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 10px"
  chip-pool-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  score-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
    width: "56px"
  score-chip-winner:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
---

# Design System: Court Shuffle

## 1. Overview

**Creative North Star: "The Departure Board"**

Court Shuffle is read in three-second glances: courtside, one-handed, in direct
sunlight, between games. Its visual system is built like an airport departure
board. A flat, high-contrast information surface where every element earns its
place by being instantly legible, structure is drawn with rules rather than
boxes, and nothing competes for attention except the one thing you need to act
on next. The interface is a sign, not a screen.

The system commits to a warm light surface (never a dark theme: a dark phone
loses to outdoor glare) and a single vermilion signal that does the work of
three states at once: the primary action, live status, and the winning team.
Everything else is ink on paper, divided by hairline and structural rules.
Hierarchy comes from weight, scale, case, and tracking, not from color, shadow,
or decoration.

This system explicitly rejects four things, drawn straight from the product's
anti-references. It is not a **generic SaaS dashboard** (no uniform card grids,
no gradient hero-metric tiles, no indistinct corporate blue). It is not a
**gamified, childish app** (no mascots, no confetti, no badge spam). It is not
**dated enterprise sports software** (no dense gray tables, no cramped forms).
And it is not a **trendy neon dark UI** (no glow, no glassmorphism).

**Key Characteristics:**
- Light, warm, sunlight-grade contrast. Tinted neutrals, never pure black or white.
- One vermilion signal accent. Rare by doctrine.
- Structure drawn with rules: 1px hairlines and 2px ink dividers.
- Uppercase, tracked labels as the wayfinding layer.
- Flat. Depth is tonal layering, never shadow.
- Tabular numerals everywhere a number appears.

## 2. Colors

A warm paper-and-ink field carrying exactly one saturated voice.

### Primary
- **Signal Vermilion** (`oklch(0.535 0.205 34)`): The only accent in the system.
  It marks the single most important thing on a screen: the primary action
  button (Generate, End Round), live round status, and the winning team. Its
  darker partner **Signal Vermilion Deep** (`oklch(0.46 0.185 34)`) is the hover
  and pressed state. **Signal Wash** (`oklch(0.955 0.035 46)`) is a faint tint
  used only as the background of a winning team row. **On-Signal**
  (`oklch(0.99 0.014 78)`) is the warm near-white that sits on vermilion fills.

### Neutral
- **Paper** (`oklch(0.98 0.007 78)`): The base surface. The whole app sits on it.
- **Raised** (`oklch(0.995 0.003 80)`): Bordered blocks (panels, court blocks,
  the roster list) lift a half-step above Paper.
- **Sunk** (`oklch(0.955 0.009 78)`): A recessed tone for ghost-button hover.
- **Ink** (`oklch(0.235 0.014 62)`): Primary text, structural 2px rules, and the
  fill for selected/active controls.
- **Ink Soft** (`oklch(0.505 0.016 62)`): Secondary text and section labels.
- **Ink Faint** (`oklch(0.55 0.016 62)`): Tertiary text, placeholders, dotted
  leader lines, inactive states. Held at or above 4.5:1 contrast on every
  surface so it stays legal for text in direct sunlight.
- **Rule** (`oklch(0.235 0.014 62 / 0.16)`): The hairline. Every 1px divider and
  quiet border.

### Named Rules
**The One Signal Rule.** Vermilion appears on no more than ~10% of any screen,
and only ever on an action, a live-status marker, or a winner. It is never used
to decorate, to tint a panel, or to color a heading. Its rarity is what makes it
read as a signal. If two vermilion elements are fighting on one screen, one is wrong.

**The Tinted Neutral Rule.** There is no `#000` and no `#fff` anywhere. Every
neutral is tinted warm (hue 62 to 80). Pure black or pure white is a defect.

## 3. Typography

**Display / Body / Label Font:** the native system stack (`ui-sans-serif,
system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).

**Character:** One family, worked hard. The system font is chosen for offline
reliability (this is an installable PWA with no network dependency) and for its
excellent tabular numerals. Signage character comes entirely from treatment:
heavy weights, uppercase, wide tracking on labels, tight tracking on the display
number. No display face, no web font, no pairing.

### Hierarchy
- **Display** (800, 1.875rem, line-height 1.1, tracking -0.02em): The round
  number on the Round screen. The single largest element, the anchor of the heartbeat screen.
- **Headline** (800, 1.5rem, tabular): The court-count digits in the selector.
- **Title** (700, 1rem / 0.9375rem): Player names, team rosters, leaderboard
  names. The readable content layer.
- **Body** (400 to 500, 0.875rem / 0.75rem): Helper text, error messages,
  generation hints. Cap prose at 65 to 75ch.
- **Label** (800, 0.6875rem, uppercase, tracking 0.16em): Section labels, court
  tags, status text, button text, table headers. The wayfinding layer.

### Named Rules
**The Caps Label Rule.** Every structural label (section headers, court tags,
status, button text, table headers) is uppercase, weight 800, with letter
tracking of 0.10em to 0.18em. This is the signage voice. Sentence-case is for
content (names, helper prose), never for structure.

**The Tabular Number Rule.** Every numeral the user might scan or compare,
scores, round numbers, win percentages, point differentials, court counts, uses
`tabular-nums`. Numbers must align in a column and never reflow as they change.

## 4. Elevation

The system is flat. There are no drop shadows anywhere in the interface. Depth
is communicated two ways: tonal layering (Raised sits a half-step lighter than
Paper, Sunk a step darker) and rules (a hairline or a 2px ink line marks an
edge). A bordered block is a block because of its border, not a shadow beneath it.

### Named Rules
**The Rule, Not The Shadow Rule.** Separation and grouping are drawn with lines,
never with shadow or blur. Two rule weights exist and only two: the **1px
hairline** (`Rule` color) for dividing rows and quiet borders, and the **2px ink
line** for structural divisions (the header underline, the round-title
underline, the leaderboard header). Pick the weight by importance; never invent
a third.

## 5. Components

Components are crisp and tactile: sharp 4 to 6px corners, flat fills, decisive
150ms color transitions, and touch targets sized for confident one-handed taps.

### Buttons
- **Shape:** Lightly rounded (6px, `rounded.md`). Minimum height 48px; the two
  hero actions (Generate, End Round) run to 56px and full width.
- **Signal (primary):** Vermilion fill, On-Signal text, uppercase label
  typography. The single most important action on a screen. Hover and active
  shift to Signal Vermilion Deep.
- **Ink:** Ink fill, Paper text. Reserved for selected/current states (the
  active court-count, a selected pool chip, the active leaderboard sort), not
  for actions.
- **Outline:** Raised fill, Rule border, Ink text. Secondary and disabled-look
  actions; border darkens to Ink on hover.
- **Ghost:** Transparent, Ink-Soft text, Sunk on hover.
- **Disabled:** 45% opacity, no pointer. The Generate button uses the Outline
  variant while disabled so it visibly is not the live action.

### Chips
- **Pool chips:** Small (4px radius, 44px tall) toggle chips for choosing pool
  partners. Unselected is Paper fill with a Rule border and Ink-Soft text;
  selected flips to a solid Ink fill with Paper text. Uppercase label type.

### Cards / Containers
- **Corner Style:** 6px (`rounded.md`).
- **Background:** Raised, a half-step above the Paper surface.
- **Border:** 1px Rule hairline. This is what defines the block.
- **Shadow Strategy:** None. See Elevation.
- **Internal Padding:** 12px to 16px. Panels are used only for genuine units
  (a court block, the roster list, an empty state). Never nest a panel in a panel.

### Inputs / Fields
- **Style:** 48px tall, 6px radius, Raised fill, 1px Rule border.
- **Focus:** Border shifts to solid Ink. No glow, no ring expansion.
- **Score chip:** A compact numeric input (44px tall, 56px wide, centered
  tabular numerals). When its team is winning it inverts to a Signal Vermilion
  fill with On-Signal text, so the winner reads from the score itself.
- **Inline name field:** The player-name input is borderless until focused, then
  gains a 1px Ink underline. It reads as editable text, not a boxed form field.

### Navigation
- **Bottom tab bar:** Three tabs (Players, Round, Leaders), fixed to the bottom,
  separated from content by a 2px ink rule. Labels are uppercase tracked Label
  type. The active tab is marked by a 3px Signal Vermilion bar along its top
  edge and Ink-weight text; inactive tabs are Ink-Faint. No icons.

### Court Block (signature component)
The Round screen's defining element. A Raised, hairline-bordered block with a
Label-type court tag in a ruled header, then two team rows. Each team row is
`[winner flag] [names] [dotted leader] [score chip]`: the dotted leader line
runs the eye from the names to the score, exactly like a board listing. A
winning row tints to Signal Wash, shows a vermilion "Won" flag, and inverts its
score chip to vermilion. Three independent winner cues (flag, wash, chip), so it
never depends on color alone.

## 6. Do's and Don'ts

### Do:
- **Do** keep the surface light and warm. Sunlight legibility is the use case.
- **Do** reserve Signal Vermilion for one action, live status, and the winner.
  Hold it under ~10% of any screen.
- **Do** draw structure with the two rule weights: 1px hairline, 2px ink.
- **Do** set every structural label in uppercase, weight 800, wide tracking.
- **Do** use `tabular-nums` on every score, count, percentage, and differential.
- **Do** size every control for one-handed touch: 48px minimum, 56px for hero
  actions, 44px for chips.
- **Do** convey winner, team, and status with text or shape, never color alone.

### Don't:
- **Don't** ship a dark theme or dark "scoreboard" panels. A dark phone loses to
  outdoor glare.
- **Don't** build a **generic SaaS dashboard**: no uniform card grids, no
  gradient hero-metric tiles, no indistinct corporate blue.
- **Don't** make it a **gamified, childish app**: no mascots, no confetti, no
  badge spam, no bouncy oversized everything.
- **Don't** let it become **dated enterprise sports software**: no dense gray
  tables, no cramped forms.
- **Don't** reach for a **trendy neon dark UI**: no glow, no glassmorphism.
- **Don't** add drop shadows. Depth is tonal layering and rules only.
- **Don't** use a colored side-stripe (`border-left`/`border-right` > 1px) as an
  accent on any block. Use a full hairline border or a background tint.
- **Don't** use gradient text, `background-clip: text`, or pure `#000` / `#fff`.
- **Don't** introduce a second accent color. The system has one voice.
