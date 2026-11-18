import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import './slam-lab.css'

// Separate R&D experiment: no DOM camera-video overlay or fabricated camera poses.
// World-tracking engine is loaded as the official, unmodified distribution via CDN.
// No images or camera frames are recorded by this page.
window.THREE = THREE

const el = (id) => document.getElementById(id)
const start = el('start-tracking')
const place = el('place-sofa')
const clear = el('reset-sofa')
const exportLog = el('export-log')
const errorBox = el('failure')
const engineLog = []
const state = {
  running: false,
  tracking: 'UNAVAILABLE',
  cameraStatus: 'unknown',
  scene: null,
  camera: null,
  renderer: null,
  sample: null,
  furniture: null,
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
  el('tracking-status').textContent = status
  el('tracking-description').textContent = description
  el('tracking-dot').classList.toggle('good', good)
}
const message = (text) => {
  errorBox.hidden = false
  errorBox.textContent = text
  log('error', { text })
}
window.addEventListener('error', (e) => log('javascript-error', { text: e.message }))
window.addEventListener('unhandledrejection', (e) => log('promise-error', { text: String(e.reason) }))

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

      new GLTFLoader().load(
        '/models/velvet-sofa.glb',
        (gltf) => {
          const mesh = gltf.scene
          mesh.updateMatrixWorld(true)
          const bounds = new THREE.Box3().setFromObject(mesh)
          const dims = bounds.getSize(new THREE.Vector3())
          if (dims.x <= 0 || dims.y <= 0 || dims.z <= 0) {
            message('Invalid sofa geometry: cannot place model')
            return
          }
          // Provisional display size; NOT a manufacturer's verified product measurement.
          mesh.scale.multiplyScalar(Math.min(2.18 / dims.x, 0.82 / dims.y, 0.94 / dims.z))
          mesh.updateMatrixWorld(true)
          const scaled = new THREE.Box3().setFromObject(mesh)
          const center = scaled.getCenter(new THREE.Vector3())
          mesh.position.set(-center.x, -scaled.min.y, -center.z)
          mesh.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true
              node.receiveShadow = true
            }
          })
          const pivot = new THREE.Group()
          pivot.add(mesh)
          state.sample = pivot
          log('model-loaded', { asset: 'velvet-sofa', dimensions: 'provisional' })
        },
        undefined,
        () => message('The sofa model failed to download. Check the connection.'),
      )
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
      if (!reality) return
      const status = reality.trackingStatus ?? 'LIMITED'
      if (state.tracking !== status) {
        state.tracking = status
        log('tracking-status', { status, reason: reality.trackingReason })
      }
      const good = status === 'NORMAL'
      place.disabled = !good || !state.sample
      display(
        good ? 'Tracking NORMAL — ready to place' : 'Tracking ' + status,
        good ? 'The engine reports a camera pose. Move slowly to check whether placement remains stable.'
          : 'Aim at a textured floor and move your phone slowly. Placement is disabled until tracking is NORMAL.',
        good,
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
      createScenePipeline(),
    ])
    window.XR8.run({ canvas: el('camerafeed') })
    state.running = true
    el('lab-instructions').hidden = true
    el('lab-controls').hidden = false
    display('Opening camera…', 'Allow permission, aim toward a detailed floor and move slowly')
    log('camera-start-requested', { mode: 'absolute-scale' })
  } catch (error) {
    start.disabled = false
    message('Could not start 8th Wall engine: ' + (error?.message ?? String(error)))
  }
})
place.addEventListener('click', () => {
  if (state.tracking !== 'NORMAL' || !state.camera || !state.scene || !state.sample) return
  state.camera.updateMatrixWorld(true)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(0, 0), state.camera)
  const point = new THREE.Vector3()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  if (!ray.ray.intersectPlane(ground, point)) {
    message('The camera center does not intersect the estimated floor. Tilt down and retry.')
    return
  }
  if (point.distanceTo(state.camera.position) > 8 || point.distanceTo(state.camera.position) < 0.2) {
    message('The candidate is outside a useful tracking distance. Move closer to the floor.')
    return
  }
  if (state.furniture) state.scene.remove(state.furniture)
  state.furniture = state.sample.clone(true)
  state.furniture.position.copy(point)
  state.scene.add(state.furniture)
  el('sofa-state').textContent = 'Placed at tracked 3D point'
  clear.disabled = false
  log('sofa-placed', { xyz: [fmt(point.x), fmt(point.y), fmt(point.z)] })
})
clear.addEventListener('click', () => {
  if (state.furniture && state.scene) state.scene.remove(state.furniture)
  state.furniture = null
  clear.disabled = true
  el('sofa-state').textContent = 'Not placed'
  log('sofa-removed')
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
if (window.XR8) initEngine()
else window.addEventListener('xrloaded', initEngine, { once: true })
setTimeout(() => {
  if (start.disabled && !state.running && !window.XR8) {
    message('8th Wall SDK has not loaded. Check network access, browser content blockers, or try again.')
    display('Engine download failed', 'Unable to start the SLAM compatibility test')
  }
}, 12000)
