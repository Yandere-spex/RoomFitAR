import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'xr', {
      configurable: true,
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => { throw new Error('Synthetic XR session intentionally unavailable') },
      },
    })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: /Tracked AR \/ Measure/i })
  await entry.waitFor()
  await page.waitForFunction(() =>
    !document.querySelector('.camera-primary')?.hasAttribute('disabled'), { timeout: 10000 })
  await entry.click()
  await page.getByRole('heading', { name: /See and measure your real room/i }).waitFor()
  const start = page.getByRole('button', { name: /Start tracked room AR/i })
  await start.click()
  await page.getByText(/Could not start tracked AR: Synthetic XR session intentionally unavailable/i).waitFor()
  assert.deepEqual(errors, [])
  console.log('RoomFit: mock-supported XR entry and explicit failure handling passed.')
} finally {
  await browser.close()
}
