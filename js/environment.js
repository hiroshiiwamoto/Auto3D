/* Auto3D - Environment Presets */
var Auto3D = Auto3D || {};

Auto3D.Environment = (function() {
  var currentEnv = 'studio';
  var envLights = [];

  function clearEnvLights() {
    var scene = Auto3D.Scene.scene;
    envLights.forEach(function(light) {
      scene.remove(light);
    });
    envLights = [];
  }

  function applyStudio() {
    var scene = Auto3D.Scene.scene;
    clearEnvLights();

    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = null;

    // Ground
    var ground = Auto3D.Scene.groundPlane;
    if (ground) {
      ground.material.color.setHex(0x222222);
      ground.material.roughness = 0.8;
      ground.material.metalness = 0.2;
      ground.visible = true;
    }

    // Three-point lighting
    var ambient = new THREE.AmbientLight(0x404040, 0.5);
    envLights.push(ambient);

    var hemi = new THREE.HemisphereLight(0x8888aa, 0x444422, 0.6);
    envLights.push(hemi);

    var key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5000, 8000, 3000);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -5000;
    key.shadow.camera.right = 5000;
    key.shadow.camera.top = 5000;
    key.shadow.camera.bottom = -5000;
    envLights.push(key);

    var fill = new THREE.DirectionalLight(0x6688cc, 0.4);
    fill.position.set(-3000, 4000, -2000);
    envLights.push(fill);

    var rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(-2000, 3000, 5000);
    envLights.push(rim);

    envLights.forEach(function(l) { scene.add(l); });

    Auto3D.Scene.renderer.toneMappingExposure = 1.0;
  }

  function applyOutdoor() {
    var scene = Auto3D.Scene.scene;
    clearEnvLights();

    // Sky gradient
    var skyTexture = Auto3D.Utils.createGradientTexture('#1a3a5c', '#87ceeb');
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.00003);

    // Ground - road/asphalt
    var ground = Auto3D.Scene.groundPlane;
    if (ground) {
      ground.material.color.setHex(0x555555);
      ground.material.roughness = 0.9;
      ground.material.metalness = 0.1;
      ground.visible = true;
    }

    var ambient = new THREE.AmbientLight(0x8899aa, 0.4);
    envLights.push(ambient);

    var hemi = new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.8);
    envLights.push(hemi);

    var sun = new THREE.DirectionalLight(0xffffee, 1.5);
    sun.position.set(4000, 10000, 6000);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -5000;
    sun.shadow.camera.right = 5000;
    sun.shadow.camera.top = 5000;
    sun.shadow.camera.bottom = -5000;
    envLights.push(sun);

    envLights.forEach(function(l) { scene.add(l); });

    Auto3D.Scene.renderer.toneMappingExposure = 1.2;
  }

  function applyShowroom() {
    var scene = Auto3D.Scene.scene;
    clearEnvLights();

    scene.background = new THREE.Color(0xf0f0f0);
    scene.fog = new THREE.Fog(0xf0f0f0, 15000, 30000);

    // Ground - reflective white
    var ground = Auto3D.Scene.groundPlane;
    if (ground) {
      ground.material.color.setHex(0xe0e0e0);
      ground.material.roughness = 0.15;
      ground.material.metalness = 0.0;
      ground.visible = true;
    }

    var ambient = new THREE.AmbientLight(0xffffff, 0.6);
    envLights.push(ambient);

    // Multiple soft lights from different directions
    var positions = [
      [0, 8000, 0],
      [5000, 6000, 3000],
      [-5000, 6000, 3000],
      [0, 6000, -5000],
      [3000, 4000, 5000],
      [-3000, 4000, 5000]
    ];
    positions.forEach(function(pos) {
      var light = new THREE.DirectionalLight(0xffffff, 0.4);
      light.position.set(pos[0], pos[1], pos[2]);
      envLights.push(light);
    });

    envLights.forEach(function(l) { scene.add(l); });

    Auto3D.Scene.renderer.toneMappingExposure = 0.9;
  }

  function applySunset() {
    var scene = Auto3D.Scene.scene;
    clearEnvLights();

    var skyTexture = Auto3D.Utils.createGradientTexture('#1a0a2e', '#ff6b35');
    scene.background = skyTexture;
    scene.fog = new THREE.FogExp2(0xff8855, 0.00004);

    var ground = Auto3D.Scene.groundPlane;
    if (ground) {
      ground.material.color.setHex(0x443322);
      ground.material.roughness = 0.7;
      ground.material.metalness = 0.3;
      ground.visible = true;
    }

    var ambient = new THREE.AmbientLight(0x332244, 0.3);
    envLights.push(ambient);

    var hemi = new THREE.HemisphereLight(0xff8855, 0x223355, 0.5);
    envLights.push(hemi);

    var sun = new THREE.DirectionalLight(0xff9944, 1.8);
    sun.position.set(-6000, 2000, 4000);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -5000;
    sun.shadow.camera.right = 5000;
    sun.shadow.camera.top = 5000;
    sun.shadow.camera.bottom = -5000;
    envLights.push(sun);

    var bounce = new THREE.DirectionalLight(0x6644aa, 0.3);
    bounce.position.set(3000, 3000, -3000);
    envLights.push(bounce);

    envLights.forEach(function(l) { scene.add(l); });

    Auto3D.Scene.renderer.toneMappingExposure = 1.3;
  }

  var envFunctions = {
    studio: applyStudio,
    outdoor: applyOutdoor,
    showroom: applyShowroom,
    sunset: applySunset
  };

  function setEnvironment(name) {
    if (envFunctions[name]) {
      currentEnv = name;
      envFunctions[name]();

      document.querySelectorAll('.env-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.env === name);
      });
    }
  }

  function init() {
    document.querySelectorAll('.env-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setEnvironment(btn.dataset.env);
      });
    });

    // Apply default
    applyStudio();
  }

  return {
    init: init,
    setEnvironment: setEnvironment,
    getCurrentEnvironment: function() { return currentEnv; }
  };
})();
