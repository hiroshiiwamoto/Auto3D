/* Auto3D - View Mode Manager */
var Auto3D = Auto3D || {};

Auto3D.Views = (function() {
  var currentView = 'perspective';
  var transitioning = false;
  var transitionStart = null;
  var transitionDuration = 400;
  var fromPos, fromTarget, toPos, toTarget;

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
      drawPlane: 'xz-to-xy'
    },
    front: {
      useOrtho: true,
      position: new THREE.Vector3(0, 700, 10000),
      target: new THREE.Vector3(0, 700, 0),
      frustum: 2500,
      label: 'FRONT VIEW',
      drawPlane: 'yz'
    },
    top: {
      useOrtho: true,
      position: new THREE.Vector3(0, 10000, 0),
      target: new THREE.Vector3(0, 0, 0),
      frustum: 4000,
      label: 'TOP VIEW',
      drawPlane: 'xz'
    },
    rear: {
      useOrtho: true,
      position: new THREE.Vector3(0, 700, -10000),
      target: new THREE.Vector3(0, 700, 0),
      frustum: 2500,
      label: 'REAR VIEW',
      drawPlane: 'yz'
    }
  };

  function getDrawPlane(viewName) {
    var cfg = viewConfigs[viewName];
    if (!cfg || !cfg.drawPlane) return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    switch (cfg.drawPlane) {
      case 'xz-to-xy':
        // Side view: draw on XY plane (Z=0) — vertical plane facing the camera
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      case 'yz':
        // Front/Rear view: draw on YZ plane (X=0)
        return new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
      case 'xz':
        // Top view: draw on XZ plane (Y=0)
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

  return {
    init: init,
    switchView: switchView,
    getCurrentView: function() { return currentView; },
    getDrawPlane: function() { return getDrawPlane(currentView); },
    getViewConfig: function() { return viewConfigs[currentView]; }
  };
})();
