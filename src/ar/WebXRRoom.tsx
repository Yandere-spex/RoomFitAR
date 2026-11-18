/// <reference types="webxr" />
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  Camera, ChevronLeft, Download, Map, Minus, Plus, RotateCw,
  Ruler, Sofa, Trash2, Undo2, X,
} from 'lucide-react'
import { catalogById } from '../domain/catalog'
import { arPreviewProducts, createFurnitureAsset } from './furnitureModels'
import {
  checkNextFloorPoint, isSimpleFloorPolygon, summarizeMeasurement,
  type FloorPoint, type MeasurementKind,
} from './roomMeasurements'

type XRStage = 'ready' | 'starting' | 'active' | 'unavailable'
type ToolMode = 'furniture' | 'measure'
type Props = { onExit: () => void; onFallback: () => void; onMessage: (message: string) => void }

type SceneState = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  reticle: THREE.Mesh
  graphics: THREE.Group
  source: XRHitTestSource | null
  session: XRSession | null
  position: THREE.Vector3 | null
  placed: THREE.Group[]
  points: FloorPoint[]
  disposed: boolean
}

function clearGraphics(group: THREE.Group) {
  const objects = [...group.children]
  for (const object of objects) {
    group.remove(object)
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(material => material.dispose())
    }
  }
}

/** The small colored dots and edges are guides, not low-poly room geometry. */
function redrawFloorMeasurement(state: SceneState, kind: MeasurementKind) {
  clearGraphics(state.graphics)
  const points = state.points
  for (const [index, point] of points.entries()) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.031, 14, 10),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0xffcc69 : 0x26dcb0, depthTest: false }),
    )
    marker.position.set(point.x, point.y + 0.022, point.z)
    state.graphics.add(marker)
  }
  if (points.length < 2) return

  const pairs: [FloorPoint, FloorPoint][] = points.slice(1)
    .map((point, index) => [points[index], point])
  if (kind === 'floor' && isSimpleFloorPolygon(points)) {
    pairs.push([points.at(-1)!, points[0]])
  }

  for (const [a, b] of pairs) {
    const start = new THREE.Vector3(a.x, a.y + 0.018, a.z)
    const end = new THREE.Vector3(b.x, b.y + 0.018, b.z)
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = direction.length()
    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, length, 8),
      new THREE.MeshBasicMaterial({ color: 0x29d7ab, transparent: true, opacity: 0.95 }),
    )
    line.position.copy(start).add(end).multiplyScalar(0.5)
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    state.graphics.add(line)
  }
}

const fmt = (value: number | null, unit: string) =>
  value === null ? '—' : value.toFixed(2) + ' ' + unit

export default function WebXRRoom({ onExit, onFallback, onMessage }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const ar = useRef<SceneState | null>(null)
  const [stage, setStage] = useState<XRStage>('ready')
  const [mode, setMode] = useState<ToolMode>('furniture')
  const [measureKind, setMeasureKind] = useState<MeasurementKind>('distance')
  const [points, setPoints] = useState<FloorPoint[]>([])
  const [tapeReference, setTapeReference] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('wooden-stool')
  const [placedCount, setPlacedCount] = useState(0)
  const [surfaceFound, setSurfaceFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [overlaySupported, setOverlaySupported] = useState(false)
  const [xrFailure, setXrFailure] = useState('')
  const summary = useMemo(() => summarizeMeasurement(points, measureKind), [points, measureKind])

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false })
    } catch {
      window.setTimeout(() => setStage('unavailable'), 0)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(parent.clientWidth, parent.clientHeight)
    renderer.xr.enabled = true
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    parent.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 30)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x85928c, 2))
    const sun = new THREE.DirectionalLight(0xffffff, 2.1)
    sun.position.set(0, 4, 3)
    scene.add(sun)

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.105, 36).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x32cda1, side: THREE.DoubleSide }),
    )
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    const graphics = new THREE.Group()
    scene.add(graphics)

    const state: SceneState = {
      renderer, scene, camera, reticle, graphics,
      source: null, session: null, position: null,
      placed: [], points: [], disposed: false,
    }
    ar.current = state

    renderer.setAnimationLoop((_time, frame) => {
      if (!state.disposed && frame && state.source) {
        const space = renderer.xr.getReferenceSpace()
        const hits = space ? frame.getHitTestResults(state.source) : []
        const pose = space ? hits[0]?.getPose(space) : null
        let valid = false
        if (pose) {
          const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix)
          const normal = new THREE.Vector3(0, 1, 0).transformDirection(matrix)
          if (normal.y > 0.8) {
            state.reticle.matrix.copy(matrix)
            state.reticle.visible = true
            state.position = new THREE.Vector3().setFromMatrixPosition(matrix)
            valid = true
          }
        }
        if (!valid) {
          state.reticle.visible = false
          state.position = null
        }
        setSurfaceFound(before => before === valid ? before : valid)
      }
      renderer.render(scene, camera)
    })

    const resize = () => renderer.setSize(parent.clientWidth, parent.clientHeight)
    window.addEventListener('resize', resize)
    return () => {
      state.disposed = true
      state.source?.cancel()
      if (state.session) void state.session.end().catch(() => {})
      renderer.setAnimationLoop(null)
      clearGraphics(graphics)
      state.reticle.geometry.dispose()
      ;(state.reticle.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
      window.removeEventListener('resize', resize)
      if (ar.current === state) ar.current = null
    }
  }, [])

  const resetMeasurements = (showMessage: boolean) => {
    const state = ar.current
    if (state) {
      state.points = []
      clearGraphics(state.graphics)
    }
    setPoints([])
    setTapeReference('')
    if (showMessage) onMessage('AR estimates cleared. No room map was saved.')
  }

  const startAR = async () => {
    const state = ar.current
    const xr = navigator.xr
    if (!state || !xr || !overlay.current || !window.isSecureContext) {
      setXrFailure('Tracked floor placement needs HTTPS, a compatible ARCore phone and WebXR support. You can still use Furniture Camera.')
      return
    }
    setXrFailure('')
    setStage('starting')

    try {
      // XR request must follow a direct user gesture, not an automatic effect.
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: overlay.current },
      })
      if (state.disposed) {
        await session.end()
        return
      }
      state.session = session
      // We cannot show placement/measurement controls without a visible XR DOM overlay.
      if (!session.domOverlayState) {
        await session.end().catch(() => {})
        state.session = null
        throw new Error('This browser did not enable the AR control overlay.')
      }
      session.addEventListener('end', () => {
        if (state.disposed) return
        state.source?.cancel()
        state.source = null
        state.session = null
        state.reticle.visible = false
        state.position = null
        state.placed.forEach(item => state.scene.remove(item))
        state.placed = []
        setPlacedCount(0)
        resetMeasurements(false)
        setStage('ready')
        setSurfaceFound(false)
        setOverlaySupported(false)
      })

      state.renderer.xr.setReferenceSpaceType('local')
      await state.renderer.xr.setSession(session)
      const viewerSpace = await session.requestReferenceSpace('viewer')
      if (!session.requestHitTestSource) throw new Error('Floor hit testing is unsupported.')
      const source = await session.requestHitTestSource({ space: viewerSpace })
      if (!source) throw new Error('The browser could not start floor tracking.')
      state.source = source
      setOverlaySupported(Boolean(session.domOverlayState))
      setStage('active')
      onMessage('Aim at a well-lit, clear floor until the green target appears.')
    } catch (error) {
      if (state.session) {
        await state.session.end().catch(() => {})
        state.session = null
      }
      setStage('ready')
      const detail = error instanceof Error ? error.message : 'Unknown AR error'
      const explanation = detail.toLowerCase().includes('not supported') || detail.toLowerCase().includes('session configuration')
        ? 'This phone/browser does not support the required immersive AR floor tracking. Camera Furniture Studio remains available, but cannot measure the room.'
        : detail
      setXrFailure(explanation)
      onMessage('Could not start tracked AR: ' + detail)
    }
  }

  const placeFurniture = async () => {
    const state = ar.current
    const product = catalogById[selectedProductId]
    if (!state?.session || !state.position || !product || busy) return
    const position = state.position.clone()
    setBusy(true)
    try {
      const object = await createFurnitureAsset(product)
      if (state.disposed || !state.session) return
      object.position.copy(position)
      state.scene.add(object)
      state.placed.push(object)
      setPlacedCount(state.placed.length)
      onMessage('Placed demo ' + product.name + '. Model dimensions are not manufacturer verified.')
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Furniture model did not load.')
    } finally {
      setBusy(false)
    }
  }

  const rotateLatest = () => {
    const latest = ar.current?.placed.at(-1)
    if (latest) latest.rotation.y += Math.PI / 12
  }

  const removeLatest = () => {
    const state = ar.current
    const removed = state?.placed.pop()
    if (removed && state) {
      state.scene.remove(removed)
      setPlacedCount(state.placed.length)
    }
  }

  const switchMeasurementKind = (next: MeasurementKind) => {
    if (measureKind === next) return
    resetMeasurements(false)
    setMeasureKind(next)
  }

  const capturePoint = () => {
    const state = ar.current
    if (!state?.session || !state.position) {
      onMessage('No tracked floor target yet. Move the phone and try again.')
      return
    }
    const point: FloorPoint = {
      x: state.position.x, y: state.position.y, z: state.position.z,
    }
    const reason = checkNextFloorPoint(state.points, point, measureKind)
    if (reason) {
      onMessage(reason)
      return
    }
    state.points = [...state.points, point]
    redrawFloorMeasurement(state, measureKind)
    setPoints([...state.points])
    setTapeReference('')
    if (measureKind === 'floor' && state.points.length >= 3) {
      onMessage('Floor estimate updated. Check all corners against actual room boundaries.')
    }
  }

  const undoPoint = () => {
    const state = ar.current
    if (!state || state.points.length === 0) return
    state.points = state.points.slice(0, -1)
    redrawFloorMeasurement(state, measureKind)
    setPoints([...state.points])
    setTapeReference('')
  }

  const exportMeasurements = () => {
    if (points.length < 2) return
    const output = {
      schemaVersion: 1,
      source: 'AR estimate - not independently verified',
      referenceSpace: 'WebXR local space, meters; valid only for the captured session',
      measurement: measureKind,
      recordedAt: new Date().toISOString(),
      points,
      summary,
      userTapeReferenceMeters: tapeReference && Number(tapeReference) > 0 ? Number(tapeReference) : null,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'roomfit-ar-measurement-estimate.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    onMessage('AR estimate exported. Coordinates cannot relocalize a room in a new session.')
  }

  const finishAR = async () => {
    const session = ar.current?.session
    if (session) await session.end().catch(() => {})
    onExit()
  }

  return <section className="webxr-screen">
    <div ref={host} className="webxr-render" aria-hidden />
    <div ref={overlay} className="webxr-overlay">
      <header className="webxr-bar">
        <button type="button" className="ar-icon-button" onClick={() => void finishAR()} aria-label="Leave live AR"><ChevronLeft size={22} /></button>
        <div><strong>RoomFit Live AR</strong><span>REAL ROOM · TRACKED FLOOR</span></div>
        <span className="ar-live-pill"><Camera size={13}/>{stage === 'active' ? 'LIVE AR' : 'AR READY'}</span>
      </header>

      {stage !== 'active' && <div className="xr-launch">
        <div className="xr-launch-icon"><Camera size={31}/></div>
        <h2>See and measure your real room.</h2>
        <p>On a compatible Android phone, use tracked floor points to estimate room dimensions or place textured furniture in the physical room.</p>
        <button type="button" className="xr-start" onClick={() => void startAR()}
          disabled={stage === 'starting' || stage === 'unavailable'}>
          <Camera size={18}/>{stage === 'starting' ? 'Opening camera…' : 'Start tracked room AR'}
        </button>
        {stage === 'unavailable' && <p>WebGL is unavailable in this browser. No room measurements can be computed.</p>}
        {xrFailure && <p role="alert" className="xr-session-error">{xrFailure}</p>}
        <button type="button" className="xr-start xr-fallback-btn" onClick={onFallback}><Camera size={18}/> Open Furniture Camera (no WebXR required)</button>
        <small>WebXR estimates have not been accuracy-validated on your phone. Verify dimensions with a tape or laser measure before buying furniture.</small>
        <button type="button" className="xr-secondary" onClick={onExit}>Back to home</button>
      </div>}

      {stage === 'active' && <>
        <div className="xr-target-message">{surfaceFound
          ? 'Floor found · ' + (mode === 'measure' ? 'Aim at the desired point' : 'Ready to place')
          : 'Move slowly and aim at a well-lit, clear floor'}</div>
        <div className="xr-tool-tabs" role="group" aria-label="Live AR tool">
          <button type="button" className={mode === 'furniture' ? 'active' : ''}
            onClick={() => setMode('furniture')}><Sofa size={16}/> Furniture</button>
          <button type="button" className={mode === 'measure' ? 'active' : ''}
            onClick={() => setMode('measure')}><Ruler size={16}/> Measure room</button>
        </div>
        {mode === 'furniture' ? <div className="xr-bottom-controls">
          <p className="xr-data-caution">Demo GLB furniture: displayed physical sizes are provisional, not verified product dimensions.</p>
          <div className="xr-piece-list">
            {arPreviewProducts.map(id => <button key={id} type="button" onClick={() => setSelectedProductId(id)}
              className={selectedProductId === id ? 'chosen' : ''}>
              <Sofa size={18}/><span>{catalogById[id].name}</span>
            </button>)}
          </div>
          <button type="button" className="xr-place" disabled={!surfaceFound || busy}
            onClick={() => void placeFurniture()}>
            {busy ? 'Loading model…' : 'Place furniture'}
          </button>
          <div className="xr-extra">
            <button type="button" onClick={rotateLatest} disabled={placedCount === 0}>
              <RotateCw size={17}/> Rotate last</button>
            <span>{placedCount} placed</span>
            <button type="button" onClick={removeLatest} disabled={placedCount === 0}>
              <X size={17}/> Remove last</button>
          </div>
        </div> : <div className="xr-measure-controls">
          <div className="xr-measure-modes" role="group" aria-label="Measurement type">
            <button type="button" className={measureKind === 'distance' ? 'active' : ''}
              onClick={() => switchMeasurementKind('distance')}><Ruler size={15}/> Two-point distance</button>
            <button type="button" className={measureKind === 'floor' ? 'active' : ''}
              onClick={() => switchMeasurementKind('floor')}><Map size={15}/> Floor outline</button>
          </div>
          <div className="xr-measure-stats">
            {measureKind === 'distance' ? <>
              <div><small>Horizontal distance</small><strong data-testid="measured-distance">{fmt(summary.segmentMeters, 'm')}</strong></div>
              <div><small>Points</small><strong>{points.length} / 2</strong></div>
            </> : <>
              <div><small>Estimated area</small><strong data-testid="measured-area">{fmt(summary.areaSquareMeters, 'm²')}</strong></div>
              <div><small>Estimated perimeter</small><strong>{fmt(summary.perimeterMeters, 'm')}</strong></div>
              <div><small>Corners</small><strong>{points.length} / 12</strong></div>
            </>}
          </div>
          {summary.edgeMeters.length > 0 && <div className="xr-measure-edges">
            {summary.edgeMeters.map((meters, i) => <span key={i}>
              {String.fromCharCode(65 + i)}–{String.fromCharCode(65 + ((i + 1) % points.length))}: {meters.toFixed(2)} m
            </span>)}
          </div>}
          {measureKind === 'distance' && summary.segmentMeters !== null &&
            <label className="xr-tape-reference">
              Tape/laser reference (optional, meters)
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="e.g., 2.40"
                value={tapeReference} onChange={e => setTapeReference(e.target.value)} />
              {Number(tapeReference) > 0 && <small>
                User-entered reference {Number(tapeReference).toFixed(2)} m · AR difference {Math.abs(summary.segmentMeters - Number(tapeReference)).toFixed(2)} m. This does not calibrate tracking.
              </small>}
            </label>}
          <button type="button" className="xr-place" onClick={capturePoint}
            disabled={!surfaceFound || (measureKind === 'distance' && points.length === 2) || (measureKind === 'floor' && points.length === 12)}>
            <Plus size={17}/> Record tracked floor point {String.fromCharCode(65 + points.length)}
          </button>
          <div className="xr-measure-actions">
            <button type="button" onClick={undoPoint} disabled={points.length === 0}><Undo2 size={15}/> Undo</button>
            <button type="button" onClick={() => resetMeasurements(true)} disabled={points.length === 0}><Trash2 size={15}/> Clear</button>
            <button type="button" onClick={exportMeasurements} disabled={points.length < 2}><Download size={15}/> Export</button>
          </div>
          <p className="xr-measure-disclaimer">
            <Minus size={14}/> AR-estimated measurements only. Floor corners must be placed manually in view. No automatic wall detection, certified accuracy, or cross-session anchors.
          </p>
        </div>}
        {!overlaySupported && <div className="xr-overlay-warning">
          This device has not confirmed DOM overlay support. Use the device's system exit gesture if needed.
        </div>}
      </>}
    </div>
  </section>
}
