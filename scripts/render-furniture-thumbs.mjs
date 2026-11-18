import fs from 'node:fs'
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
})
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } })
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//, r => r.fulfill({
    status: 200, contentType: 'text/javascript', body: '',
  }))
  await page.goto('http://127.0.0.1:5173/slam-lab.html', { waitUntil: 'networkidle' })
  for (const id of ['papasan-chair', 'woven-rocker']) {
    const data = await page.evaluate(async modelId => {
      const THREE = window.THREE
      const models = await import('/src/ar/furnitureModels.ts')
      const domain = await import('/src/domain/catalog.ts')
      const furniture = await models.createFurnitureAsset(domain.catalogById[modelId])
      const bounds = new THREE.Box3().setFromObject(furniture)
      const size = bounds.getSize(new THREE.Vector3())
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
      renderer.setSize(320, 320)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.setClearColor('#eff2ec', 1)
      const scene = new THREE.Scene()
      scene.add(new THREE.HemisphereLight(0xffffff, 0x718078, 2.8))
      const light = new THREE.DirectionalLight(0xffffff, 2.4)
      light.position.set(3, 5, 4)
      scene.add(light)
      scene.add(furniture)
      const camera = new THREE.PerspectiveCamera(38, 1, .05, 100)
      const radius = Math.max(size.x, size.y, size.z)
      camera.position.set(radius * 1.6, radius * 1.3, radius * 2.1)
      camera.lookAt(0, size.y / 2, 0)
      renderer.render(scene, camera)
      const uri = renderer.domElement.toDataURL('image/webp', .87)
      renderer.dispose()
      return uri
    }, id)
    if (!data.startsWith('data:image/webp;base64,')) throw Error('Invalid WebP render for ' + id)
    const bytes = Buffer.from(data.slice('data:image/webp;base64,'.length), 'base64')
    const out = 'public/models/thumbs/' + id + '.webp'
    fs.writeFileSync(out, bytes)
    console.log('Saved', out, bytes.length)
  }
} finally {
  await browser.close()
}
