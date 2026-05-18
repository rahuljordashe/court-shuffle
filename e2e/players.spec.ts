import { test, expect } from '@playwright/test'
import { addPlayers, getRow, setLockedPartner, setMode, togglePoolMember } from './helpers'

test('players and constraints persist across a page reload', async ({ page }) => {
  await page.goto('/')

  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']
  await addPlayers(page, names)
  await expect(page.getByTestId('player-row')).toHaveCount(10)

  // One Locked pair: P0 <-> P1.
  await setMode(page, 'P0', 'locked')
  await setLockedPartner(page, 'P0', 'P1')

  // One Pool player with a 2-player pool: P2 may partner P3 or P4.
  await setMode(page, 'P2', 'pool')
  await togglePoolMember(page, 'P2', 'P3')
  await togglePoolMember(page, 'P2', 'P4')

  // Locking P0 to P1 is bidirectional.
  await expect(getRow(page, 'P0')).toHaveAttribute('data-mode', 'locked')
  await expect(getRow(page, 'P1')).toHaveAttribute('data-mode', 'locked')
  await expect(getRow(page, 'P0')).toHaveAttribute('data-partner', 'P1')
  await expect(getRow(page, 'P1')).toHaveAttribute('data-partner', 'P0')

  await page.reload()

  // Everything survives the reload via persisted localStorage state.
  await expect(page.getByTestId('player-row')).toHaveCount(10)
  for (const name of names) {
    await expect(getRow(page, name)).toBeVisible()
  }

  await expect(getRow(page, 'P0')).toHaveAttribute('data-mode', 'locked')
  await expect(getRow(page, 'P0')).toHaveAttribute('data-partner', 'P1')
  await expect(getRow(page, 'P1')).toHaveAttribute('data-mode', 'locked')
  await expect(getRow(page, 'P1')).toHaveAttribute('data-partner', 'P0')

  await expect(getRow(page, 'P2')).toHaveAttribute('data-mode', 'pool')
  const pool = (await getRow(page, 'P2').getAttribute('data-pool')) ?? ''
  expect(pool.split(',').filter(Boolean).sort()).toEqual(['P3', 'P4'])

  // The remaining players stay Open.
  for (const name of ['P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']) {
    await expect(getRow(page, name)).toHaveAttribute('data-mode', 'open')
  }
})
