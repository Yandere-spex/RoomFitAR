import { useEffect, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Grid, OrbitControls, ContactShadows } from '@react-three/drei'
import type { Group, WebGLRenderer } from 'three'
import { createFurnitureAsset, isPreviewAssetAvailable } from '../ar/furnitureModels'
import { catalogById } from '../domain/catalog'
import type { FurnitureProduct, PlacedObject, RoomLayout } from '../domain/types'

type Props = {
  layout: RoomLayout
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, z: number) => void
  onCanvasReady: (canvas: HTMLCanvasElement) => void
}

function Block({ size, position, color, round = false }: {
  size: [number, number, number]
  position: [number, number, number]
  color: string
  round?: boolean
}) {
  return <mesh castShadow receiveShadow position={position}>
    {round ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 24]} /> : <boxGeometry args={size} />}
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
}

function FurnitureModel({ product }: { product: FurnitureProduct }) {
  const [loadedModel, setLoadedModel] = useState<Group | null>(null)
  useEffect(() => {
    let cancelled = false
    if (isPreviewAssetAvailable(product.id)) {
      createFurnitureAsset(product)
        .then((model) => { if (!cancelled) setLoadedModel(model) })
        .catch(() => { /* keep procedural fallback for broken or offline assets */ })
    }
    return () => { cancelled = true }
  }, [product])
  if (loadedModel) return <primitive object={loadedModel} />
  const { width: w, height: h, depth: d } = product.dimensions
  const wood = product.color
  const accent = product.accent
  switch (product.kind) {
    case 'sofa':
      return <group>
        <Block size={[w, 0.25, d * 0.83]} position={[0, 0.3, 0.06]} color={wood} />
        <Block size={[w, h * 0.76, 0.18]} position={[0, h * 0.55, -d / 2 + 0.09]} color={wood} />
        {[-1, 1].map(side => <Block key={side} size={[0.18, h * 0.55, d]} position={[side * (w / 2 - 0.09), h * 0.39, 0]} color={wood} />)}
        {[-1, 1].map(side => <Block key={side} size={[w * 0.43, 0.12, d * 0.58]} position={[side * w * 0.235, 0.49, 0.11]} color={accent} />)}
      </group>
    case 'chair':
      return <group>
        <Block size={[w, 0.17, d]} position={[0, 0.43, 0]} color={wood} />
        <Block size={[w, h * 0.56, 0.15]} position={[0, 0.43 + h * 0.28, -d / 2 + 0.075]} color={accent} />
        {[-1, 1].flatMap(x => [-1, 1].map(z =>
          <Block key={x + ',' + z} size={[0.075, 0.38, 0.075]}
            position={[x * (w / 2 - 0.1), 0.19, z * (d / 2 - 0.1)]} color="#625f55" />
        ))}
      </group>
    case 'table':
      return <group>
        <Block size={[w, 0.09, d]} position={[0, h - 0.045, 0]} color={accent} />
        {[-1, 1].flatMap(x => [-1, 1].map(z =>
          <Block key={x + ',' + z} size={[0.075, h - 0.09, 0.075]}
            position={[x * (w / 2 - 0.12), (h - 0.09) / 2, z * (d / 2 - 0.12)]} color={wood} />
        ))}
      </group>
    case 'shelf':
      return <group>
        {[-1, 1].map(side =>
          <Block key={side} size={[0.07, h, d]} position={[side * (w / 2 - 0.035), h / 2, 0]} color={wood} />
        )}
        {Array.from({ length: 5 }, (_, i) =>
          <Block key={i} size={[w, 0.06, d]} position={[0, 0.04 + (h - 0.08) * i / 4, 0]} color={accent} />
        )}
      </group>
    case 'plant':
      return <group>
        <Block size={[w * 0.61, 0.34, d * 0.61]} position={[0, 0.17, 0]} color={accent} round />
        <Block size={[0.06, 0.51, 0.06]} position={[0, 0.58, 0]} color="#456449" />
        {([
          [-0.14, h * 0.67, 0.05], [0.16, h * 0.79, -0.04],
          [0.03, h * 0.92, 0.06], [-0.04, h * 0.63, 0.17],
        ] as [number, number, number][]).map((position, i) =>
          <mesh castShadow key={i} position={position}>
            <sphereGeometry args={[0.20, 12, 10]} />
            <meshStandardMaterial color={i % 2 ? '#648f69' : '#476d50'} />
          </mesh>
        )}
      </group>
    case 'bed':
      return <group>
        <Block size={[w, 0.24, d]} position={[0, 0.27, 0]} color={wood} />
        <Block size={[w, 0.22, d * 0.84]} position={[0, 0.5, 0.13]} color={accent} />
        <Block size={[w, h * 0.72, 0.11]} position={[0, h * 0.36, -d / 2 + 0.06]} color="#837361" />
        {[-1, 1].map(side =>
          <Block key={side} size={[w * 0.43, 0.09, d * 0.2]} position={[side * w * 0.24, 0.66, -d * 0.28]} color="#eee9dd" />
        )}
      </group>
  }
}

function Item({ item, selected, onSelect }: {
  item: PlacedObject
  selected: boolean
  onSelect: (id: string) => void
}) {
  const product = catalogById[item.productId]
  if (!product) return null
  return <group position={item.position} rotation={[0, item.rotationY, 0]}
    onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(item.id) }}>
    <FurnitureModel product={product} />
    {selected && <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[product.dimensions.width + 0.19, product.dimensions.depth + 0.19]} />
      <meshBasicMaterial color="#29958a" transparent opacity={0.27} depthWrite={false} />
    </mesh>}
  </group>
}

function Environment({ layout, selectedId, onSelect, onMove }: Omit<Props, 'onCanvasReady'>) {
  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (selectedId) {
      onMove(selectedId, Math.round(e.point.x * 10) / 10, Math.round(e.point.z * 10) / 10)
    } else {
      onSelect(null)
    }
  }

  return <>
    <ambientLight intensity={1.35} />
    <directionalLight castShadow position={[3, 7, 5]} intensity={2.1} shadow-mapSize={[1024, 1024]} />
    <hemisphereLight intensity={1.1} groundColor="#ad9e86" />
    <mesh receiveShadow position={[0, -0.025, 0]}>
      <boxGeometry args={[layout.width, 0.06, layout.depth]} />
      <meshStandardMaterial color="#d7cbb7" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} onClick={onFloorClick}>
      <planeGeometry args={[layout.width, layout.depth]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <Grid position={[0, 0.013, 0]} args={[layout.width, layout.depth]} cellSize={0.5}
      cellColor="#9f9b8f" sectionColor="#9f9b8f" cellThickness={0.4}
      sectionThickness={0.4} fadeDistance={20} fadeStrength={1} infiniteGrid={false} />
    <ContactShadows position={[0, 0.025, 0]} opacity={0.28} blur={2.8} scale={Math.max(layout.width, layout.depth)} />
    <mesh position={[0, 1.15, -layout.depth / 2 - 0.025]} receiveShadow>
      <boxGeometry args={[layout.width, 2.3, 0.05]} />
      <meshStandardMaterial color="#f5f2eb" />
    </mesh>
    <mesh position={[-layout.width / 2 - 0.025, 1.15, 0]} receiveShadow>
      <boxGeometry args={[0.05, 2.3, layout.depth]} />
      <meshStandardMaterial color="#ece8df" />
    </mesh>
    {layout.objects.map(item =>
      <Item key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
    )}
    <OrbitControls makeDefault enableDamping minDistance={3.6} maxDistance={14}
      maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.2} target={[0, 0.4, 0]} />
  </>
}

export default function RoomScene(props: Props) {
  return <Canvas shadows dpr={[1, 1.6]} camera={{ position: [5.5, 5.7, 7.2], fov: 43 }}
    gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
    onCreated={({ gl }: { gl: WebGLRenderer }) => props.onCanvasReady(gl.domElement)}>
    <color attach="background" args={['#edf0eb']} />
    <Environment {...props} />
  </Canvas>
}
