/* Auto3D - Surface Generation Engine */
var Auto3D = Auto3D || {};

Auto3D.SurfaceEngine = (function() {
  var surfaces = new Map();

  function loftCurves(curveDataArray, resolution) {
    resolution = resolution || 32;

    if (curveDataArray.length < 2) return null;

    // Create splines from each curve's control points
    var splines = curveDataArray.map(function(cd) {
      return new THREE.CatmullRomCurve3(cd.points, cd.closed, 'catmullrom', 0.5);
    });

    // Sample each spline at uniform intervals
    var crossSections = splines.map(function(spline) {
      var pts = [];
      for (var i = 0; i <= resolution; i++) {
        pts.push(spline.getPoint(i / resolution));
      }
      return pts;
    });

    // Build geometry by connecting adjacent cross-sections
    var positions = [];
    var normals = [];
    var uvs = [];
    var indices = [];

    var rows = crossSections.length;
    var cols = resolution + 1;

    // Create vertex grid
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var pt = crossSections[row][col];
        positions.push(pt.x, pt.y, pt.z);
        uvs.push(col / resolution, row / (rows - 1));
        // Temporary normal (will compute properly)
        normals.push(0, 1, 0);
      }
    }

    // Create triangle indices
    for (var row = 0; row < rows - 1; row++) {
      for (var col = 0; col < cols - 1; col++) {
        var a = row * cols + col;
        var b = row * cols + col + 1;
        var c = (row + 1) * cols + col;
        var d = (row + 1) * cols + col + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    // Build BufferGeometry
    var geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
  }

  function createMirroredGeometry(geometry) {
    var mirrorGeo = geometry.clone();
    var pos = mirrorGeo.getAttribute('position');
    for (var i = 0; i < pos.count; i++) {
      pos.setX(i, -pos.getX(i));
    }
    // Flip normals for mirrored side
    var idx = mirrorGeo.getIndex();
    if (idx) {
      var arr = Array.from(idx.array);
      for (var i = 0; i < arr.length; i += 3) {
        var tmp = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = tmp;
      }
      mirrorGeo.setIndex(arr);
    }
    mirrorGeo.computeVertexNormals();
    return mirrorGeo;
  }

  function generateSurface(curveIds, options) {
    options = options || {};
    var resolution = options.resolution || 32;
    var mirror = options.mirror !== false;

    // Get curve data in order
    var curvesMap = Auto3D.CurveTools.getCurves();
    var curveDataArray = [];
    curveIds.forEach(function(id) {
      var cd = curvesMap.get(id);
      if (cd) curveDataArray.push(cd);
    });

    if (curveDataArray.length < 2) return null;

    var geometry = loftCurves(curveDataArray, resolution);
    if (!geometry) return null;

    // Material
    var material = Auto3D.Materials ? Auto3D.Materials.getActiveMaterial() : new THREE.MeshPhysicalMaterial({
      color: 0xc0392b,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    var id = Auto3D.Utils.generateId();

    // Main surface mesh
    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'surface_' + id;

    var group = new THREE.Group();
    group.name = 'surfaceGroup_' + id;
    group.add(mesh);

    // Mirror
    if (mirror) {
      var mirrorGeo = createMirroredGeometry(geometry);
      var mirrorMesh = new THREE.Mesh(mirrorGeo, material);
      mirrorMesh.castShadow = true;
      mirrorMesh.receiveShadow = true;
      group.add(mirrorMesh);
    }

    Auto3D.Scene.scene.add(group);

    var surfaceData = {
      id: id,
      name: 'Surface ' + (surfaces.size + 1),
      curveIds: curveIds.slice(),
      resolution: resolution,
      mirror: mirror,
      group: group,
      mesh: mesh,
      material: material
    };

    surfaces.set(id, surfaceData);
    updateSurfaceList();

    return surfaceData;
  }

  function removeSurface(id) {
    var sd = surfaces.get(id);
    if (sd) {
      Auto3D.Scene.scene.remove(sd.group);
      sd.group.children.forEach(function(child) {
        if (child.geometry) child.geometry.dispose();
      });
      surfaces.delete(id);
      updateSurfaceList();
    }
  }

  function regenerateSurface(id) {
    var sd = surfaces.get(id);
    if (!sd) return;
    var curveIds = sd.curveIds;
    var resolution = sd.resolution;
    var mirror = sd.mirror;
    var material = sd.material;
    removeSurface(id);
    // Re-generate with same settings
    var curvesMap = Auto3D.CurveTools.getCurves();
    var curveDataArray = [];
    curveIds.forEach(function(cid) {
      var cd = curvesMap.get(cid);
      if (cd) curveDataArray.push(cd);
    });
    if (curveDataArray.length < 2) return;

    var geometry = loftCurves(curveDataArray, resolution);
    if (!geometry) return;

    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    var group = new THREE.Group();
    group.name = 'surfaceGroup_' + id;
    group.add(mesh);

    if (mirror) {
      var mirrorGeo = createMirroredGeometry(geometry);
      var mirrorMesh = new THREE.Mesh(mirrorGeo, material);
      mirrorMesh.castShadow = true;
      mirrorMesh.receiveShadow = true;
      group.add(mirrorMesh);
    }

    Auto3D.Scene.scene.add(group);

    surfaces.set(id, {
      id: id,
      name: sd.name,
      curveIds: curveIds,
      resolution: resolution,
      mirror: mirror,
      group: group,
      mesh: mesh,
      material: material
    });
  }

  function updateSurfaceList() {
    var list = document.getElementById('surface-list');
    if (!list) return;
    list.innerHTML = '';
    surfaces.forEach(function(sd, id) {
      var div = document.createElement('div');
      div.className = 'curve-item';
      div.textContent = sd.name + ' (' + sd.curveIds.length + ' curves)';
      div.addEventListener('click', function() {
        // Could select surface for material editing
      });
      var delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.style.cssText = 'margin-left:auto;background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:14px;';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeSurface(id);
      });
      div.appendChild(delBtn);
      list.appendChild(div);
    });
  }

  function init() {
    // Loft button
    var loftBtn = document.getElementById('btn-loft');
    if (loftBtn) {
      loftBtn.addEventListener('click', function() {
        var selectedIds = Array.from(Auto3D.CurveTools.getSelectedIds());
        if (selectedIds.length < 2) {
          alert('Select at least 2 curves to loft');
          return;
        }
        var resolution = parseInt(document.getElementById('surface-resolution').value) || 32;
        generateSurface(selectedIds, {
          resolution: resolution,
          mirror: Auto3D.state.mirror
        });
      });
    }

    // Resolution slider
    var resSlider = document.getElementById('surface-resolution');
    if (resSlider) {
      resSlider.addEventListener('input', function() {
        var valSpan = document.querySelector('.dim-val[data-for="surface-resolution"]');
        if (valSpan) valSpan.textContent = resSlider.value;
      });
    }
  }

  return {
    init: init,
    generateSurface: generateSurface,
    removeSurface: removeSurface,
    regenerateSurface: regenerateSurface,
    getSurfaces: function() { return surfaces; }
  };
})();
