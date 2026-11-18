import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Armchair, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Camera, Check,
  ChevronRight, CircleHelp, Download, House, Info, Layers3, Maximize2,
  Minus, Move, Plus, RotateCcw, RotateCw, Ruler, Save, ScanLine,
  ShieldCheck, Trash2, WifiOff,
} from 'lucide-react'
import CameraHome from './components/CameraHome'

const RoomScene = lazy(() => import('./components/RoomScene'))
const WebXRRoom = lazy(() => import('./ar/WebXRRoom'))
const CameraFurnitureStudio = lazy(() => import('./components/CameraFurnitureStudio'))
import { getDeviceCapabilities, type DeviceCapabilities } from './ar/capabilities'
import { unavailableSpatialProvider } from './ar/SpatialProvider'
import { catalog, catalogById } from './domain/catalog'
import { canPlace, createInitialLayout, exportLayout, findAvailablePosition, loadLayout, saveLayout } from './domain/layout'
import type { PlacedObject, RoomLayout } from './domain/types'
import './App.css'

const formatSize = (meters: number) => (meters * 100).toFixed(0) + ' cm'
const categories = ['All', ...Array.from(new Set(catalog.map((item) => item.category)))]

function DigitalDraft({ onHome }: { onHome: () => void }) {
  const [layout, setLayout] = useState<RoomLayout>(loadLayout)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [category, setCategory] = useState('All')
  const [toast, setToast] = useState('')
  const [showDeviceInfo, setShowDeviceInfo] = useState(false)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    getDeviceCapabilities().then(setCapabilities).catch(() => setCapabilities(null))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selected = layout.objects.find((item) => item.id === selectedId) ?? null
  const selectedProduct = selected ? catalogById[selected.productId] : null
  const filteredCatalog = useMemo(
    () => catalog.filter((item) => category === 'All' || item.category === category),
    [category],
  )

  function tryUpdate(candidate: PlacedObject) {
    if (!canPlace(layout, candidate)) {
      setToast('That position overlaps furniture or extends beyond the room.')
      return
    }
    setLayout({ ...layout, savedAt: null, objects: layout.objects.map((item) => item.id === candidate.id ? candidate : item) })
  }

  function moveObject(id: string, x: number, z: number) {
    const item = layout.objects.find((object) => object.id === id)
    if (!item) return
    tryUpdate({ ...item, position: [Math.round(x * 100) / 100, 0, Math.round(z * 100) / 100] })
  }

  function rotateObject(delta: number) {
    if (!selected) return
    tryUpdate({ ...selected, rotationY: selected.rotationY + delta })
  }

  function addObject(productId: string) {
    const newObject = findAvailablePosition(layout, productId)
    if (!newObject) {
      setToast('No suitable free space in this room. Move or remove another object.')
      return
    }
    setLayout({ ...layout, objects: [...layout.objects, newObject], savedAt: null })
    setSelectedId(newObject.id)
    setMobileCatalogOpen(false)
    setToast('Furniture added. Tap the floor to move it.')
  }

  function deleteSelected() {
    if (!selectedId) return
    setLayout({ ...layout, objects: layout.objects.filter((item) => item.id !== selectedId), savedAt: null })
    setSelectedId(null)
    setToast('Furniture removed from this draft.')
  }

  function handleSave() {
    try {
      setLayout(saveLayout(layout))
      setToast('Digital Draft saved on this browser.')
    } catch {
      setToast('Could not save to browser storage. Export the JSON as a backup.')
    }
  }

  function handleReset() {
    if (!window.confirm('Replace the current unsaved view with the sample living room?')) return
    setLayout(createInitialLayout())
    setSelectedId(null)
    setToast('Sample room restored. Save to overwrite your stored draft.')
  }

  function takeScreenshot() {
    try {
      const dataUrl = canvas.current?.toDataURL('image/png')
      if (!dataUrl) throw new Error('Canvas is not ready')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = 'roomfit-room-preview.png'
      link.click()
      setToast('3D room screenshot downloaded.')
    } catch {
      setToast('Screenshot unavailable. Check WebGL support and try again.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><House size={23} strokeWidth={2.5} /></div>
          <div className="brand-title">roomfit<span>AR</span><small>DESIGN YOUR SPACE</small></div>
        </div>
        <button type="button" className="draft-home-link" onClick={() => { try { saveLayout(layout) } catch { /* draft still accessible from home */ }; onHome() }}><Camera size={16} /> Live Camera</button>
        <div className="nav-middle"><span className="nav-pill"><Layers3 size={15} /> Design Studio</span><span className="nav-muted">Workspace / My Living Room</span></div>
        <div className="top-actions">
          <span className="draft-label"><span className={'status-dot ' + (layout.savedAt ? 'saved' : '')} />{layout.savedAt ? 'Saved locally' : 'Unsaved changes'}</span>
          <button className="btn btn-outline" type="button" onClick={() => setShowDeviceInfo(!showDeviceInfo)}><Info size={16} /> <span className="desktop-text">AR Readiness</span></button>
          <button className="btn btn-dark" type="button" onClick={handleSave}><Save size={16} /> Save Layout</button>
        </div>
      </header>

      <div className="workspace">
        <aside className={'catalog-panel ' + (mobileCatalogOpen ? 'mobile-open' : '')}>
          <div className="panel-heading">
            <div><span className="eyebrow">YOUR DESIGN TOOLKIT</span><h2>Furniture Library</h2><p>Explore pieces and build your room.</p></div>
            <button className="mobile-close" onClick={() => setMobileCatalogOpen(false)} aria-label="Close catalog">×</button>
          </div>
          <div className="category-scroller">
            {categories.map((option) => <button type="button" key={option}
              className={'category-tab ' + (category === option ? 'active' : '')}
              onClick={() => setCategory(option)}>{option}</button>)}
          </div>
          <div className="catalog-content">
            <div className="section-bar"><strong>Discover pieces</strong><span>{filteredCatalog.length} items</span></div>
            <div className="catalog-grid">
              {filteredCatalog.map((product) => <article key={product.id} className="catalog-card">
                <div className={'product-preview product-' + product.kind}>
                  <div className="product-art" style={{ backgroundColor: product.color }}>
                    <Armchair size={30} strokeWidth={1.6} />
                  </div>
                  <span className="dimension-pill">{formatSize(product.dimensions.width)} wide</span>
                </div>
                <div className="product-details"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p>
                  <button type="button" className="add-button" onClick={() => addObject(product.id)} aria-label={'Add ' + product.name}>
                    <Plus size={15} /> Add to room
                  </button>
                </div>
              </article>)}
            </div>
          </div>
          <div className="catalog-footer"><ShieldCheck size={17} /><span>Models use fixed real-world dimensions. Scale editing is disabled.</span></div>
        </aside>

        <main className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="room-label">
              <div className="room-icon"><House size={19} /></div>
              <div><h1>{layout.name}</h1><p>Digital Draft <span>•</span> {layout.width.toFixed(1)} m × {layout.depth.toFixed(1)} m</p></div>
              <ChevronRight size={16} className="breadcrumb" />
            </div>
            <div className="canvas-actions">
              <span className="mode-tag"><span /> 3D VIEW</span>
              <button className="icon-btn" aria-label="Take screenshot" title="Download room screenshot" onClick={takeScreenshot}><Camera size={18} /></button>
              <button className="icon-btn" aria-label="Export layout" title="Export draft as JSON" onClick={() => exportLayout(layout)}><Download size={18} /></button>
            </div>
          </div>

          <div className="canvas-region">
            <Suspense fallback={<div className="editor-scene-loading">Preparing 3D room…</div>}>
              <RoomScene layout={layout} selectedId={selectedId} onSelect={setSelectedId}
                onMove={moveObject} onCanvasReady={(target) => { canvas.current = target }} />
            </Suspense>
            <div className="canvas-floating top-left"><span className="legend-square" /> DIGITAL ROOM PREVIEW <span className="separator">|</span> METRIC SCALE</div>
            <div className="canvas-floating bottom-left"><Move size={15} /><span><b>Drag</b> to orbit · <b>Scroll</b> to zoom · Select furniture, then <b>tap floor</b> to move</span></div>
            <div className="scene-corner">01 <span>/</span> 01</div>
          </div>
          <div className="bottom-toolbar">
            <div><button type="button" className="btn btn-outline mobile-catalog-button" onClick={() => setMobileCatalogOpen(true)}><Plus size={16} /> Furniture</button><span className="room-summary"><Box size={16} /> {layout.objects.length} pieces placed</span></div>
            <div><button className="text-button" type="button" onClick={handleReset}><RotateCcw size={15} /> Reset sample</button><button className="btn btn-outline" type="button" onClick={takeScreenshot}><Camera size={16} /> Capture</button></div>
          </div>
        </main>

        <aside className="inspector-panel">
          <div className="inspector-head"><div><span className="eyebrow">ROOM SETTINGS</span><h2>Properties</h2></div><SlidersMark /></div>
          {selected && selectedProduct ? <>
            <div className="inspector-section">
              <span className="inspector-kicker">SELECTED OBJECT</span>
              <div className="selected-card"><div className="selected-swatch" style={{ background: selectedProduct.color }}><Armchair size={29} /></div>
                <div><strong>{selectedProduct.name}</strong><small>{selectedProduct.category}</small></div></div>
              <p className="inspector-help">Tap anywhere on the floor to move the selected item. Placement is limited to the room boundary.</p>
            </div>
            <div className="inspector-section">
              <div className="section-title"><span>Position</span><span>METERS</span></div>
              <div className="axis-fields">
                <label><span>X</span><input type="number" step=".1" value={Number(selected.position[0].toFixed(2))}
                  onChange={e => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) moveObject(selected.id, v, selected.position[2]) }} /></label>
                <label><span>Z</span><input type="number" step=".1" value={Number(selected.position[2].toFixed(2))}
                  onChange={e => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) moveObject(selected.id, selected.position[0], v) }} /></label>
              </div>
              <div className="nudge-grid">
                <span /><button title="Move towards back wall" onClick={() => moveObject(selected.id, selected.position[0], selected.position[2] - 0.1)}><ArrowUp size={17} /></button><span />
                <button title="Move left" onClick={() => moveObject(selected.id, selected.position[0] - 0.1, selected.position[2])}><ArrowLeft size={17} /></button>
                <span className="nudge-label">10 cm</span>
                <button title="Move right" onClick={() => moveObject(selected.id, selected.position[0] + 0.1, selected.position[2])}><ArrowRight size={17} /></button>
                <span /><button title="Move towards front" onClick={() => moveObject(selected.id, selected.position[0], selected.position[2] + 0.1)}><ArrowDown size={17} /></button><span />
              </div>
            </div>
            <div className="inspector-section">
              <div className="section-title"><span>Rotation</span><span>DEGREES</span></div>
              <div className="rotation-row"><button onClick={() => rotateObject(-Math.PI / 12)} title="Rotate counterclockwise 15 degrees"><RotateCcw size={17} /></button>
                <strong>{Math.round((selected.rotationY * 180 / Math.PI) % 360)}°</strong>
                <button onClick={() => rotateObject(Math.PI / 12)} title="Rotate clockwise 15 degrees"><RotateCw size={17} /></button></div>
            </div>
            <div className="inspector-section">
              <div className="section-title"><span>Actual dimensions</span><Ruler size={16} /></div>
              <div className="measurements">
                <div><small>Width</small><strong>{formatSize(selectedProduct.dimensions.width)}</strong></div>
                <div><small>Height</small><strong>{formatSize(selectedProduct.dimensions.height)}</strong></div>
                <div><small>Depth</small><strong>{formatSize(selectedProduct.dimensions.depth)}</strong></div>
              </div>
              <span className="locked-scale"><ShieldCheck size={15} /> Real-world scale locked</span>
            </div>
            <button className="remove-button" type="button" onClick={deleteSelected}><Trash2 size={17} /> Remove from room</button>
          </> : <>
            <div className="empty-selection"><div><Armchair size={31} strokeWidth={1.5} /></div><h3>No furniture selected</h3><p>Click a furniture piece in the room to edit its position and rotation.</p></div>
            <div className="inspector-section"><div className="section-title"><span>Room dimensions</span><Ruler size={16} /></div>
              <div className="measurements"><div><small>Width</small><strong>{layout.width.toFixed(1)} m</strong></div><div><small>Depth</small><strong>{layout.depth.toFixed(1)} m</strong></div></div>
              <p className="inspector-help">These are sample dimensions for the draft editor, not measurements from your camera.</p></div>
          </>}
          <div className="inspector-bottom"><span className="info-dot"><CircleHelp size={15} /></span> Spatial mapping and live AR will be connected after device testing.</div>
        </aside>
      </div>

      {showDeviceInfo && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowDeviceInfo(false) }}>
        <section className="info-modal" role="dialog" aria-modal="true" aria-label="AR compatibility">
          <div className="modal-icon"><ScanLine size={24} /></div>
          <h2>AR Compatibility Check</h2>
          <p>RoomFit's 3D editor is ready. Real-world floor tracking and room recognition are separate features that require device and provider validation.</p>
          <div className="cap-list">
            {([
              ['Secure connection', capabilities?.secureContext],
              ['Camera API available', capabilities?.camera],
              ['WebGL 2 graphics', capabilities?.webgl2],
              ['WebXR API available', capabilities?.webxr],
              ['Immersive WebXR AR', capabilities?.immersiveAr],
            ] as [string, boolean | undefined][]).map(([label, value]) => <div key={label}><span>{label}</span><strong className={value ? 'ok' : 'not-ok'}>{value === undefined ? 'Checking...' : value ? <><Check size={14} /> Yes</> : <><Minus size={14} /> No</>}</strong></div>)}
            <div><span>Room localization provider</span><strong className="not-ok"><WifiOff size={14} /> {unavailableSpatialProvider.id}</strong></div>
          </div>
          <div className="modal-note"><Info size={17} /> Browser API detection alone does not guarantee successful AR sessions. Test with the actual Android phone.</div>
          <button className="btn btn-dark full-button" onClick={() => setShowDeviceInfo(false)}>Back to Design Studio</button>
        </section>
      </div>}
      {toast && <div className="toast" role="status"><Info size={17} /> {toast}</div>}
    </div>
  )
}

function SlidersMark() {
  return <div className="inspector-icon"><Maximize2 size={17} /></div>
}

function App() {
  const [view, setView] = useState<'camera' | 'ar' | 'draft' | 'studio'>('camera')
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null)
  const [showCompatibility, setShowCompatibility] = useState(false)
  const [notification, setNotification] = useState('')
  useEffect(() => {
    getDeviceCapabilities().then(setCapabilities).catch(() => setCapabilities(null))
  }, [])

  return <>
    {view === 'camera' && <CameraHome
      capabilities={capabilities}
      onLaunchAR={() => setView('ar')}
      onOpenStudio={() => setView('studio')}
      onOpenDraft={() => setView('draft')}
      onCheckDevice={() => setShowCompatibility(true)}
    />}
    {view === 'ar' && <Suspense fallback={<div className="camera-loading">Opening camera experience…</div>}><WebXRRoom
      onExit={() => setView('camera')}
      onFallback={() => setView('studio')}
      onMessage={(message) => setNotification(message)}
    /></Suspense>}
    {view === 'studio' && <Suspense fallback={<div className="camera-loading">Opening furniture camera…</div>}><CameraFurnitureStudio onBack={() => setView('camera')}/></Suspense>}
    {view === 'draft' && <DigitalDraft onHome={() => setView('camera')} />}

    {showCompatibility && <div className="camera-compat-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCompatibility(false) }}>
      <section className="camera-compat-dialog" role="dialog" aria-modal="true" aria-label="Device compatibility">
        <h2>Device compatibility</h2>
        <p>Live AR requires an Android browser with immersive WebXR, hit testing, and ARCore support. A standard camera preview alone does not provide floor tracking.</p>
        <div className="camera-compat-items">
          {([
            ['Secure origin (HTTPS or localhost)', capabilities?.secureContext],
            ['Camera API', capabilities?.camera],
            ['WebGL 2', capabilities?.webgl2],
            ['WebXR API', capabilities?.webxr],
            ['Immersive AR session', capabilities?.immersiveAr],
          ] as [string, boolean | undefined][]).map(([name, supported]) =>
            <div key={name}><span>{name}</span><strong>{supported === undefined ? 'Checking' : supported ? 'Yes' : 'No'}</strong></div>
          )}
        </div>
        <p className="camera-compat-note">Cross-session room mapping and automatic relocalization are not implemented yet.</p>
        <button type="button" onClick={() => setShowCompatibility(false)}>Close</button>
      </section>
    </div>}
    {notification && <div className="camera-alert" role="status" onClick={() => setNotification('')}>
      {notification} <button type="button" aria-label="Dismiss" onClick={() => setNotification('')}>×</button>
    </div>}
  </>
}

export default App
