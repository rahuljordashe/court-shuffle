import { test, expect } from '@playwright/test'
import { findTeam, playRound, setupConstrainedSession } from './helpers'

test('locked and pool constraints hold across 5 generated rounds', async ({ page }) => {
  await page.goto('/')
  await setupConstrainedSession(page)

  for (let round = 1; round <= 5; round++) {
    const data = await playRound(page)
    expect(data.index).toBe(round)

    // Every team must have exactly 2 players.
    for (const court of data.courts) {
      for (const team of court) {
        expect(team).toHaveLength(2)
      }
    }

    // Locked pair: when both P0 and P1 play, they must be partners.
    const p0Team = findTeam(data, 'P0')
    const p1Team = findTeam(data, 'P1')
    if (p0Team && p1Team) {
      expect(p0Team).toContain('P1')
      expect(p1Team).toContain('P0')
    }

    // Pool player: when P2 plays, the partner must come from the pool {P3, P4}.
    const p2Team = findTeam(data, 'P2')
    if (p2Team) {
      const partner = p2Team.find((n) => n !== 'P2')
      expect(['P3', 'P4']).toContain(partner)
    }
  }
})
