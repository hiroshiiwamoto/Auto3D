/* Auto3D - Utility Functions */
var Auto3D = Auto3D || {};

Auto3D.Utils = {
  _idCounter: 0,

  generateId: function() {
    return 'id_' + (++this._idCounter) + '_' + Date.now().toString(36);
  },

  screenToWorld: function(event, camera, plane) {
    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    var intersection = new THREE.Vector3();
    var hit = raycaster.ray.intersectPlane(plane, intersection);
    return hit ? intersection : null;
  },

  screenToMeshIntersection: function(event, camera, objects) {
    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(objects, true);
    return intersects.length > 0 ? intersects[0] : null;
  },

  nearestPointOnCurve: function(curve, point, segments) {
    segments = segments || 100;
    var best = null;
    var bestDist = Infinity;
    var bestT = 0;
    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var p = curve.getPoint(t);
      var d = p.distanceTo(point);
      if (d < bestDist) {
        bestDist = d;
        best = p;
        bestT = t;
      }
    }
    return { point: best, t: bestT, distance: bestDist };
  },

  clamp: function(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  lerp: function(a, b, t) {
    return a + (b - a) * t;
  },

  lerpVec3: function(a, b, t) {
    return new THREE.Vector3(
      this.lerp(a.x, b.x, t),
      this.lerp(a.y, b.y, t),
      this.lerp(a.z, b.z, t)
    );
  },

  disposeMesh: function(mesh) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(function(m) { m.dispose(); });
      } else {
        mesh.material.dispose();
      }
    }
  },

  createGradientTexture: function(color1, color2, vertical) {
    var canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  },

  snapToGrid: function(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
  },

  snapVec3ToGrid: function(vec, gridSize) {
    return new THREE.Vector3(
      this.snapToGrid(vec.x, gridSize),
      this.snapToGrid(vec.y, gridSize),
      this.snapToGrid(vec.z, gridSize)
    );
  }
};
