import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  // The SDK is mocked only for a browser-level UI test, not for a real tracking test.
  await ctx.addInitScript(() => {
    window.XR8 = {
      GlTextureRenderer: { pipelineModule: () => ({ name: 'mock-camera-feed' }) },
      Threejs: { pipelineModule: () => ({ name: 'mock-three' }) },
      XrController: {
        configure: (opts) => { window.__xrConfiguration = opts },
        pipelineModule: () => ({ name: 'mock-slam' }),
      },
      addCameraPipelineModules: (modules) => { window.__xrModules = modules },
      run: ({ canvas }) => {
        window.__xrRunCalled = Boolean(canvas)
      },
    }
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  // Avoid loading an actual SLAM implementation in a headless browser.
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  const url = process.env.ROOMFIT_TEST_URL ?? 'http://127.0.0.1:5173/'
  await page.goto(new URL('slam-lab.html', url).toString(), { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Test furniture that stays in the room/i }).waitFor()
  const start = page.getByRole('button', { name: 'Start 8th Wall SLAM test' })
  assert.equal(await start.isEnabled(), true)
  await start.click()
  const info = await page.evaluate(() => ({
    configured: window.__xrConfiguration?.scale,
    worldTracking: window.__xrConfiguration?.disableWorldTracking,
    ran: window.__xrRunCalled,
    modules: window.__xrModules?.map(m => m.name),
  }))
  assert.equal(info.configured, 'absolute')
  assert.equal(info.worldTracking, false)
  assert.equal(info.ran, true)
  assert.ok(info.modules.includes('roomfit-slam-test'))
  await page.getByRole('button', { name: 'Place sofa on floor' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Place sofa on floor' }).isEnabled(), false)
  await page.screenshot({ path: 'scripts/mobile-slam-lab-shell.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('RoomFit SLAM lab: separate page, engine configuration, UI guard and no script errors passed (SDK mocked; real tracking not tested).')
} finally { await browser.close() }
