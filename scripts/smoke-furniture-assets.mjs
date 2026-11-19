import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const ids = [
  'wooden-stool', 'monobloc-chair', 'gallinera-chair', 'gallinera-table', 'papasan-chair', 'woven-rocker', 'accent-chair', 'lounge-chair',
  'compact-wood-table', 'round-coffee-table', 'velvet-sofa', 'sofa-linen',
]
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    window.XR8 = {
      GlTextureRenderer: { pipelineModule: () => ({ name: 'mock-camera' }) },
      Threejs: { pipelineModule: () => ({ name: 'mock-three' }) },
      XrController: {
        configure: () => {},
        pipelineModule: () => ({ name: 'mock-tracking' }),
      },
      addCameraPipelineModules: () => {},
      run: () => {},
    }
  })
  const page = await context.newPage()
  const errors = []
  const missing = []
  page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message) })
  page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE ERROR', message.text()) })
  page.on('requestfailed', request => console.log('REQUEST FAILED', request.url(), request.failure()?.errorText))
  page.on('requestfinished', request => {
    if (request.url().includes('/models/')) console.log('ASSET REQUEST', request.url().split('/').slice(-2).join('/'))
  })
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/models/')) {
      missing.push(response.status() + ': ' + response.url())
    }
  })
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, route =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await page.goto(new URL('slam-lab.html', process.env.ROOMFIT_TEST_URL ?? 'http://127.0.0.1:5173/').toString())
  await page.getByRole('button', { name: 'Start Camera' }).click()
  assert.equal(await page.locator('.lab-furniture-card').count(), ids.length)

  const authoritativeSourceSizes = {
    'wooden-stool': [0.265, 0.182, 0.183],
    'monobloc-chair': [0.642, 0.880, 0.628],
    'lounge-chair': [1.009, 1.169, 1.190],
    'compact-wood-table': [0.916, 0.533, 0.440],
    'round-coffee-table': [1.301, 0.491, 1.301],
    'gallinera-chair': [0.581, 1.034, 0.604],
    'gallinera-table': [0.830, 0.488, 0.518],
    'papasan-chair': [1.18, 0.71, 1.18],
    'woven-rocker': [0.78, 1.01, 1.14],
  }
  for (const id of ids) {
    await page.locator('.lab-furniture-card[data-product-id="' + id + '"]').click()
    try {
      await page.waitForFunction((modelId) =>
        document.getElementById('asset-status')?.dataset.readyId === modelId,
        id, { timeout: 45000 })
    } catch {
      const current = await page.locator('#asset-status').textContent()
      const error = await page.locator('#failure-live').textContent()
      throw Error('Asset ' + id + ' did not become Ready. Current status: ' + current + '; error: ' + error)
    }
    const display = await page.locator('#selected-size').textContent()
    assert.ok(display.includes(' cm wide'), 'Missing readable model dimensions for ' + id)
    const dimensions = JSON.parse(await page.locator('#asset-status').getAttribute('data-actual-meters'))
    assert.equal(dimensions.length, 3)
    if (authoritativeSourceSizes[id]) {
      const expected = authoritativeSourceSizes[id]
      const errors = dimensions.map((value, axis) => Math.abs(value - expected[axis]) / expected[axis])
      assert.ok(Math.max(...errors) < 0.04, id + ' is not within 4% of the source-model dimensions: ' + JSON.stringify({dimensions, expected, errors}))
    }
    console.log('Ready:', id, display, 'rendered:', dimensions.map(n => n.toFixed(3)).join(' × '))
  }

  await page.locator('#catalog-filters button', { hasText: 'Filipino styles' }).click()
  assert.equal(await page.locator('.lab-furniture-card').count(), 4)
  await page.locator('#catalog-filters button', { hasText: 'Tables' }).click()
  assert.equal(await page.locator('.lab-furniture-card').count(), 3)
  await page.locator('#catalog-filters button', { hasText: 'All' }).click()
  assert.equal(await page.locator('.lab-furniture-card').count(), ids.length)
  assert.equal(await page.getByRole('button', { name: 'Place Furniture' }).isEnabled(), false)
  const width = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    visibleWidth: document.documentElement.clientWidth,
  }))
  assert.ok(width.pageWidth <= width.visibleWidth, 'Unexpected horizontal page overflow: ' + JSON.stringify(width))
  assert.deepEqual(missing, [], 'No missing model resources')
  assert.deepEqual(errors, [], 'No browser script errors')
  console.log('RoomFit: all ' + ids.length + ' furniture assets loaded, source dimensions, filters and 390px layout passed.')
} finally { await browser.close() }
