/* Auto3D - Material System */
var Auto3D = Auto3D || {};

Auto3D.Materials = (function() {
  var activeMaterial;

  var presets = {
    red: { color: 0xc0392b, metalness: 0.9, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1 },
    black: { color: 0x111111, metalness: 0.95, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    white: { color: 0xf5f5f5, metalness: 0.8, roughness: 0.25, clearcoat: 1.0, clearcoatRoughness: 0.1 },
    blue: { color: 0x1a5276, metalness: 0.9, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1 },
    silver: { color: 0xc0c0c0, metalness: 0.95, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }
  };

  function createMaterial(params) {
    return new THREE.MeshPhysicalMaterial({
      color: params.color || 0xc0392b,
      metalness: params.metalness !== undefined ? params.metalness : 0.9,
      roughness: params.roughness !== undefined ? params.roughness : 0.2,
      clearcoat: params.clearcoat !== undefined ? params.clearcoat : 1.0,
      clearcoatRoughness: params.clearcoatRoughness !== undefined ? params.clearcoatRoughness : 0.1,
      side: THREE.DoubleSide
    });
  }

  function updateMaterial(params) {
    if (!activeMaterial) return;
    if (params.color !== undefined) activeMaterial.color.setHex(params.color);
    if (params.metalness !== undefined) activeMaterial.metalness = params.metalness;
    if (params.roughness !== undefined) activeMaterial.roughness = params.roughness;
    if (params.clearcoat !== undefined) activeMaterial.clearcoat = params.clearcoat;
    if (params.clearcoatRoughness !== undefined) activeMaterial.clearcoatRoughness = params.clearcoatRoughness;
    activeMaterial.needsUpdate = true;
  }

  function applyPreset(name) {
    var p = presets[name];
    if (!p) return;
    updateMaterial(p);

    // Update UI
    document.getElementById('mat-color').value = '#' + p.color.toString(16).padStart(6, '0');
    document.getElementById('mat-metalness').value = p.metalness * 100;
    document.getElementById('mat-roughness').value = p.roughness * 100;
    document.getElementById('mat-clearcoat').value = p.clearcoat * 100;

    document.querySelector('.dim-val[data-for="mat-metalness"]').textContent = p.metalness.toFixed(1);
    document.querySelector('.dim-val[data-for="mat-roughness"]').textContent = p.roughness.toFixed(1);
    document.querySelector('.dim-val[data-for="mat-clearcoat"]').textContent = p.clearcoat.toFixed(1);
  }

  function init() {
    activeMaterial = createMaterial(presets.red);

    // Color picker
    var colorInput = document.getElementById('mat-color');
    if (colorInput) {
      colorInput.addEventListener('input', function() {
        var hex = parseInt(colorInput.value.substring(1), 16);
        updateMaterial({ color: hex });
      });
    }

    // Sliders
    var sliders = {
      'mat-metalness': 'metalness',
      'mat-roughness': 'roughness',
      'mat-clearcoat': 'clearcoat'
    };

    Object.keys(sliders).forEach(function(sliderId) {
      var slider = document.getElementById(sliderId);
      var prop = sliders[sliderId];
      if (slider) {
        slider.addEventListener('input', function() {
          var val = parseInt(slider.value) / 100;
          var params = {};
          params[prop] = val;
          updateMaterial(params);
          var valSpan = document.querySelector('.dim-val[data-for="' + sliderId + '"]');
          if (valSpan) valSpan.textContent = val.toFixed(1);
        });
      }
    });

    // Presets
    document.querySelectorAll('.preset-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        applyPreset(btn.dataset.preset);
      });
    });
  }

  return {
    init: init,
    getActiveMaterial: function() { return activeMaterial; },
    createMaterial: createMaterial,
    updateMaterial: updateMaterial,
    applyPreset: applyPreset
  };
})();
