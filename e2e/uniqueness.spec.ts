import { test, expect } from '@playwright/test'
import { addPlayers, playRound, setCourts } from './helpers'

test('8 open players each meet at least 4 distinct partners over 5 rounds', async ({ page }) => {
  await page.goto('/')

  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
  await addPlayers(page, names)
  await setCourts(page, 2)

  const partners = new Map<string, Set<string>>()
  for (const name of names) partners.set(name, new Set())

  for (let round = 1; round <= 5; round++) {
    const data = await playRound(page)
    expect(data.index).toBe(round)
    for (const court of data.courts) {
      for (const team of court) {
        const [a, b] = team
        partners.get(a)!.add(b)
        partners.get(b)!.add(a)
      }
    }
  }

  for (const name of names) {
    expect(partners.get(name)!.size).toBeGreaterThanOrEqual(4)
  }
})
