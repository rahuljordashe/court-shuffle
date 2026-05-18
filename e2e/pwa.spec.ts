import { test, expect } from '@playwright/test'

test('manifest is served with the expected fields', async ({ page }) => {
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBeTruthy()

  const manifest = await response.json()
  expect(manifest.name).toBe('Court Shuffle')
  expect(manifest.short_name).toBeTruthy()
  expect(manifest.display).toBe('standalone')
  expect(manifest.theme_color).toBeTruthy()
  expect(manifest.start_url).toBeTruthy()
  expect(Array.isArray(manifest.icons)).toBeTruthy()
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    expect(icon.src).toBeTruthy()
    expect(icon.sizes).toBeTruthy()
  }
})

test('service worker registers and the app shell loads offline', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-title')).toBeVisible()

  // The service worker installs and activates.
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false
      const registration = await navigator.serviceWorker.ready
      return Boolean(registration.active)
    },
    null,
    { timeout: 30_000 },
  )

  // It claims the page so it can serve subsequent navigations.
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
    timeout: 30_000,
  })

  // With the network disabled the cached app shell still loads.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('app-title')).toBeVisible()
  await expect(page.getByTestId('tab-players')).toBeVisible()
  await expect(page.getByTestId('tab-round')).toBeVisible()
  await context.setOffline(false)
})
