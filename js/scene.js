/* Auto3D - Scene Management */
var Auto3D = Auto3D || {};

Auto3D.Scene = (function() {
  var renderer, scene, perspCamera, orthoCamera, activeCamera;
  var orbitControls;
  var gridHelper, groundPlane;
  var renderCallbacks = [];

  function init() {
    var canvas = document.getElementById('viewport');

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Perspective Camera
    perspCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 100000);
    perspCamera.position.set(5000, 3000, 6000);
    perspCamera.lookAt(0, 500, 0);

    // Orthographic Camera
    var aspect = window.innerWidth / window.innerHeight;
    var frustum = 3000;
    orthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 1, 100000
    );
    orthoCamera.position.set(5000, 3000, 6000);
    orthoCamera.lookAt(0, 500, 0);

    activeCamera = perspCamera;

    // Orbit Controls
    if (!THREE.OrbitControls) {
      console.error('Auto3D: THREE.OrbitControls not loaded. Check CDN.');
      alert('Three.js OrbitControls failed to load. Please check your internet connection.');
      return;
    }
    orbitControls = new THREE.OrbitControls(perspCamera, canvas);
    orbitControls.target.set(0, 500, 0);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.minDistance = 1000;
    orbitControls.maxDistance = 30000;
    orbitControls.update();

    // Grid (lighting added by environment.js)
    setupGrid();

    // Ground
    var groundGeo = new THREE.PlaneGeometry(40000, 40000);
    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2
    });
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -1;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Resize
    window.addEventListener('resize', onResize);

    // Render loop
    animate();
  }

  function setupDefaultLighting() {
    // Remove existing lights
    scene.children = scene.children.filter(function(c) { return !c.isLight; });

    var ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);

    var hemi = new THREE.HemisphereLight(0x8888aa, 0x444422, 0.6);
    scene.add(hemi);

    var key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5000, 8000, 3000);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -5000;
    key.shadow.camera.right = 5000;
    key.shadow.camera.top = 5000;
    key.shadow.camera.bottom = -5000;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0x6688cc, 0.4);
    fill.position.set(-3000, 4000, -2000);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(-2000, 3000, 5000);
    scene.add(rim);
  }

  function setupGrid() {
    if (gridHelper) scene.remove(gridHelper);

    gridHelper = new THREE.Group();

    var mainGrid = new THREE.GridHelper(10000, 20, 0x444444, 0x333333);
    mainGrid.position.y = 0;
    gridHelper.add(mainGrid);

    // Axes
    var axesMat = {
      x: new THREE.LineBasicMaterial({ color: 0xff4444, opacity: 0.5, transparent: true }),
      y: new THREE.LineBasicMaterial({ color: 0x44ff44, opacity: 0.5, transparent: true }),
      z: new THREE.LineBasicMaterial({ color: 0x4444ff, opacity: 0.5, transparent: true })
    };
    var len = 5000;

    var xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-len,0,0), new THREE.Vector3(len,0,0)]);
    gridHelper.add(new THREE.Line(xGeo, axesMat.x));

    var zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-len), new THREE.Vector3(0,0,len)]);
    gridHelper.add(new THREE.Line(zGeo, axesMat.z));

    scene.add(gridHelper);
  }

  function onResize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h);

    perspCamera.aspect = w / h;
    perspCamera.updateProjectionMatrix();

    var aspect = w / h;
    var frustum = orthoCamera.top;
    orthoCamera.left = -frustum * aspect;
    orthoCamera.right = frustum * aspect;
    orthoCamera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    if (activeCamera === perspCamera) {
      orbitControls.update();
    }
    renderCallbacks.forEach(function(cb) { cb(); });
    renderer.render(scene, activeCamera);
  }

  return {
    init: init,
    get renderer() { return renderer; },
    get scene() { return scene; },
    get camera() { return activeCamera; },
    get perspCamera() { return perspCamera; },
    get orthoCamera() { return orthoCamera; },
    get controls() { return orbitControls; },
    get groundPlane() { return groundPlane; },

    setActiveCamera: function(cam) { activeCamera = cam; },

    setupDefaultLighting: setupDefaultLighting,

    setOrthoFrustum: function(size) {
      var aspect = window.innerWidth / window.innerHeight;
      orthoCamera.left = -size * aspect;
      orthoCamera.right = size * aspect;
      orthoCamera.top = size;
      orthoCamera.bottom = -size;
      orthoCamera.updateProjectionMatrix();
    },

    onRender: function(cb) { renderCallbacks.push(cb); },

    removeRenderCallback: function(cb) {
      var idx = renderCallbacks.indexOf(cb);
      if (idx >= 0) renderCallbacks.splice(idx, 1);
    }
  };
})();
