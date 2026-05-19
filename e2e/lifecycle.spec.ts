import { test, expect } from '@playwright/test'
import {
  addPlayers,
  checkOutPlayer,
  findTeam,
  getRow,
  playRound,
  playRoundWithScores,
  setCourts,
  setResting,
} from './helpers'

test('a resting player sits the next round out, then returns', async ({ page }) => {
  await page.goto('/')
  await addPlayers(page, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'])
  await setCourts(page, 2)

  // Rest P0. With eight players still in the rotation and two courts, nobody
  // is benched by the system — P0 is off-court purely by choice.
  await setResting(page, 'P0', true)

  const r1 = await playRound(page)
  expect(r1.index).toBe(1)
  expect(r1.resting).toEqual(['P0'])
  expect(findTeam(r1, 'P0')).toBeNull()
  expect(r1.sitouts).not.toContain('P0')

  // Bring P0 back. A rested round counts as a sit-out, so P0 is not the player
  // the system benches next — they return straight onto a court.
  await setResting(page, 'P0', false)

  const r2 = await playRound(page)
  expect(r2.index).toBe(2)
  expect(r2.resting).toEqual([])
  expect(r2.sitouts).not.toContain('P0')
  expect(findTeam(r2, 'P0')).not.toBeNull()
})

test('a checked-out player leaves the rotation but keeps their record', async ({
  page,
}) => {
  await page.goto('/')
  await addPlayers(page, ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'])
  await setCourts(page, 2)

  // Round 1: all eight play across two courts.
  const r1 = await playRoundWithScores(page, [
    [11, 5],
    [11, 5],
  ])
  expect(r1.sitouts).toEqual([])

  // P0 checks out for good.
  await checkOutPlayer(page, 'P0')
  await expect(getRow(page, 'P0')).toHaveAttribute('data-status', 'left')

  // Round 2: P0 appears nowhere — not on a court, not benched, not resting.
  const r2 = await playRound(page)
  expect(r2.index).toBe(2)
  expect(findTeam(r2, 'P0')).toBeNull()
  expect(r2.sitouts).not.toContain('P0')
  expect(r2.resting).not.toContain('P0')

  // The leaderboard still carries P0's round-1 result.
  await page.getByTestId('tab-leaderboard').click()
  const p0Row = page.locator('[data-testid="leaderboard-row"][data-name="P0"]')
  await expect(p0Row).toBeVisible()
  await expect(p0Row).toHaveAttribute('data-games', '1')
})

test('a mid-session joiner gets a fair share, not benched every round', async ({
  page,
}) => {
  await page.goto('/')
  await addPlayers(page, ['P0', 'P1', 'P2', 'P3', 'P4'])
  await setCourts(page, 1)

  // Hour one: five players, one court — five rounds so sit-outs land evenly.
  for (let r = 1; r <= 5; r++) {
    const data = await playRound(page)
    expect(data.index).toBe(r)
    expect(data.sitouts).toHaveLength(1)
  }

  // A sixth player joins for the back half of the session.
  await addPlayers(page, ['LATE'])

  const sits = new Map<string, number>()
  for (const n of ['P0', 'P1', 'P2', 'P3', 'P4', 'LATE']) sits.set(n, 0)
  for (let r = 6; r <= 11; r++) {
    const data = await playRound(page)
    expect(data.index).toBe(r)
    // Six players, one court -> two benched each round.
    expect(data.sitouts).toHaveLength(2)
    for (const n of data.sitouts) sits.set(n, (sits.get(n) ?? 0) + 1)
  }

  // Twelve sit-outs across six players is two each when even. The late joiner
  // must take a fair share — an unfair system would bench them nearly every
  // round to "catch up" on the hour they were not there for.
  const lateSits = sits.get('LATE') ?? 0
  expect(lateSits).toBeGreaterThanOrEqual(1)
  expect(lateSits).toBeLessThanOrEqual(3)
  const counts = [...sits.values()]
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2)
})
