import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, CameraOff, Check, ChevronRight, CircleHelp, House, LayoutDashboard, ScanLine, ShieldCheck, Smartphone, X } from 'lucide-react'
import type { DeviceCapabilities } from '../ar/capabilities'

type Props = {
  capabilities: DeviceCapabilities | null
  onLaunchAR: () => void
  onOpenStudio: () => void
  onOpenDraft: () => void
  onCheckDevice: () => void
}
export default function CameraHome({ capabilities, onLaunchAR, onOpenStudio, onOpenDraft, onCheckDevice }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [previewActive, setPreviewActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function stopCamera() {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setPreviewActive(false)
  }

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
  }, [])

  async function previewCamera() {
    if (previewActive) {
      stopCamera()
      return
    }
    setBusy(true)
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access needs HTTPS or localhost and a supported browser.')
      }
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      stream.current = media
      if (video.current) {
        video.current.srcObject = media
        await video.current.play()
      }
      setPreviewActive(true)
    } catch (err) {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
      setError(err instanceof Error ? err.message : 'Unable to open the camera.')
    } finally {
      setBusy(false)
    }
  }

  const immersiveSupported = capabilities?.immersiveAr === true

  return <div className="camera-home">
    <header className="camera-home-header">
      <div className="brand"><div className="brand-mark"><House size={22}/></div><div className="brand-title">roomfit<span>AR</span><small>DESIGN YOUR SPACE</small></div></div>
      <nav><span className="camera-nav-active"><Camera size={15}/> Live Camera</span><button type="button" onClick={onOpenDraft}><LayoutDashboard size={15}/> Digital Draft</button></nav>
      <button className="camera-device-btn" type="button" onClick={onCheckDevice}><CircleHelp size={17}/><span>Device compatibility</span></button>
    </header>
    <main className="camera-main">
      <div className="camera-intro">
        <div className="camera-eyebrow"><span/> CAMERA-FIRST DESIGN EXPERIENCE</div>
        <h1>See it in your <em>own room.</em></h1>
        <p>Use your phone camera to see your actual room. On spatial-tracking devices, estimate floor dimensions and position textured furniture without creating an artificial room.</p>
        <div className="camera-steps"><span><Check size={16}/> Live rear camera</span><span><Check size={16}/> 3D furniture previews</span><span><Check size={16}/> Tracked measurements on supported phones*</span></div>
      </div>
      <section className="camera-hero-frame">
        <div className="camera-view">
          <video ref={video} autoPlay muted playsInline className={previewActive ? 'preview-on' : ''} />
          {!previewActive && <div className="camera-placeholder">
            <div className="camera-focus-mark"><ScanLine size={58} strokeWidth={1.3}/></div>
            <h2>Your room, not a simulation.</h2>
            <p>Open the camera to preview your actual surroundings.</p>
          </div>}
          <div className="camera-frame-label"><span className="camera-label-dot"/>{previewActive ? 'LIVE CAMERA PREVIEW' : 'CAMERA READY'}</div>
          <div className="camera-frame-bottom"><span><Smartphone size={15}/> Android Chrome + ARCore for tracked placement</span></div>
          {previewActive && <div className="preview-disclaimer">Camera preview only — no floor tracking or furniture anchoring in this mode.</div>}
        </div>
        <div className="camera-action-panel">
          <div className="camera-support-row"><div><b>Tracked AR + room measurement</b><p>Only on phones with immersive WebXR floor tracking. Manual camera furniture preview works separately.</p></div><span className={immersiveSupported ? 'camera-status-good' : 'camera-status-muted'}>{capabilities === null ? 'Checking…' : immersiveSupported ? 'Supported' : 'Unavailable here'}</span></div>
          <div className="camera-buttons">
            <button type="button" className="camera-primary" onClick={() => { stopCamera(); onOpenStudio() }}>
              <Camera size={18}/> Open Furniture Camera <ArrowRight size={18}/>
            </button>
            <button type="button" className="camera-secondary" onClick={onLaunchAR} disabled={!immersiveSupported}>
              <ScanLine size={18}/> Tracked AR / Measure
            </button>
            <button type="button" className="camera-secondary" onClick={() => void previewCamera()} disabled={busy}>
              {previewActive ? <CameraOff size={18}/> : <Camera size={18}/>}
              {busy ? 'Opening camera…' : previewActive ? 'Stop camera preview' : 'Preview real camera'}
            </button>
          </div>
          {error && <p className="camera-error" role="alert"><X size={16}/>{error}</p>}
          <p className="camera-footnote"><ShieldCheck size={15}/> Furniture Camera is an untracked visual composition tool, not physically anchored AR. *Measured floor points require a supported tracked AR session. This prototype does not upload camera frames.</p>
        </div>
      </section>
      <section className="camera-next camera-experiment">
        <div>
          <span className="camera-eyebrow">EXPERIMENTAL · NOT YET DEVICE-VALIDATED</span>
          <h3>Test tracked furniture placement (SLAM)</h3>
          <p>This experimental 8th Wall tracker offers 12 realistic 3D furniture models, starting with a small wooden stool. Select a piece, place it on the estimated floor and move your phone to check stability. Tracking and real-world size remain unverified on your device.</p>
        </div>
        <a href={import.meta.env.BASE_URL + "slam-lab.html"} className="camera-test-link" onClick={stopCamera}><ScanLine size={18}/> Test SLAM Tracking <ChevronRight size={16}/></a>
      </section>
      <section className="camera-next">
        <div><span className="camera-eyebrow">ALTERNATIVE WORKSPACE</span><h3>Want to plan without the camera?</h3><p>Open Digital Draft to arrange furniture in a 3D room preview. It is not live AR or physical room recognition.</p></div>
        <button type="button" onClick={onOpenDraft}><LayoutDashboard size={18}/> Open Digital Draft <ChevronRight size={16}/></button>
      </section>
    </main>
  </div>
}
