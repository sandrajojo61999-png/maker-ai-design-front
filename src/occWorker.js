import opencascadeInit from './occ/opencascade.wasm.js';

let oc = null;

async function buildMesh(grid_x, grid_y, height_u, wall) {
  const w = grid_x * 42;
  const d = grid_y * 42;
  const h = height_u * 7;

  const box = new oc.BRepPrimAPI_MakeBox_2(new oc.gp_Pnt_3(0,0,0), w, d, h).Shape();
  new oc.BRepMesh_IncrementalMesh_2(box, 0.5, false, 0.5, false);

  const verts = [];
  const exp = new oc.TopExp_Explorer_2(box, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
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

  const arr = new Float32Array(verts);
  self.postMessage({ status: "mesh", verts: arr }, [arr.buffer]);
}

async function init() {
  self.postMessage({ status: "loading" });
  try {
    oc = await opencascadeInit({
      locateFile: () => new URL('./occ/opencascade.wasm.wasm', import.meta.url).href
    });
    self.postMessage({ status: "ready" });
    await buildMesh(1, 1, 3, 1.2);
  } catch (err) {
    self.postMessage({ status: "error", message: err.message });
  }
}

self.onmessage = async (e) => {
  if (e.data.type === 'build') {
    await buildMesh(e.data.grid_x, e.data.grid_y, e.data.height_u, e.data.wall);
  }
}

init();