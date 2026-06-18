import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function App() {
  const [status, setStatus] = useState('starting...')
  const [params, setParams] = useState({ grid_x: 1, grid_y: 1, height_u: 3, wall: 1.2 })
  const canvasRef = useRef(null)
  const workerRef = useRef(null)
  const meshRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('./occWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x222222)
    sceneRef.current = scene

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
        if (meshRef.current) {
          scene.remove(meshRef.current)
          meshRef.current.geometry.dispose()
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(data.verts, 3))
        geometry.computeVertexNormals()
        const material = new THREE.MeshStandardMaterial({ color: 0x4caf50, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshRef.current = mesh
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

  const handleChange = (key, value) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'build', ...newParams })
    }
  }

  const sliders = [
    { key: 'grid_x', label: 'Grid X', min: 1, max: 5, step: 1 },
    { key: 'grid_y', label: 'Grid Y', min: 1, max: 5, step: 1 },
    { key: 'height_u', label: 'Height Units', min: 1, max: 8, step: 1 },
    { key: 'wall', label: 'Wall (mm)', min: 1.2, max: 3.0, step: 0.1 },
  ]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: '220px', background: 'rgba(0,0,0,0.7)',
        padding: '20px', boxSizing: 'border-box', color: 'white', fontFamily: 'monospace'
      }}>
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#4caf50' }}>
          MAKER AI — Design Front
        </div>
        <div style={{ marginBottom: '16px', fontSize: '12px', color: '#aaa' }}>
          Status: {status}
        </div>
        {sliders.map(({ key, label, min, max, step }) => (
          <div key={key} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
              {label}: <span style={{ color: '#4caf50' }}>{params[key]}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step}
              value={params[key]}
              onChange={(e) => handleChange(key, parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        <div style={{ fontSize: '11px', color: '#666', marginTop: '20px' }}>
          {params.grid_x}×{params.grid_y} grid<br />
          {params.grid_x * 42}×{params.grid_y * 42}×{params.height_u * 7}mm
        </div>
      </div>
    </div>
  )
}

export default App