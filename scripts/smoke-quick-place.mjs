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
    let module
    let camera
    window.XR8 = {
      GlTextureRenderer: { pipelineModule: () => ({ name: 'mock-frame' }) },
      Threejs: {
        pipelineModule: () => ({ name: 'mock-three' }),
        xrScene: () => {
          const T = window.THREE
          camera = new T.PerspectiveCamera(70, 1, .01, 30)
          const scene = new T.Scene()
          return { camera, scene, renderer: { shadowMap: { enabled: false, type: 0 }, outputColorSpace: '' } }
        },
      },
      XrController: {
        pipelineModule: () => ({ name: 'mock-slam' }),
        configure: () => {},
        updateCameraProjectionMatrix: () => {},
        recenter: () => {},
      },
      addCameraPipelineModules: modules => { module = modules.find(m => m.name === 'roomfit-slam-test') },
      run: ({ canvas }) => {
        module.onStart({ canvas })
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld(true)
        window.__fakeFrame = () => module.onUpdate({ processCpuResult: {
          reality: { trackingStatus: 'NORMAL', position: { x: 0, y: 1.6, z: 2 } },
        } })
      },
    }
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, r =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
  await page.goto(new URL('slam-lab.html', process.env.ROOMFIT_TEST_URL ??
    'http://127.0.0.1:5173/').toString())
  await page.getByRole('button', { name: 'Start Camera' }).click()
  await page.waitForFunction(() =>
    document.getElementById('asset-status')?.dataset.readyId === 'wooden-stool')

  for (let i = 0; i < 13; i++) {
    await page.evaluate(() => window.__fakeFrame())
    await page.waitForTimeout(60)
  }
  await page.getByRole('button', { name: 'Place Furniture' }).waitFor()
  assert.ok(await page.getByRole('button', { name: 'Place Furniture' }).isEnabled(),
    'stable synthetic floor should enable place')
  await page.getByRole('button', { name: 'Place Furniture' }).click()
  assert.equal(await page.locator('#lab-controls').isVisible(), false)
  assert.equal(await page.locator('#lab-quickbar').isVisible(), true)
  assert.match(await page.locator('#sofa-state').textContent(), /1 placed/)
  await page.getByRole('button', { name: 'Undo last' }).click()
  assert.match(await page.locator('#sofa-state').textContent(), /None placed/)
  await page.getByRole('button', { name: 'Change Piece' }).click()
  assert.equal(await page.locator('#lab-controls').isVisible(), true)
  await page.locator('[data-product-id="papasan-chair"]').click()
  await page.waitForFunction(() =>
    document.getElementById('asset-status')?.dataset.readyId === 'papasan-chair')
  await page.getByRole('button', { name: 'Hide furniture options' }).click()
  assert.match(await page.locator('#quick-selected').textContent(), /Papasan/)
  assert.ok(await page.getByRole('button', { name: 'Add Another' }).isEnabled())
  await page.evaluate(() => {
    const el = document.getElementById('camerafeed')
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 170, clientY: 315 }))
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 170, clientY: 315 }))
  })
  assert.match(await page.locator('#sofa-state').textContent(), /Papasan/)
  assert.deepEqual(errors, [])
  console.log('RoomFit: synthetic stable tracking enabled placement; auto-compact, undo, catalog change and tap-to-place passed.')
} finally {
  await browser.close()
}
