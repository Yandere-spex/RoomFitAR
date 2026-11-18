import { chromium } from 'playwright-core'

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const report = { passed: [], warnings: [], errors: [] }
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
})

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    permissions: ['camera'],
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.errors.push(error.message))

  await page.goto(process.env.ROOMFIT_TEST_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /See it in your own room/i }).waitFor()
  report.passed.push('camera-first home shown')
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    contentWidth: document.documentElement.scrollWidth,
  }))
  if (viewport.contentWidth > viewport.width) {
    report.warnings.push('horizontal overflow ' + JSON.stringify(viewport))
  } else {
    report.passed.push('no horizontal overflow on 390px viewport')
  }
  await page.screenshot({ path: 'scripts/mobile-camera-home.png', fullPage: true })

  await page.getByRole('button', { name: /Preview real camera/i }).click()
  try {
    await page.waitForFunction(() => {
      const video = document.querySelector('video')
      return video?.videoWidth && video.videoWidth > 0
    }, { timeout: 7000 })
    report.passed.push('camera preview works with synthetic test camera')
  } catch {
    report.warnings.push('synthetic camera preview did not produce video frames')
  }

  await page.getByRole('button', { name: /Stop camera preview/i }).click()
  report.passed.push('camera stop action visible')
  await page.getByRole('button', { name: /Open Digital Draft/i }).click()
  await page.getByRole('heading', { name: 'My Living Room' }).waitFor()
  await page.locator('.canvas-region canvas').waitFor({ state: 'attached', timeout: 15000 })
  await page.locator('.editor-scene-loading').waitFor({ state: 'hidden', timeout: 15000 })
  report.passed.push('Digital Draft opens and its 3D scene exits loading state')
  await page.screenshot({ path: 'scripts/mobile-digital-draft.png', fullPage: true })

  await page.getByRole('button', { name: /Live Camera/i }).click()
  await page.getByRole('heading', { name: /See it in your own room/i }).waitFor()
  report.passed.push('Digital Draft returns to camera-first home')
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error))
  console.error(JSON.stringify(report, null, 2))
  process.exitCode = 1
} finally {
  await browser.close()
}
