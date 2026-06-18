import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function App() {
  const [status, setStatus] = useState('starting...')
  const canvasRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('./occWorker.js', import.meta.url), { type: 'module' })

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x222222)

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(100, 100, 100)

    const controls = new OrbitControls(camera, canvasRef.current)
    controls.target.set(21, 21, 21)
    camera.lookAt(21, 21, 21)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(100, 100, 100)
    scene.add(dirLight)

    worker.onmessage = (e) => {
      const data = e.data
      if (data.status === 'error') {
        setStatus('ERROR: ' + data.message)
        return
      }
      setStatus(data.status)
      if (data.status === 'mesh') {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(data.verts, 3))
        geometry.computeVertexNormals()
        const material = new THREE.MeshStandardMaterial({ color: 0x4caf50, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
      }
    }

    worker.onerror = (e) => setStatus('Worker error: ' + e.message)

    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      worker.terminate()
      renderer.dispose()
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 1, fontFamily: 'monospace' }}>
        Status: {status}
      </div>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export default App