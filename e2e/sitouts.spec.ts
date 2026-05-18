import { test, expect } from '@playwright/test'
import { addPlayers, playRound, setCourts } from './helpers'

test('sit-outs stay within a spread of 1 over 5 rounds', async ({ page }) => {
  await page.goto('/')

  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']
  await addPlayers(page, names)
  await setCourts(page, 2)

  const sitCount = new Map<string, number>()
  for (const name of names) sitCount.set(name, 0)

  for (let round = 1; round <= 5; round++) {
    const data = await playRound(page)
    expect(data.index).toBe(round)
    // 10 players, 2 courts -> exactly 2 sit out each round.
    expect(data.sitouts).toHaveLength(2)
    for (const name of data.sitouts) {
      sitCount.set(name, (sitCount.get(name) ?? 0) + 1)
    }
  }

  const counts = [...sitCount.values()]
  const spread = Math.max(...counts) - Math.min(...counts)
  expect(spread).toBeLessThanOrEqual(1)
})

test('nobody sits out two rounds in a row over 8 rounds', async ({ page }) => {
  await page.goto('/')

  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']
  await addPlayers(page, names)
  await setCourts(page, 2)

  // 10 players, 2 courts -> 2 sit each round, leaving 8 fresh players, so a
  // back-to-back sit-out is never forced.
  let previous: string[] = []
  for (let round = 1; round <= 8; round++) {
    const data = await playRound(page)
    expect(data.index).toBe(round)
    for (const name of data.sitouts) {
      expect(previous, `${name} sat out two rounds in a row`).not.toContain(name)
    }
    previous = data.sitouts
  }
})
