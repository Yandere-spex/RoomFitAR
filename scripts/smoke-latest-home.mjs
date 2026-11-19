import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const base = process.env.ROOMFIT_PUBLIC_URL ??
  'https://yandere-spex.github.io/RoomFitAR/'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))

  // The public root must open the *newest* tracked-furniture experience,
  // not the original untracked Camera Studio.
  await page.goto(new URL('?release=v0.7-tracked', base).href, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForURL(/\/RoomFitAR\/slam-lab\.html(?:\?|$)/, {
    timeout: 15000,
  })
  assert.match(await page.title(), /RoomFit \| See Furniture in Your Room/)
  await page.getByRole('heading', {
    name: 'See furniture in your room.',
  }).waitFor()
  assert.equal(await page.locator('#place-furniture').count(), 1)
  assert.equal(await page.locator('#done-view').count(), 1)
  assert.equal(await page.locator('#resume-edit').count(), 1)
  await page.getByRole('link', { name: 'Open manual camera preview' }).waitFor()
  console.log('PUBLIC ROOT: redirected to the friendly RoomFit camera, furniture + Done + editing controls present.')

  // Explicit fallback should NOT redirect back into the tracked experiment.
  await page.goto(new URL('?studio=1&release=v0.7-tracked', base).href, {
    waitUntil: 'domcontentloaded',
  })
  assert.ok(new URL(page.url()).searchParams.has('studio'))
  await page.getByRole('button', {
    name: /Open Furniture Camera/,
  }).waitFor({ timeout: 15000 })
  console.log('MANUAL FALLBACK: older Camera Studio is available only when requested.')

  assert.deepEqual(errors, [], 'No script errors')
  console.log('RoomFit latest public homepage routing passed.')
} finally {
  await browser.close()
}
