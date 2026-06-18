import opencascadeInit from './occ/opencascade.wasm.js';

let oc = null;

async function buildBox(grid_x, grid_y, height_u) {
  const w = grid_x * 42;
  const d = grid_y * 42;
  const h = height_u * 7;
  const box = new oc.BRepPrimAPI_MakeBox_2(new oc.gp_Pnt_3(0,0,0), w, d, h).Shape();
  new oc.BRepMesh_IncrementalMesh_2(box, 0.5, false, 0.5, false);
  return box;
}

async function buildVase(base_r, amplitude, frequency, height, segments) {
  const loft = new oc.BRepOffsetAPI_ThruSections(false, false, 1.0e-6);
  for (let i = 0; i <= segments; i++) {
    const z = (i / segments) * height;
    const t = i / segments;
    const r = base_r + amplitude * Math.sin(frequency * Math.PI * 2 * t);
    const wire = makeCircleWire(r, z);
    loft.AddWire(wire);
  }
  loft.Build();
  const shape = loft.Shape();
  new oc.BRepMesh_IncrementalMesh_2(shape, 0.5, false, 0.5, false);
  return shape;
}

function makeCircleWire(r, z) {
  const ax = new oc.gp_Ax2_3(new oc.gp_Pnt_3(0, 0, z), new oc.gp_Dir_4(0, 0, 1));
  const circ = new oc.gp_Circ_2(ax, r);
  const edge = new oc.BRepBuilderAPI_MakeEdge_8(circ).Edge();
  return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
}

function extractMesh(shape) {
  const verts = [];
  const exp = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while (exp.More()) {
    const face = oc.TopoDS.Face_1(exp.Current());
    const loc = new oc.TopLoc_Location_1();
    const tri = oc.BRep_Tool.Triangulation(face, loc).get();
    if (tri) {
      const trsf = loc.IsIdentity() ? null : loc.Transformation();
      for (let i = 1; i <= tri.NbTriangles(); i++) {
        const t = tri.Triangle(i);
        [t.Value(1), t.Value(2), t.Value(3)].forEach(n => {
          let p = tri.Node(n);
          if (trsf) p = p.Transformed(trsf);
          verts.push(p.X(), p.Y(), p.Z());
        });
      }
    }
    exp.Next();
  }
  return new Float32Array(verts);
}

async function init() {
  self.postMessage({ status: "loading" });
  try {
    oc = await opencascadeInit({
      locateFile: () => new URL('./occ/opencascade.wasm.wasm', import.meta.url).href
    });
    self.postMessage({ status: "ready" });
    const arr = extractMesh(await buildBox(1, 1, 3));
    self.postMessage({ status: "mesh", verts: arr }, [arr.buffer]);
  } catch (err) {
    self.postMessage({ status: "error", message: err.message });
  }
}

self.onmessage = async (e) => {
  if (!oc) return;
  try {
    let shape;
    if (e.data.type === 'build') {
      shape = await buildBox(e.data.grid_x, e.data.grid_y, e.data.height_u);
    } else if (e.data.type === 'vase') {
      shape = await buildVase(e.data.base_r, e.data.amplitude, e.data.frequency, e.data.height, 20);
    }
    if (shape) {
      const arr = extractMesh(shape);
      self.postMessage({ status: "mesh", verts: arr }, [arr.buffer]);
    }
  } catch (err) {
    self.postMessage({ status: "error", message: err.message });
  }
}

init();