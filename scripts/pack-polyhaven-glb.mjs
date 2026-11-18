import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/models/polyhaven')
const names = [
  'wooden_stool_02',
  'plastic_monobloc_chair_01',
  'coffee_table_round_01',
  'small_wooden_table_01',
  'mid_century_lounge_chair',
]
const align4 = (size) => (size + 3) & ~3
for (const name of names) {
  const dir = path.join(root, name)
  const doc = JSON.parse(fs.readFileSync(path.join(dir, name + '_1k.gltf'), 'utf8'))
  if (doc.buffers.length !== 1) throw Error(name + ': requires single buffer')
  const inputBin = fs.readFileSync(path.resolve(dir, doc.buffers[0].uri))
  if (inputBin.length !== doc.buffers[0].byteLength) throw Error(name + ': wrong original binary length')
  let combined = Buffer.from(inputBin)
  for (const img of doc.images ?? []) {
    if (!img.uri) continue
    const uri = decodeURI(img.uri)
    if (/^(http|data):/i.test(uri)) throw Error(name + ': unsupported image uri ' + uri)
    const bytes = fs.readFileSync(path.resolve(dir, uri))
    const pad = align4(combined.length) - combined.length
    combined = Buffer.concat([combined, Buffer.alloc(pad), bytes])
    const imageView = doc.bufferViews.length
    doc.bufferViews.push({ buffer: 0, byteOffset: combined.length - bytes.length, byteLength: bytes.length })
    img.bufferView = imageView
    img.mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    delete img.uri
  }
  delete doc.buffers[0].uri
  doc.buffers[0].byteLength = combined.length
  const jsonRaw = Buffer.from(JSON.stringify(doc), 'utf8')
  const json = Buffer.concat([jsonRaw, Buffer.alloc(align4(jsonRaw.length) - jsonRaw.length, 0x20)])
  const bin = Buffer.concat([combined, Buffer.alloc(align4(combined.length) - combined.length)])
  const glb = Buffer.alloc(12 + 8 + json.length + 8 + bin.length)
  let offset = 0
  glb.writeUInt32LE(0x46546c67, offset); offset += 4
  glb.writeUInt32LE(2, offset); offset += 4
  glb.writeUInt32LE(glb.length, offset); offset += 4
  glb.writeUInt32LE(json.length, offset); offset += 4
  glb.writeUInt32LE(0x4e4f534a, offset); offset += 4
  json.copy(glb, offset); offset += json.length
  glb.writeUInt32LE(bin.length, offset); offset += 4
  glb.writeUInt32LE(0x004e4942, offset); offset += 4
  bin.copy(glb, offset)
  const outputPath = path.join(root, name + '.glb')
  fs.writeFileSync(outputPath, glb)
  console.log(name, (glb.length / 1048576).toFixed(2) + ' MB', 'GLB validated header:', glb.readUInt32LE(0) === 0x46546c67)
}
