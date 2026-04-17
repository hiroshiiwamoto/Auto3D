/* Auto3D - View Mode Manager */
var Auto3D = Auto3D || {};

Auto3D.Views = (function() {
  var currentView = 'perspective';
  var transitioning = false;
  var transitionStart = null;
  var transitionDuration = 400;
  var fromPos, fromTarget, toPos, toTarget;

  var drawPlaneVisualizer = null;

  var viewConfigs = {
    perspective: {
      useOrtho: false,
      position: new THREE.Vector3(5000, 3000, 6000),
      target: new THREE.Vector3(0, 500, 0),
      label: 'PERSPECTIVE'
    },
    side: {
      useOrtho: true,
      position: new THREE.Vector3(10000, 700, 0),
      target: new THREE.Vector3(0, 700, 0),
      frustum: 3000,
      label: 'SIDE VIEW',
      drawPlane: 'side'
    },
    front: {
      useOrtho: true,
      position: new THREE.Vector3(0, 700, 10000),
      target: new THREE.Vector3(0, 700, 0),
      frustum: 2500,
      label: 'FRONT VIEW',
      drawPlane: 'front'
    },
    top: {
      useOrtho: true,
      position: new THREE.Vector3(0, 10000, 0),
      target: new THREE.Vector3(0, 0, 0),
      frustum: 4000,
      label: 'TOP VIEW',
      drawPlane: 'top'
    },
    rear: {
      useOrtho: true,
      position: new THREE.Vector3(0, 700, -10000),
      target: new THREE.Vector3(0, 700, 0),
      frustum: 2500,
      label: 'REAR VIEW',
      drawPlane: 'rear'
    }
  };

  function getDrawPlane(viewName) {
    var cfg = viewConfigs[viewName];
    if (!cfg || !cfg.drawPlane) {
      // Perspective: use ground plane
      return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }

    switch (cfg.drawPlane) {
      case 'side':
        // Side view: camera on +X axis, we see YZ. Draw on X=0 plane (YZ plane)
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
      case 'front':
      case 'rear':
        // Front/Rear view: camera on +/-Z axis, we see XY. Draw on Z=0 plane (XY plane)
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      case 'top':
        // Top view: camera on +Y axis, we see XZ. Draw on Y=0 plane (XZ plane)
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      default:
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }
  }

  function switchView(viewName) {
    if (viewName === currentView || transitioning) return;

    var cfg = viewConfigs[viewName];
    if (!cfg) return;

    var controls = Auto3D.Scene.controls;
    var activeCamera;

    if (cfg.useOrtho) {
      activeCamera = Auto3D.Scene.orthoCamera;
      Auto3D.Scene.setOrthoFrustum(cfg.frustum);
      controls.enabled = false;
    } else {
      activeCamera = Auto3D.Scene.perspCamera;
      controls.enabled = true;
    }

    // Animate transition
    fromPos = activeCamera.position.clone();
    fromTarget = controls.target.clone();
    toPos = cfg.position.clone();
    toTarget = cfg.target.clone();
    transitionStart = performance.now();
    transitioning = true;

    Auto3D.Scene.setActiveCamera(activeCamera);
    currentView = viewName;

    // Update UI
    document.getElementById('view-label').textContent = cfg.label;
    document.getElementById('status-view').textContent = 'View: ' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
    document.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update drawing plane visualizer if draw mode is active
    if (Auto3D.state && Auto3D.state.tool === 'draw') {
      setTimeout(showDrawPlane, 50);
    } else {
      hideDrawPlane();
    }
  }

  function updateTransition() {
    if (!transitioning) return;

    var elapsed = performance.now() - transitionStart;
    var t = Math.min(elapsed / transitionDuration, 1);
    // Smooth step
    t = t * t * (3 - 2 * t);

    var cam = Auto3D.Scene.camera;
    cam.position.lerpVectors(fromPos, toPos, t);

    var controls = Auto3D.Scene.controls;
    controls.target.lerpVectors(fromTarget, toTarget, t);

    if (currentView !== 'perspective') {
      cam.lookAt(controls.target);
    }

    if (t >= 1) {
      transitioning = false;
      if (currentView === 'perspective') {
        controls.update();
      }
    }
  }

  function init() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchView(btn.dataset.view);
      });
    });

    // Register render callback for transitions
    Auto3D.Scene.onRender(updateTransition);
  }

  function showDrawPlane() {
    hideDrawPlane();
    var cfg = viewConfigs[currentView];
    if (!cfg || !cfg.drawPlane) return;

    var size = 6000;
    var geo = new THREE.PlaneGeometry(size, size);
    var mat = new THREE.MeshBasicMaterial({
      color: 0x0096ff,
      opacity: 0.05,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    drawPlaneVisualizer = new THREE.Mesh(geo, mat);

    // Grid lines on the plane
    var gridSize = size;
    var gridDiv = 24;
    var gridGeo = new THREE.BufferGeometry();
    var verts = [];
    var step = gridSize / gridDiv;
    for (var i = 0; i <= gridDiv; i++) {
      var v = -gridSize / 2 + i * step;
      verts.push(-gridSize / 2, v, 0, gridSize / 2, v, 0);
      verts.push(v, -gridSize / 2, 0, v, gridSize / 2, 0);
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    var gridMat = new THREE.LineBasicMaterial({
      color: 0x0096ff,
      opacity: 0.15,
      transparent: true,
      depthWrite: false
    });
    var gridLines = new THREE.LineSegments(gridGeo, gridMat);
    drawPlaneVisualizer.add(gridLines);

    // Orient plane based on view
    switch (cfg.drawPlane) {
      case 'side':
        drawPlaneVisualizer.rotation.y = Math.PI / 2;
        break;
      case 'front':
      case 'rear':
        // default orientation (facing +Z)
        break;
      case 'top':
        drawPlaneVisualizer.rotation.x = Math.PI / 2;
        break;
    }

    Auto3D.Scene.scene.add(drawPlaneVisualizer);
  }

  function hideDrawPlane() {
    if (drawPlaneVisualizer) {
      Auto3D.Scene.scene.remove(drawPlaneVisualizer);
      if (drawPlaneVisualizer.geometry) drawPlaneVisualizer.geometry.dispose();
      if (drawPlaneVisualizer.material) drawPlaneVisualizer.material.dispose();
      drawPlaneVisualizer = null;
    }
  }

  return {
    init: init,
    switchView: switchView,
    getCurrentView: function() { return currentView; },
    getDrawPlane: function() { return getDrawPlane(currentView); },
    getViewConfig: function() { return viewConfigs[currentView]; },
    showDrawPlane: showDrawPlane,
    hideDrawPlane: hideDrawPlane
  };
})();
