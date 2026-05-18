import { test, expect } from '@playwright/test'
import { addPlayers, playRoundWithScores, setCourts, type RoundData } from './helpers'

interface Expected {
  games: number
  wins: number
  diff: number
}

function accumulate(
  expected: Map<string, Expected>,
  data: RoundData,
  plan: number[][],
): void {
  for (let c = 0; c < data.courts.length; c++) {
    for (let t = 0; t < 2; t++) {
      const own = plan[c][t]
      const opp = plan[c][t === 0 ? 1 : 0]
      for (const name of data.courts[c][t]) {
        const e = expected.get(name) ?? { games: 0, wins: 0, diff: 0 }
        e.games += 1
        e.diff += own - opp
        if (own > opp) e.wins += 1
        expected.set(name, e)
      }
    }
  }
}

test('leaderboard win% and point differential match entered scores', async ({ page }) => {
  await page.goto('/')

  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
  await addPlayers(page, names)
  await setCourts(page, 2)

  const expected = new Map<string, Expected>()

  // Round 1 scores: court 0 -> 11/6, court 1 -> 11/8.
  const round1Plan = [
    [11, 6],
    [11, 8],
  ]
  const round1 = await playRoundWithScores(page, round1Plan)
  accumulate(expected, round1, round1Plan)

  // Round 2 scores: court 0 -> 6/11, court 1 -> 11/9.
  const round2Plan = [
    [6, 11],
    [11, 9],
  ]
  const round2 = await playRoundWithScores(page, round2Plan)
  accumulate(expected, round2, round2Plan)

  await page.getByTestId('tab-leaderboard').click()

  let verified = 0
  for (const [name, e] of expected) {
    const row = page.locator(`[data-testid="leaderboard-row"][data-name="${name}"]`)
    await expect(row).toHaveAttribute('data-games', String(e.games))
    await expect(row).toHaveAttribute('data-wins', String(e.wins))
    await expect(row).toHaveAttribute('data-diff', String(e.diff))
    const expectedPct = Math.round((e.wins / e.games) * 100 * 10) / 10
    await expect(row).toHaveAttribute('data-winpct', String(expectedPct))
    verified += 1
  }

  // Every player played both rounds; well beyond the 3-player requirement.
  expect(verified).toBe(8)
  expect(verified).toBeGreaterThanOrEqual(3)
})
