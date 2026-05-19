import { expect, type Locator, type Page } from '@playwright/test'

export interface RoundData {
  index: number
  /** courts -> teams -> player names */
  courts: string[][][]
  /** Players the generator benched this round. */
  sitouts: string[]
  /** Players off-court this round by choice. */
  resting: string[]
}

export function getRow(page: Page, name: string): Locator {
  return page.locator(`[data-testid="player-row"][data-name="${name}"]`)
}

export async function addPlayers(page: Page, names: string[]): Promise<void> {
  await page.getByTestId('tab-players').click()
  for (const name of names) {
    await page.getByTestId('player-name-input').fill(name)
    await page.getByTestId('add-player').click()
    await expect(getRow(page, name)).toBeVisible()
  }
}

export async function setCourts(page: Page, count: number): Promise<void> {
  await page.getByTestId('tab-players').click()
  const value = page.getByTestId('court-count-value')
  const current = async () => Number(await value.getAttribute('data-count'))
  while ((await current()) < count) {
    await page.getByTestId('court-count-inc').click()
  }
  while ((await current()) > count) {
    await page.getByTestId('court-count-dec').click()
  }
}

export async function setMode(
  page: Page,
  name: string,
  mode: 'open' | 'locked' | 'pool',
): Promise<void> {
  await getRow(page, name).getByTestId('player-mode').selectOption(mode)
}

export async function setLockedPartner(
  page: Page,
  name: string,
  partnerName: string,
): Promise<void> {
  await getRow(page, name).getByTestId('player-partner').selectOption({ label: partnerName })
}

export async function togglePoolMember(
  page: Page,
  name: string,
  otherName: string,
): Promise<void> {
  await getRow(page, name)
    .locator(`[data-testid="pool-option"][data-name="${otherName}"]`)
    .click()
}

/** Sets a player's resting state, idempotently. */
export async function setResting(
  page: Page,
  name: string,
  resting: boolean,
): Promise<void> {
  await page.getByTestId('tab-players').click()
  const row = getRow(page, name)
  const isResting = (await row.getAttribute('data-status')) === 'resting'
  if (isResting !== resting) {
    await row.getByTestId('player-rest-toggle').click()
  }
  await expect(row).toHaveAttribute('data-status', resting ? 'resting' : 'playing')
}

/** Checks a player out of the session for good. */
export async function checkOutPlayer(page: Page, name: string): Promise<void> {
  await page.getByTestId('tab-players').click()
  const row = getRow(page, name)
  await row.getByTestId('player-checkout').click()
  await expect(row).toHaveAttribute('data-status', 'left')
}

/** Adds 10 players, a locked P0/P1 pair, a pool player P2 with pool {P3,P4}, 2 courts. */
export async function setupConstrainedSession(page: Page): Promise<string[]> {
  const names = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']
  await addPlayers(page, names)
  await setCourts(page, 2)
  await setMode(page, 'P0', 'locked')
  await setLockedPartner(page, 'P0', 'P1')
  await setMode(page, 'P2', 'pool')
  await togglePoolMember(page, 'P2', 'P3')
  await togglePoolMember(page, 'P2', 'P4')
  return names
}

export async function readRound(page: Page): Promise<RoundData> {
  const indexText = await page.getByTestId('round-number').textContent()
  const courtsLoc = page.locator('[data-testid="court"]')
  const courtCount = await courtsLoc.count()
  const courts: string[][][] = []
  for (let c = 0; c < courtCount; c++) {
    const teamsLoc = courtsLoc.nth(c).locator('[data-testid="team"]')
    const teamCount = await teamsLoc.count()
    const teams: string[][] = []
    for (let t = 0; t < teamCount; t++) {
      const attr = (await teamsLoc.nth(t).getAttribute('data-players')) ?? ''
      teams.push(attr.split(',').filter(Boolean))
    }
    courts.push(teams)
  }
  const sitAttr = (await page.getByTestId('sitouts').getAttribute('data-players')) ?? ''
  const restingLoc = page.getByTestId('resting')
  const restAttr =
    (await restingLoc.count()) > 0
      ? ((await restingLoc.getAttribute('data-players')) ?? '')
      : ''
  return {
    index: Number(indexText),
    courts,
    sitouts: sitAttr.split(',').filter(Boolean),
    resting: restAttr.split(',').filter(Boolean),
  }
}

/** Generates one round, reads its assignments, then ends it. */
export async function playRound(page: Page): Promise<RoundData> {
  await page.getByTestId('tab-round').click()
  const generate = page.getByTestId('generate-round')
  await expect(generate).toBeEnabled()
  await generate.click()
  await expect(page.getByTestId('end-round')).toBeVisible()
  const data = await readRound(page)
  await page.getByTestId('end-round').click()
  await expect(page.getByTestId('end-round')).toHaveCount(0)
  return data
}

/** Generates a round, enters per-court [team0, team1] scores, then ends it. */
export async function playRoundWithScores(
  page: Page,
  plan: number[][],
): Promise<RoundData> {
  await page.getByTestId('tab-round').click()
  const generate = page.getByTestId('generate-round')
  await expect(generate).toBeEnabled()
  await generate.click()
  await expect(page.getByTestId('end-round')).toBeVisible()
  const data = await readRound(page)
  const courts = page.locator('[data-testid="court"]')
  for (let c = 0; c < plan.length; c++) {
    const teams = courts.nth(c).locator('[data-testid="team"]')
    for (let t = 0; t < 2; t++) {
      await teams.nth(t).getByTestId('score-input').fill(String(plan[c][t]))
    }
  }
  await page.getByTestId('end-round').click()
  await expect(page.getByTestId('end-round')).toHaveCount(0)
  return data
}

/** Returns the 2-player team containing `name`, or null if the player sat out. */
export function findTeam(data: RoundData, name: string): string[] | null {
  for (const court of data.courts) {
    for (const team of court) {
      if (team.includes(name)) return team
    }
  }
  return null
}
