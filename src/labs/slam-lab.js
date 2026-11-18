import * as THREE from 'three'
import { createFloorAimTracker } from './floorAimTracker'
import { arPreviewProducts, createFurnitureAsset, hasSourceMetricDimensions } from '../ar/furnitureModels'
import { catalogById } from '../domain/catalog'
import './slam-lab.css'

// Separate R&D experiment: no DOM camera-video overlay or fabricated camera poses.
// World-tracking engine is loaded as the official, unmodified distribution via CDN.
// No images or camera frames are recorded by this page.
window.THREE = THREE

const el = (id) => document.getElementById(id)
const start = el('start-tracking')
const place = el('place-furniture')
const rotateLeft = el('rotate-left')
const rotateRight = el('rotate-right')
const clear = el('reset-sofa')
const exportLog = el('export-log')
const quickPlace = el('quick-place')
const quickUndo = el('quick-undo')
const optionsPanel = el('lab-controls')
const quickBar = el('lab-quickbar')
const floorRay = new THREE.Raycaster()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitPoint = new THREE.Vector3()
const screenCenter = new THREE.Vector2(0, 0)
const errorBox = el('failure')
const liveErrorBox = el('failure-live')
const engineLog = []
const state = {
  running: false,
  tracking: 'UNAVAILABLE',
  cameraStatus: 'unknown',
  scene: null,
  camera: null,
  renderer: null,
  selectedId: 'wooden-stool',
  modelTemplates: new Map(),
  placed: [],
  reticle: null,
  placementPoint: null,
  aimTracker: createFloorAimTracker(),
  compact: false,
  origin: null,
  previous: null,
  cumulative: 0,
  loggedAt: 0,
  stopped: false,
}
const LIMIT = 700
const fmt = (v) => Number.isFinite(v) ? Number(v.toFixed(3)) : null
const log = (name, details = {}) => {
  engineLog.push({ at: new Date().toISOString(), event: name, ...details })
  if (engineLog.length > LIMIT) engineLog.shift()
}
const display = (status, description, good = false) => {
  if (el('tracking-status').textContent !== status) el('tracking-status').textContent = status
  if (el('tracking-description').textContent !== description) el('tracking-description').textContent = description
  el('tracking-dot').classList.toggle('good', good)
}
const message = (text) => {
  for (const box of [errorBox, liveErrorBox]) {
    box.hidden = false
    box.textContent = text
  }
  if (state.running && state.compact) setCompact(false)
  log('error', { text })
}
window.addEventListener('error', (e) => log('javascript-error', { text: e.message }))
window.addEventListener('unhandledrejection', (e) => log('promise-error', { text: String(e.reason) }))

const sourceModelText = (id) => hasSourceMetricDimensions(id)
  ? 'Original 3D model dimensions in meters; visual AR scale requires phone verification.'
  : 'Sample showcase scale is provisional. Check manufacturer measurements.'

const dimensionText = (id) => {
  const d = catalogById[id].dimensions
  return 'Size: ' + d.width.toFixed(2) + ' m wide × ' +
    d.depth.toFixed(2) + ' m deep × ' + d.height.toFixed(2) + ' m high'
}

function displayRenderedSize(id, model) {
  if (state.selectedId !== id) return
  const [width, height, depth] = model.userData.modelSizeMeters
  el('selected-size').textContent = 'Rendered: ' + width.toFixed(2) + ' m wide × ' +
    depth.toFixed(2) + ' m deep × ' + height.toFixed(2) + ' m high'
}

function updatePlacementAvailability() {
  const enabled = state.running && state.tracking === 'NORMAL' &&
    state.modelTemplates.has(state.selectedId) &&
    state.placementPoint !== null &&
    state.placed.length < 8
  place.disabled = !enabled
  quickPlace.disabled = !enabled
}

function updatePlacedControls() {
  const total = state.placed.length
  const has = total > 0
  clear.disabled = !has
  quickUndo.disabled = !has
  rotateLeft.disabled = !has
  rotateRight.disabled = !has
  el('sofa-state').textContent = has
    ? total + ' placed · last: ' + catalogById[state.placed.at(-1).productId].name
    : 'None placed'
}

async function prepareAsset(id) {
  if (!catalogById[id]) return
  state.selectedId = id
  el('selected-name').textContent = catalogById[id].name
  el('selected-size').textContent = dimensionText(id)
  el('selected-provenance').textContent = sourceModelText(id)
  renderCatalog()
  el('quick-selected').textContent = catalogById[id].name
  try { localStorage.setItem('roomfit:last-tracked-furniture', id) } catch { /* storage optional */ }
  el('asset-status').dataset.readyId = ''
  el('asset-status').dataset.actualMeters = ''
  if (state.modelTemplates.has(id)) {
    el('asset-status').textContent = 'Ready'
    el('asset-status').dataset.readyId = id
    el('asset-status').dataset.actualMeters = JSON.stringify(state.modelTemplates.get(id).userData.modelSizeMeters)
    displayRenderedSize(id, state.modelTemplates.get(id))
    updatePlacementAvailability()
    return
  }
  el('asset-status').textContent = 'Loading textured model…'
  try {
    // Load only a chosen model, not the entire collection into phone memory.
    const model = await createFurnitureAsset(catalogById[id])
    state.modelTemplates.set(id, model)
    log('model-loaded', {
      productId: id,
      modelSizeMeters: model.userData.modelSizeMeters,
      provenance: model.userData.scaleEvidence,
    })
    if (state.selectedId === id) {
      el('asset-status').textContent = 'Ready'
      el('asset-status').dataset.readyId = id
      el('asset-status').dataset.actualMeters = JSON.stringify(model.userData.modelSizeMeters)
      displayRenderedSize(id, model)
    }
  } catch (error) {
    log('model-error', { productId: id, message: error?.message ?? String(error) })
    if (state.selectedId === id) {
      el('asset-status').textContent = 'Asset unavailable'
      message('Failed to load ' + catalogById[id].name + ': ' +
        (error?.message ?? 'Asset or model dimensions unavailable'))
    }
  }
  updatePlacementAvailability()
}

function renderCatalog() {
  const target = el('furniture-catalog')
  const products = arPreviewProducts.filter((id) =>
    !state.category || state.category === 'All' ||
    (state.category === 'Filipino-Inspired'
      ? ['Filipino-Inspired','Philippine Heritage'].includes(catalogById[id].category)
      : catalogById[id].kind === state.category))
  target.replaceChildren()
  for (const id of products) {
    const product = catalogById[id]
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lab-furniture-card' + (id === state.selectedId ? ' active' : '')
    button.dataset.productId = id
    button.setAttribute('aria-pressed', String(id === state.selectedId))
    button.setAttribute('aria-label', product.name + ', ' + dimensionText(id))
    if (hasSourceMetricDimensions(id)) {
      const picture = document.createElement('img')
      picture.src = '/models/thumbs/' + id + '.webp'
      picture.alt = ''
      picture.loading = 'lazy'
      button.append(picture)
    } else {
      const picture = document.createElement('span')
      picture.className = 'lab-furniture-symbol'
      picture.textContent = product.kind === 'sofa' ? '🛋️' : '🪑'
      button.append(picture)
    }
    const name = document.createElement('strong')
    name.textContent = product.name
    button.append(name)
    const size = document.createElement('small')
    size.textContent = product.dimensions.width.toFixed(2) + 'm wide'
    button.append(size)
    button.addEventListener('click', () => void prepareAsset(id))
    target.append(button)
  }
}

function buildCatalog() {
  const categories = [
    ['All', 'All'],
    ['Filipino-Inspired', 'Filipino styles'],
    ['chair', 'Chairs / stools'],
    ['table', 'Tables'],
    ['sofa', 'Sofas'],
  ]
  const target = el('catalog-filters')
  for (const [key, name] of categories) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = name
    b.className = 'lab-category' + (key === 'All' ? ' active' : '')
    b.addEventListener('click', () => {
      state.category = key
      for (const other of target.querySelectorAll('button')) {
        other.classList.toggle('active', other === b)
      }
      renderCatalog()
    })
    target.append(b)
  }
  el('catalog-count').textContent = arPreviewProducts.length + ' pieces'
  renderCatalog()
  void prepareAsset(state.selectedId)
}

function removeLast() {
  const last = state.placed.pop()
  if (!last) return
  if (state.scene) state.scene.remove(last.mesh)
  updatePlacedControls()
  updatePlacementAvailability()
  log('furniture-removed', { productId: last.productId })
}

function clearPlaced() {
  if (state.scene) for (const item of state.placed) state.scene.remove(item.mesh)
  state.placed = []
  updatePlacedControls()
  updatePlacementAvailability()
}

function rotateLast(direction) {
  const last = state.placed.at(-1)
  if (!last) return
  last.mesh.rotation.y += direction * Math.PI / 12
  log('furniture-rotated', { productId: last.productId, yawRadians: last.mesh.rotation.y })
}

function setCompact(compact) {
  state.compact = compact
  optionsPanel.hidden = compact
  quickBar.hidden = !compact
  updatePlacementAvailability()
}

function beginQuickPlacement() {
  if (place.disabled) return false
  place.click()
  return true
}

function createScenePipeline() {
  return {
    name: 'roomfit-slam-test',
    onStart: ({ canvas }) => {
      const { scene, camera, renderer } = window.XR8.Threejs.xrScene()
      state.scene = scene
      state.camera = camera
      state.renderer = renderer
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace

      const ambient = new THREE.HemisphereLight(0xffffff, 0x6b706a, 1.4)
      scene.add(ambient)
      const lamp = new THREE.DirectionalLight(0xffffff, 1.65)
      lamp.position.set(2, 5, 3)
      lamp.castShadow = true
      lamp.shadow.mapSize.set(512, 512)
      lamp.shadow.camera.left = -4
      lamp.shadow.camera.right = 4
      lamp.shadow.camera.top = 4
      lamp.shadow.camera.bottom = -4
      scene.add(lamp)

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.25 }),
      )
      ground.receiveShadow = true
      scene.add(ground)
      camera.position.set(0, 1.6, 2)
      window.XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      })
      canvas.style.touchAction = 'none'

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.075, 0.092, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x39e2b1, depthTest: false }),
      )
      reticle.visible = false
      scene.add(reticle)
      state.reticle = reticle
      updatePlacementAvailability()
      display('Camera initializing', 'Waiting for tracked camera frames')
      log('engine-scene-started')
    },
    onCameraStatusChange: ({ status }) => {
      state.cameraStatus = status
      log('camera-status', { status })
      if (status === 'failed') message('The engine could not open the rear camera.')
    },
    onUpdate: ({ processCpuResult }) => {
      const reality = processCpuResult?.reality
      if (!reality) {
        state.aimTracker.clear()
        state.placementPoint = null
        state.tracking = 'LIMITED'
        if (state.reticle) state.reticle.visible = false
        updatePlacementAvailability()
        return
      }
      const status = reality.trackingStatus ?? 'LIMITED'
      if (state.tracking !== status) {
        state.tracking = status
        log('tracking-status', { status, reason: reality.trackingReason })
      }
      const good = status === 'NORMAL'
      let candidate = null
      if (good && state.camera) {
        state.camera.updateMatrixWorld(true)
        floorRay.setFromCamera(screenCenter, state.camera)
        const intersection = floorRay.ray.intersectPlane(floorPlane, hitPoint)
        if (intersection) {
          const range = hitPoint.distanceTo(state.camera.position)
          if (range >= 0.25 && range <= 8) candidate = hitPoint
        }
      }
      const stable = state.aimTracker.update(candidate, performance.now(), good)
      state.placementPoint = stable ? new THREE.Vector3(stable.x, stable.y, stable.z) : null
      if (state.reticle) {
        state.reticle.visible = Boolean(candidate)
        if (candidate) state.reticle.position.set(candidate.x, candidate.y + 0.016, candidate.z)
        state.reticle.material.color.setHex(stable ? 0x36edae : 0xffc45d)
      }
      updatePlacementAvailability()
      display(
        good ? (stable ? 'Floor steady · Ready to place' : (candidate ? 'Hold floor target steady…' : 'Aim at your floor'))
          : 'Tracking ' + status,
        good ? (stable ? 'Tap the open camera view or Place. Model scale stays locked.' :
          'Aim at a textured floor and hold still for half a second.')
          : 'Tracking must recover before another piece can be placed.',
        good && Boolean(stable),
      )
      const p = reality.position
      const now = performance.now()
      if (good && p && now - state.loggedAt > 500) {
        const xyz = new THREE.Vector3(p.x, p.y, p.z)
        if (!state.origin) state.origin = xyz.clone()
        if (state.previous) state.cumulative += xyz.distanceTo(state.previous)
        state.previous = xyz
        state.loggedAt = now
        el('distance').textContent = state.cumulative.toFixed(2) + ' m (estimated)'
        log('camera-pose', {
          xyz: [fmt(xyz.x), fmt(xyz.y), fmt(xyz.z)],
          poseDeltaFromFirst: fmt(xyz.distanceTo(state.origin)),
          estimatedTravel: fmt(state.cumulative),
        })
      }
    },
    onException: (error) => {
      state.tracking = 'LIMITED'
      state.placementPoint = null
      state.aimTracker.clear()
      message('Tracking engine error: ' + (error?.message ?? String(error)))
      display('Tracking engine error', 'See technical error message')
      place.disabled = true
    },
  }
}

function initEngine() {
  if (!window.XR8) return
  start.disabled = false
  start.textContent = 'Start 8th Wall SLAM test'
  display('Engine loaded', 'Tap Start to begin camera tracking')
  log('engine-ready')
}

start.addEventListener('click', () => {
  if (state.running) return
  if (!window.XR8) {
    message('Engine unavailable. Check internet access and reload the page.')
    return
  }
  errorBox.hidden = true
  liveErrorBox.hidden = true
  try {
    start.disabled = true
    window.XR8.XrController.configure({
      disableWorldTracking: false,
      enableLighting: true,
      enableWorldPoints: false,
      scale: 'absolute',
    })
    window.XR8.addCameraPipelineModules([
      window.XR8.GlTextureRenderer.pipelineModule(),
      window.XR8.Threejs.pipelineModule(),
      window.XR8.XrController.pipelineModule(),
      ...(window.XRExtras?.FullWindowCanvas?.pipelineModule
        ? [window.XRExtras.FullWindowCanvas.pipelineModule()] : []),
      ...(window.XRExtras?.RuntimeError?.pipelineModule
        ? [window.XRExtras.RuntimeError.pipelineModule()] : []),
      ...(window.XRExtras?.Loading?.pipelineModule
        ? [window.XRExtras.Loading.pipelineModule()] : []),
      createScenePipeline(),
    ])
    const mobileDevice = window.XR8.XrConfig?.device?.().MOBILE
    window.XR8.run({ canvas: el('camerafeed'), ...(mobileDevice ? { allowedDevices: mobileDevice } : {}) })
    state.running = true
    el('lab-instructions').hidden = true
    setCompact(false)
    display('Opening camera…', 'Allow permission, aim toward a detailed floor and move slowly')
    log('camera-start-requested', { mode: 'absolute-scale' })
  } catch (error) {
    start.disabled = false
    message('Could not start 8th Wall engine: ' + (error?.message ?? String(error)))
  }
})
place.addEventListener('click', () => {
  if (state.tracking !== 'NORMAL' || !state.scene || !state.placementPoint) return
  const selected = state.modelTemplates.get(state.selectedId)
  if (!selected) {
    message('Furniture model not loaded yet. Choose another or try again.')
    return
  }
  if (state.placed.length >= 8) {
    message('Maximum eight objects in one test session. Remove one before placing more.')
    return
  }
  const point = state.placementPoint.clone()
  const mesh = selected.clone(true)
  mesh.position.copy(point)
  state.scene.add(mesh)
  state.placed.push({ mesh, productId: state.selectedId, point: [fmt(point.x), fmt(point.y), fmt(point.z)] })
  updatePlacedControls()
  updatePlacementAvailability()
  setCompact(true)
  log('furniture-placed', {
    productId: state.selectedId,
    xyz: [fmt(point.x), fmt(point.y), fmt(point.z)],
    dimensionsMeters: catalogById[state.selectedId].dimensions,
    source: sourceModelText(state.selectedId),
  })
})
clear.addEventListener('click', removeLast)
rotateLeft.addEventListener('click', () => rotateLast(-1))
rotateRight.addEventListener('click', () => rotateLast(1))
quickPlace.addEventListener('click', beginQuickPlacement)
quickUndo.addEventListener('click', removeLast)
el('collapse-panel').addEventListener('click', () => setCompact(true))
el('show-options').addEventListener('click', () => setCompact(false))

// Tapping an unobstructed portion of the real camera is an additional
// one-tap placement gesture; swipes used for scanning never trigger placement.
const liveCanvas = el('camerafeed')
let pressPosition = null
liveCanvas.addEventListener('pointerdown', (event) => {
  pressPosition = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() }
})
liveCanvas.addEventListener('pointerup', (event) => {
  const from = pressPosition
  pressPosition = null
  if (!from || from.id !== event.pointerId || !state.running) return
  if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > 16) return
  if (performance.now() - from.at > 325) return
  beginQuickPlacement()
})
liveCanvas.addEventListener('pointercancel', () => { pressPosition = null })
el('recenter').addEventListener('click', () => {
  if (!state.running || !window.XR8?.XrController?.recenter) {
    message('Recenter is not available until the tracking engine has started.')
    return
  }
  clearPlaced()
  state.aimTracker.clear()
  state.placementPoint = null
  if (state.reticle) state.reticle.visible = false
  updatePlacementAvailability()
  window.XR8.XrController.recenter()
  state.origin = null
  state.previous = null
  state.cumulative = 0
  el('distance').textContent = '—'
  log('tracking-recentered')
  display('Recenter requested', 'Aim at the floor again and wait for stable tracking.')
})
exportLog.addEventListener('click', () => {
  const record = {
    experiment: 'RoomFit 8th Wall SLAM real-device compatibility',
    disclaimer: 'No camera imagery recorded. No device-level validation or certified accuracy implied.',
    device: navigator.userAgent,
    sessionTracking: state.tracking,
    cameraStatus: state.cameraStatus,
    poseDistanceEstimatedMeters: fmt(state.cumulative),
    events: engineLog,
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'roomfit-slam-test.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
})
window.addEventListener('pagehide', () => {
  if (state.running && window.XR8?.stop) window.XR8.stop()
})
try {
  const prior = localStorage.getItem('roomfit:last-tracked-furniture')
  if (arPreviewProducts.includes(prior)) state.selectedId = prior
} catch { /* private mode or storage disabled */ }
buildCatalog()
if (window.XR8) initEngine()
else window.addEventListener('xrloaded', initEngine, { once: true })
setTimeout(() => {
  if (start.disabled && !state.running && !window.XR8) {
    message('8th Wall SDK has not loaded. Check network access, browser content blockers, or try again.')
    display('Engine download failed', 'Unable to start the SLAM compatibility test')
  }
}, 12000)
