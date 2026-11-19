import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
})
try {
  const ctx = await browser.newContext({viewport:{width:390,height:844}})
  await ctx.addInitScript(() => {
    let pipeline
    let camera
    window.__hitMode = 'table'
    window.XR8 = {
      GlTextureRenderer: {pipelineModule:()=>({name:'camera'})},
      Threejs: {
        pipelineModule:()=>({name:'three'}),
        xrScene:()=>{
          const T=window.THREE
          camera=new T.PerspectiveCamera(70,1,.01,30)
          return {camera,scene:new T.Scene(),renderer:{
            shadowMap:{enabled:false,type:0},outputColorSpace:'',
          }}
        },
      },
      XrController: {
        pipelineModule:()=>({name:'slam'}),
        configure:()=>{},
        updateCameraProjectionMatrix:()=>{},
        recenter:()=>{},
        hitTest: (x,y,types)=>{
          window.__hitArguments={x,y,types}
          if(window.__hitMode==='throw') throw Error('SDK test failure')
          if(window.__hitMode==='feature') return [{
            type:'FEATURE_POINT',position:{x:0,y:0.75,z:0},
          }]
          if(window.__hitMode==='table') return [{
            type:'DETECTED_SURFACE',position:{x:0,y:0.75,z:0},
          }]
          if(window.__hitMode==='mismatch') return [{
            type:'DETECTED_SURFACE',position:{x:1.1,y:0,z:0},
          }]
          return [{
            type:'ESTIMATED_SURFACE',position:{x:0.02,y:0.02,z:0},
          }]
        },
      },
      addCameraPipelineModules:modules=>{
        pipeline=modules.find(m=>m.name==='roomfit-slam-test')
      },
      run:({canvas})=>{
        pipeline.onStart({canvas})
        camera.lookAt(0,0,0)
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld(true)
        window.__frame=(withPose=true)=>pipeline.onUpdate({
          processCpuResult:{reality:{
            trackingStatus:'NORMAL',
            position:withPose?{x:0,y:1.6,z:2}:undefined,
            trackingReason:'UNSPECIFIED',
          }},
        })
      },
    }
  })
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  await page.route(/cdn\.jsdelivr\.net\/npm\/@8thwall\//,route=>
    route.fulfill({status:200,contentType:'text/javascript',body:''}))
  const url=new URL('slam-lab.html',process.env.ROOMFIT_TEST_URL ??
    'http://127.0.0.1:5173/').toString()
  await page.goto(url)
  await page.getByRole('button',{name:'Start 8th Wall SLAM test'}).click()
  await page.waitForFunction(()=>
    document.getElementById('asset-status')?.dataset.readyId==='wooden-stool')

  const frame=async(mode,withPose=true)=>{
    await page.evaluate(({mode,withPose})=>{
      window.__hitMode=mode
      window.__frame(withPose)
    },{mode,withPose})
    return {
      quality:await page.locator('#floor-quality').textContent(),
      enabled:await page.locator('#place-furniture').isEnabled(),
    }
  }
  const table=await frame('table')
  assert.equal(table.enabled,false,'table height must block floor placement')
  assert.match(table.quality,/table surface|furniture\/table/i)
  assert.ok(await page.evaluate(()=>window.__hitArguments.types.includes('FEATURE_POINT')))
  await page.waitForTimeout(255)
  const mismatch=await frame('mismatch')
  assert.equal(mismatch.enabled,false,'disagreement must block floor placement')
  assert.match(mismatch.quality,/disagrees/i)
  await page.waitForTimeout(255)
  const surface=await frame('floor')
  assert.equal(surface.enabled,true,'consistent engine surface must allow placement')
  assert.match(surface.quality,/Surface agrees/i)
  await page.waitForTimeout(255)
  const feature=await frame('feature')
  assert.equal(feature.enabled,true,'feature-point-only SDK must retain estimated-plane fallback')
  assert.match(feature.quality,/Estimated floor/i)
  await page.waitForTimeout(255)
  const noPose=await frame('feature',false)
  assert.equal(noPose.enabled,false,'NORMAL without a camera pose must not allow placement')
  await page.waitForTimeout(255)
  const degraded=await frame('throw')
  assert.equal(degraded.enabled,true,'unsupported hit-test API should retain estimated-plane fallback')
  assert.match(degraded.quality,/Estimated floor/)
  assert.deepEqual(errors,[],'browser had no script errors')
  console.log('RoomFit floor hit-test: blocked tabletop & contradictory surfaces, accepted floor & feature-only fallback, rejected missing pose, survived API errors.')
} finally {
  await browser.close()
}
