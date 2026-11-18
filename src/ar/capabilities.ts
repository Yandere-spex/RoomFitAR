export interface DeviceCapabilities {
  camera: boolean
  webgl2: boolean
  webxr: boolean
  immersiveAr: boolean
  secureContext: boolean
}

export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const xr = (navigator as Navigator & {
    xr?: { isSessionSupported: (mode: string) => Promise<boolean> }
  }).xr

  let immersiveAr = false
  if (xr && window.isSecureContext) {
    try {
      immersiveAr = await xr.isSessionSupported('immersive-ar')
    } catch {
      immersiveAr = false
    }
  }

  const canvas = document.createElement('canvas')
  return {
    camera: Boolean(navigator.mediaDevices?.getUserMedia),
    webgl2: Boolean(canvas.getContext('webgl2')),
    webxr: Boolean(xr),
    immersiveAr,
    secureContext: window.isSecureContext,
  }
}
