import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Group, WebGLRenderer } from 'three'
import { ArrowLeft, Camera, Download, Move, Plus, RotateCcw, RotateCw, Save, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { createFurnitureAsset } from '../ar/furnitureModels'
import { catalogById } from '../domain/catalog'
import './CameraFurnitureStudio.css'

type ModelId = 'velvet-sofa' | 'sofa-linen' | 'accent-chair' | 'wooden-stool' | 'monobloc-chair' | 'lounge-chair' | 'compact-wood-table' | 'round-coffee-table' | 'papasan-chair' | 'woven-rocker' | 'gallinera-chair' | 'gallinera-table'
type Piece = { id: string; model: ModelId; x: number; y: number; scale: number; yaw: number; tilt: number }
type Props = { onBack: () => void }
// New demo default; v1 saved compositions remain untouched as backup.
const STORAGE = 'roomfit:camera-studio:v2'
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const fresh = (model: ModelId): Piece => ({ id: crypto.randomUUID(), model, x: 0, y: 0, scale: 1, yaw: .15, tilt: 0 })
function restore(): Piece[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (Array.isArray(value) && value.length >= 1 && value.length <= 5) {
      const valid = value.filter((v): v is Piece => v && typeof v.id === 'string' &&
        (v.model === 'velvet-sofa' || v.model === 'sofa-linen' || v.model === 'accent-chair' ||
         v.model === 'wooden-stool' || v.model === 'monobloc-chair' || v.model === 'lounge-chair' ||
         v.model === 'compact-wood-table' || v.model === 'round-coffee-table' ||
         v.model === 'papasan-chair' || v.model === 'woven-rocker' ||
         v.model === 'gallinera-chair' || v.model === 'gallinera-table') &&
        ['x','y','scale','yaw','tilt'].every(k => Number.isFinite(v[k])))
      if (valid.length === value.length) return valid
    }
  } catch { /* use default */ }
  return [fresh('velvet-sofa')]
}

function Model({ piece, onLoaded }: { piece: Piece; onLoaded: (id: string, failed: boolean) => void }) {
  const [mesh, setMesh] = useState<Group | null>(null)
  useEffect(() => {
    let active = true
    createFurnitureAsset(catalogById[piece.model]).then(object => {
      if (!active) return
      setMesh(object)
      onLoaded(piece.id, false)
    }).catch(() => { if (active) onLoaded(piece.id, true) })
    return () => { active = false }
  }, [piece.id, piece.model, onLoaded])
  return mesh ? <group position={[piece.x * 1.8, -1 + piece.y * 1.85, 0]}
    scale={piece.scale} rotation={[piece.tilt, piece.yaw, 0]}><primitive object={mesh}/></group> : null
}

export default function CameraFurnitureStudio({ onBack }: Props) {
  const [pieces, setPieces] = useState<Piece[]>(restore)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gesture, setGesture] = useState<'rotate'|'move'>('rotate')
  const [cameraState, setCameraState] = useState<'opening'|'ready'|'error'>('opening')
  const [cameraError, setCameraError] = useState('')
  const [assetStatus, setAssetStatus] = useState<Record<string, boolean>>({})
  const [notification, setNotification] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number,{x:number;y:number}>())
  const lastPinch = useRef<number | null>(null)
  const selected = pieces.find(p => p.id === selectedId) ?? pieces.at(-1) ?? null
  const loaded = useCallback((id: string, failed: boolean) => {
    setAssetStatus(prev => prev[id] === failed ? prev : {...prev, [id]: failed})
  }, [])
  useEffect(() => {
    let active = true
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera requires a secure HTTPS page.')
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        })
        if (!active) { s.getTracks().forEach(t=>t.stop()); return }
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play()
        }
        if (active) setCameraState('ready')
      } catch (e) {
        if (active) { setCameraState('error'); setCameraError(e instanceof Error ? e.message : 'Camera unavailable') }
      }
    }
    void start()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t=>t.stop())
      streamRef.current = null
    }
  }, [])
  useEffect(() => {
    if (!notification) return
    const timer = window.setTimeout(()=>setNotification(''), 3400)
    return () => window.clearTimeout(timer)
  }, [notification])

  const update = (change:(p:Piece)=>Piece) => {
    if (!selected) return
    setPieces(list=>list.map(p=>p.id===selected.id?change(p):p))
  }
  const onDown=(e:ReactPointerEvent<HTMLDivElement>)=>{
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    lastPinch.current=null
  }
  const onMove=(e:ReactPointerEvent<HTMLDivElement>)=>{
    const before=pointers.current.get(e.pointerId)
    if(!before)return
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if(pointers.current.size===2){
      const [a,b]=[...pointers.current.values()]
      const dist=Math.hypot(a.x-b.x,a.y-b.y)
      if(lastPinch.current!==null){
        const ratio=dist/Math.max(1,lastPinch.current)
        update(p=>({...p,scale:clamp(p.scale*ratio,.4,2.5)}))
      }
      lastPinch.current=dist;return
    }
    lastPinch.current=null
    const dx=e.clientX-before.x,dy=e.clientY-before.y
    if(gesture==='rotate')update(p=>({...p,yaw:p.yaw+dx*.014,tilt:clamp(p.tilt+dy*.004,-.45,.45)}))
    else{
      const width=stageRef.current?.clientWidth||390
      const height=stageRef.current?.clientHeight||600
      update(p=>({...p,x:clamp(p.x+dx/width*1.8,-1.2,1.2),y:clamp(p.y-dy/height*2,-.7,1)}))
    }
  }
  const onUp=(e:ReactPointerEvent<HTMLDivElement>)=>{
    pointers.current.delete(e.pointerId)
    lastPinch.current=null
  }
  const add=(model:ModelId)=>{
    if(pieces.length>=5){setNotification('Maximum five furniture pieces in this preview.');return}
    const p=fresh(model)
    p.x=clamp((pieces.length-1)*.24,-.9,.9)
    setPieces(old=>[...old,p]);setSelectedId(p.id)
  }
  const remove=()=>{
    if(!selected)return
    setPieces(old=>old.filter(p=>p.id!==selected.id));setSelectedId(null)
  }
  const save=()=>{
    try{localStorage.setItem(STORAGE,JSON.stringify(pieces));setNotification('Visual layout saved on this browser; not a physical room anchor.')}
    catch{setNotification('Browser storage unavailable.')}
  }
  const capture=()=>{
    const video=videoRef.current,gl=canvasRef.current,stage=stageRef.current
    if(!video||!gl||!stage||video.readyState<2){setNotification('Camera or furniture is still loading.');return}
    try{
      const output=document.createElement('canvas')
      output.width=1080;output.height=Math.round(1080*stage.clientHeight/stage.clientWidth)
      const ctx=output.getContext('2d')
      if(!ctx)throw Error('Canvas unavailable')
      const ratio=output.width/output.height,actual=video.videoWidth/video.videoHeight
      const cropW=actual>ratio?video.videoHeight*ratio:video.videoWidth
      const cropH=actual>ratio?video.videoHeight:video.videoWidth/ratio
      ctx.drawImage(video,(video.videoWidth-cropW)/2,(video.videoHeight-cropH)/2,cropW,cropH,0,0,output.width,output.height)
      ctx.drawImage(gl,0,0,output.width,output.height)
      ctx.fillStyle='#143c2abf';ctx.fillRect(12,output.height-40,285,28)
      ctx.fillStyle='#fff';ctx.font='17px sans-serif'
      ctx.fillText('RoomFit · Manual camera preview',22,output.height-20)
      const a=document.createElement('a');a.href=output.toDataURL('image/png')
      a.download='roomfit-room-furniture.png';a.click()
      setNotification('Captured camera view and textured furniture.')
    }catch{setNotification('Photo export failed. Please retry.')}
  }

  return <div className="studio-shell">
    <header className="studio-header">
      <button aria-label="Back to RoomFit home" onClick={onBack}><ArrowLeft size={20}/></button>
      <div><strong>RoomFit Camera Studio</strong><small>REAL CAMERA · TEXTURED 3D MODELS</small></div>
      <span>Manual preview</span>
    </header>
    <div className="studio-stage" ref={stageRef}>
      <video ref={videoRef} autoPlay playsInline muted className="studio-video"/>
      <div className="studio-three">
        <Canvas dpr={[1,1.6]} gl={{ alpha:true,antialias:true,preserveDrawingBuffer:true }}
          camera={{position:[0,0,5.8],fov:43,near:.1,far:30}}
          onCreated={({gl}:{gl:WebGLRenderer})=>{
            gl.setClearColor(0x000000,0);canvasRef.current=gl.domElement
          }}>
          <ambientLight intensity={1.7}/><hemisphereLight intensity={1.4} groundColor="#71847b"/>
          <directionalLight intensity={2.3} position={[3,5,6]}/>
          <directionalLight intensity={.8} position={[-3,3,-5]}/>
          {pieces.map(p=><Model key={p.id} piece={p} onLoaded={loaded}/>)}
        </Canvas>
      </div>
      <div className="studio-gestures" aria-label="Drag to move or rotate furniture, pinch to change apparent size"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}/>
      <div className="studio-camera-indicator">{cameraState==='ready'?'● LIVE REAR CAMERA':cameraState==='opening'?'OPENING CAMERA…':'CAMERA UNAVAILABLE'}</div>
      {cameraState==='error'&&<div className="studio-error" role="alert"><strong>Camera permission or browser issue</strong><p>{cameraError}</p></div>}
      <div className="studio-hint">Drag to {gesture==='rotate'?'rotate and inspect every side':'move furniture in the camera view'} · Pinch to adjust appearance</div>
      <div className="studio-disclaimer">Untracked visual composition — not real-world anchoring or accurate measurement.</div>
    </div>
    <div className="studio-tools">
      <div className="studio-tools-heading"><strong>Furniture preview</strong><button onClick={capture}><Camera size={17}/> Capture</button></div>
      <div className="studio-model-options">
        <button onClick={()=>add('gallinera-chair')}><Plus size={15}/> Filipino Gallinera Chair · 58 cm</button>
        <button onClick={()=>add('gallinera-table')}><Plus size={15}/> Filipino Gallinera Table · 83 cm</button>
        <button onClick={()=>add('papasan-chair')}><Plus size={15}/> Woven Papasan · 118 cm</button>
        <button onClick={()=>add('woven-rocker')}><Plus size={15}/> Woven Rocker · 78 cm</button>
        <button onClick={()=>add('wooden-stool')}><Plus size={15}/> Wooden stool · 27 cm</button>
        <button onClick={()=>add('monobloc-chair')}><Plus size={15}/> Plastic chair · 64 cm</button>
        <button onClick={()=>add('lounge-chair')}><Plus size={15}/> Lounge chair · 101 cm</button>
        <button onClick={()=>add('compact-wood-table')}><Plus size={15}/> Small table · 92 cm</button>
        <button onClick={()=>add('round-coffee-table')}><Plus size={15}/> Round table · 130 cm</button>
        <button onClick={()=>add('velvet-sofa')}><Plus size={15}/> Modern velvet sofa</button>
        <button onClick={()=>add('sofa-linen')}><Plus size={15}/> Vintage sofa</button>
        <button onClick={()=>add('accent-chair')}><Plus size={15}/> Accent chair</button>
      </div>
      <div className="studio-list">
        {pieces.map((p,i)=><button key={p.id} onClick={()=>setSelectedId(p.id)} className={(selected?.id===p.id)?'active':''}>
          {i+1}. {catalogById[p.model].name}{assetStatus[p.id]===true?' · Model failed to load':''}
        </button>)}
      </div>
      <div className="studio-gesture-mode">
        <button className={gesture==='rotate'?'active':''} onClick={()=>setGesture('rotate')}><RotateCw size={16}/> Rotate</button>
        <button className={gesture==='move'?'active':''} onClick={()=>setGesture('move')}><Move size={16}/> Move</button>
        <button onClick={()=>update(p=>({...p,scale:clamp(p.scale-.12,.4,2.5)}))}><ZoomOut size={16}/> Smaller</button>
        <button onClick={()=>update(p=>({...p,scale:clamp(p.scale+.12,.4,2.5)}))}><ZoomIn size={16}/> Larger</button>
      </div>
      <div className="studio-secondary">
        <button onClick={()=>update(p=>({...p,yaw:p.yaw-Math.PI/12}))}><RotateCcw size={15}/> -15°</button>
        <button onClick={()=>update(p=>({...p,yaw:p.yaw+Math.PI/12}))}><RotateCw size={15}/> +15°</button>
        <button onClick={remove} disabled={!selected}><Trash2 size={15}/> Remove</button>
        <button onClick={save}><Save size={15}/> Save layout</button>
        <button onClick={capture}><Download size={15}/> Save photo</button>
      </div>
      <p>Poly Haven assets use approximate source-model dimensions; showcase models use provisional sizing. Camera Studio is an untracked visual composition, so apparent size is not a physical meter measurement.</p>
    </div>
    {notification&&<div className="studio-toast" role="status">{notification}</div>}
  </div>
}
