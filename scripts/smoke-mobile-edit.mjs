import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const address = new URL('slam-lab.html',
  process.env.ROOMFIT_TEST_URL ?? 'http://127.0.0.1:5173/').toString()

try {
  for (const [width, height] of [[320, 568], [360, 640], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true,
      deviceScaleFactor: 1, hasTouch: true })
    await context.addInitScript(() => {
      let module
      let camera
      window.XR8 = {
        GlTextureRenderer: { pipelineModule: () => ({ name: 'mock-feed' }) },
        Threejs: {
          pipelineModule: () => ({ name: 'mock-three' }),
          xrScene: () => {
            const T = window.THREE
            camera = new T.PerspectiveCamera(70, 1, .01, 30)
            const scene = new T.Scene()
            window.__mockScene = scene
            window.__mockCamera = camera
            return { camera, scene, renderer: { shadowMap: { enabled: false, type: 0 }, outputColorSpace: '' } }
          },
        },
        XrController: { pipelineModule: () => ({ name: 'mock-tracker' }),
          configure: () => {}, updateCameraProjectionMatrix: () => {}, recenter: () => {} },
        addCameraPipelineModules: list => { module = list.find(m => m.name === 'roomfit-slam-test') },
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
    const pageErrors = []
    page.on('pageerror', err => pageErrors.push(err.message))
    await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, r =>
      r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    await page.goto(address)
    await page.getByRole('heading', { name: 'See furniture in your room.' }).waitFor()
    assert.equal(await page.locator('#lab-instructions').isVisible(), true)
    assert.equal(await page.locator('#lab-controls').isVisible(), false)
    const welcomeBounds = await page.locator('#lab-instructions').boundingBox()
    assert.ok(welcomeBounds.x >= 0 && welcomeBounds.x + welcomeBounds.width <= width,
      'welcome card must fit narrow mobile screens')
    assert.ok(welcomeBounds.y + welcomeBounds.height <= height + 3,
      'welcome card must remain within the viewport')
    await page.locator('#help-panel summary').click()
    await page.getByRole('heading', { name: 'How to use RoomFit' }).waitFor()
    await page.locator('#help-panel summary').click()
    await page.getByRole('button', { name: 'Start Camera' }).click()
    assert.equal(await page.locator('#advanced-options').evaluate(el => el.open), false,
      'advanced settings should be collapsed by default')
    await page.waitForFunction(() =>
      document.getElementById('asset-status')?.dataset.readyId === 'wooden-stool')

    const steady = async () => {
      for (let i = 0; i < 11; i++) {
        await page.evaluate(() => window.__fakeFrame())
        await page.waitForTimeout(58)
      }
    }
    // No 0.4-second target hold: the first valid tracked frame enables placement.
    await page.evaluate(() => window.__fakeFrame())
    assert.equal(await page.locator('#place-furniture').isEnabled(), true,
      'immediate floor hit should enable placement without waiting')
    await page.locator('#place-furniture').click()
    assert.equal(await page.locator('#lab-quickbar').isVisible(), true, 'compact bar should be visible')
    const quick = page.locator('#lab-quickbar')
    const allButtons = [
      '#quick-place', '#quick-move', '#quick-rotate-left', '#quick-rotate-right',
      '#quick-undo', '#quick-remove', '#quick-select-next', '#show-options',
    ]
    for (const id of allButtons) {
      assert.equal(await quick.locator(id).count(), 1, 'missing mobile editing action: ' + id)
    }
    const meshInfo = async () => page.evaluate(() => {
      const item = window.__mockScene.children.find(o => o.userData?.productId === 'wooden-stool')
      return item ? { x: item.position.x, z: item.position.z, yaw: item.rotation.y,
        scale: [item.scale.x, item.scale.y, item.scale.z] } : null
    })
    const original = await meshInfo()
    assert.ok(original, 'selected furniture should be present')
    await page.locator('#quick-rotate-right').click()
    const rotated = await meshInfo()
    assert.ok(rotated.yaw - original.yaw > 0.26, 'quick rotation must update model orientation')
    assert.deepEqual(rotated.scale, original.scale, 'rotation must not alter physical size')
    await page.locator('#quick-rotate-left').click()

    // Simulate a different stable camera direction / new floor target.
    await page.evaluate(() => {
      window.__mockCamera.lookAt(.65, 0, 0)
      window.__mockCamera.updateMatrixWorld(true)
    })
    await steady()
    assert.equal(await page.locator('#quick-move').isEnabled(), true)
    await page.locator('#quick-move').click()
    const moved = await meshInfo()
    assert.ok(moved.x > original.x + .3, 'move-to-target must change world position')
    assert.deepEqual(moved.scale, original.scale, 'position edit must not change model scale')

    // Tapping on the 3D furniture must select it; dragging updates floor X/Z only.
    const hit = await page.evaluate(() => {
      const T = window.THREE
      const item = window.__mockScene.children.find(o => o.userData?.productId === 'wooden-stool')
      const camera = window.__mockCamera
      const canvas = document.getElementById('camerafeed')
      const rect = canvas.getBoundingClientRect()
      const ray = new T.Raycaster()
      for (let dy = -60; dy <= 60; dy += 6) {
        for (let dx = -60; dx <= 60; dx += 6) {
          const x = rect.left + rect.width/2 + dx
          const y = rect.top + rect.height/2 + dy
          const ndc = new T.Vector2(((x-rect.left)/rect.width)*2-1,
            -((y-rect.top)/rect.height)*2+1)
          camera.updateMatrixWorld(true)
          ray.setFromCamera(ndc, camera)
          if (ray.intersectObject(item, true).length > 0) return { x, y }
        }
      }
      return null
    })
    if (hit) {
      const dragged = await page.evaluate(({ x, y }) => {
        const canvas = document.getElementById('camerafeed')
        const item = window.__mockScene.children.find(o => o.userData?.productId === 'wooden-stool')
        const before = item.position.x
        const emit = (kind, cx, cy) => canvas.dispatchEvent(
          new PointerEvent(kind, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: cx, clientY: cy }))
        emit('pointerdown', x, y)
        emit('pointermove', x + 36, y)
        emit('pointerup', x + 36, y)
        return { before, after: item.position.x, height: item.position.y }
      }, hit)
      assert.ok(Math.abs(dragged.after - dragged.before) > .05, 'touch drag did not move object')
      assert.equal(dragged.height, 0, 'touch movement must stay on the floor')
    } else {
      throw Error('Unable to find clickable world-space mesh pixels for furniture touch selection')
    }

    // Done switches to camera inspection: no tap-to-place, drag, rotation
    // or world-space rescaling while moving the phone around the object.
    const locked = await meshInfo()
    await page.locator('#done-view').click()
    assert.equal(await page.locator('#lab-quickbar').isVisible(), false)
    assert.equal(await page.locator('#lab-viewbar').isVisible(), true)
    assert.equal(await page.locator('#lab-controls').isVisible(), false)
    await page.evaluate(() => {
      window.__mockCamera.position.set(.35, 1.8, 3.1)
      window.__mockCamera.lookAt(.65, 0, 0)
      window.__mockCamera.updateMatrixWorld(true)
      window.__fakeFrame()
      const canvas = document.getElementById('camerafeed')
      canvas.dispatchEvent(new PointerEvent('pointerdown',
        { bubbles: true, pointerId: 15, clientX: 80, clientY: 180 }))
      canvas.dispatchEvent(new PointerEvent('pointerup',
        { bubbles: true, pointerId: 15, clientX: 80, clientY: 180 }))
    })
    assert.deepEqual(await meshInfo(), locked,
      'camera walkaround must preserve furniture world position, yaw and size')
    assert.match(await page.locator('#sofa-state').textContent(), /1 placed/,
      'camera inspection should not create extra objects')
    await page.locator('#resume-edit').click()
    assert.equal(await page.locator('#lab-viewbar').isVisible(), false)
    assert.equal(await page.locator('#lab-quickbar').isVisible(), true)
    // Switch from compact to full menu and verify all controls can be reached
    // on narrow/short screens, including actions below the initial scroll.
    await page.locator('#show-options').click()
    await page.locator('#advanced-options summary').click()
    const ids = ['#rotate-left', '#rotate-right', '#move-selected', '#remove-selected',
      '#reset-sofa', '#recenter', '#export-log', '#select-next']
    for (const id of ids) {
      const locator = page.locator('#lab-controls ' + id)
      await locator.scrollIntoViewIfNeeded()
      assert.equal(await locator.isVisible(), true, 'full menu control inaccessible ' + id)
    }
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      compactMax: getComputedStyle(document.getElementById('lab-quickbar')).maxHeight,
      fullScroll: document.getElementById('lab-controls').scrollHeight,
      fullClient: document.getElementById('lab-controls').clientHeight,
    }))
    assert.ok(overflow.scrollW <= overflow.clientW, width + 'px page has horizontal overflow')
    assert.ok(overflow.fullClient > 50 && overflow.fullScroll >= overflow.fullClient)
    await page.locator('#collapse-panel').click()
    await page.locator('#quick-remove').click()
    assert.match(await page.locator('#sofa-state').textContent(), /None placed/)
    assert.deepEqual(pageErrors, [], 'runtime errors for ' + width + 'px')
    console.log('RoomFit mobile UI:', width + 'x' + height,
      'quick rotate, move, touch drag, Done walkaround, edit resume and accessible controls OK')
    await context.close()
  }
} finally {
  await browser.close()
}
