import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    permissions: ['camera'], acceptDownloads: true,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.ROOMFIT_TEST_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Open Furniture Camera/i }).click()
  await page.getByText('RoomFit Camera Studio').waitFor()
  await page.getByText('● LIVE REAR CAMERA').waitFor({ timeout: 15000 })
  await page.locator('.studio-three canvas').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /Accent chair/i }).click()
  await page.getByRole('button', { name: 'Move', exact: true }).click()
  await page.getByRole('button', { name: /Larger/i }).click()
  await page.getByRole('button', { name: /\+15°/i }).click()
  await page.getByRole('button', { name: /Save layout/i }).click()
  await page.getByText(/Visual layout saved on this browser/i).waitFor()
  await page.screenshot({ path: 'scripts/mobile-camera-studio.png', fullPage: true })
  const downloadPromise = page.waitForEvent('download', {timeout: 12000})
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  const downloaded = await downloadPromise
  assert.ok(downloaded.suggestedFilename().endsWith('.png'))
  const horizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)
  assert.equal(horizontalOverflow, false, 'mobile has horizontal overflow')
  assert.deepEqual(errors, [], 'no page runtime errors')
  console.log('RoomFit: manual camera + textured 3D studio, furniture controls, local save, photo capture, 390px layout passed.')
  await page.getByRole('button', { name: /Back to RoomFit home/i }).click()
  await page.getByRole('heading', { name: /See it in your own room/i }).waitFor()
} finally {
  await browser.close()
}
