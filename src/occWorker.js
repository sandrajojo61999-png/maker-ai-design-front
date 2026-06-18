import opencascadeInit from './occ/opencascade.wasm.js';

async function init() {
  self.postMessage({ status: "loading" });
  try {
    const oc = await opencascadeInit({
      locateFile: () => new URL('./occ/opencascade.wasm.wasm', import.meta.url).href
    });

    const box = new oc.BRepPrimAPI_MakeBox_2(new oc.gp_Pnt_3(0,0,0), 42, 42, 42).Shape();
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

    self.postMessage({ status: "mesh", verts: new Float32Array(verts) }, [new Float32Array(verts).buffer]);
  } catch (err) {
    self.postMessage({ status: "error", message: err.message });
  }
}

init();