/* Auto3D - Car Dimensions Scaffold */
var Auto3D = Auto3D || {};

Auto3D.CarDimensions = (function() {
  var scaffoldGroup;
  var wheelGroups = [];

  var dimensions = {
    wheelbase: 2700,
    width: 1850,
    height: 1450,
    frontOverhang: 900,
    rearOverhang: 1000,
    groundClearance: 150
  };

  function getTotalLength() {
    return dimensions.frontOverhang + dimensions.wheelbase + dimensions.rearOverhang;
  }

  function buildScaffold() {
    if (scaffoldGroup) {
      Auto3D.Scene.scene.remove(scaffoldGroup);
    }

    scaffoldGroup = new THREE.Group();
    scaffoldGroup.name = 'scaffold';

    var mat = new THREE.LineBasicMaterial({ color: 0x0096ff, opacity: 0.3, transparent: true });
    var matDim = new THREE.LineBasicMaterial({ color: 0x0096ff, opacity: 0.15, transparent: true });

    var L = getTotalLength();
    var W = dimensions.width;
    var H = dimensions.height;
    var GC = dimensions.groundClearance;
    var WB = dimensions.wheelbase;
    var FO = dimensions.frontOverhang;

    // Car centered at origin, front facing +Z
    var halfW = W / 2;
    var frontZ = L / 2;
    var rearZ = -L / 2;
    var frontAxleZ = frontZ - FO;
    var rearAxleZ = frontAxleZ - WB;

    // Bounding box wireframe
    var boxPoints = [
      // Bottom rectangle
      new THREE.Vector3(-halfW, GC, frontZ),
      new THREE.Vector3(halfW, GC, frontZ),
      new THREE.Vector3(halfW, GC, rearZ),
      new THREE.Vector3(-halfW, GC, rearZ),
      new THREE.Vector3(-halfW, GC, frontZ),
    ];
    var boxGeo = new THREE.BufferGeometry().setFromPoints(boxPoints);
    scaffoldGroup.add(new THREE.Line(boxGeo, matDim));

    // Top rectangle
    var topPoints = [
      new THREE.Vector3(-halfW, H, frontZ),
      new THREE.Vector3(halfW, H, frontZ),
      new THREE.Vector3(halfW, H, rearZ),
      new THREE.Vector3(-halfW, H, rearZ),
      new THREE.Vector3(-halfW, H, frontZ),
    ];
    var topGeo = new THREE.BufferGeometry().setFromPoints(topPoints);
    scaffoldGroup.add(new THREE.Line(topGeo, matDim));

    // Vertical edges
    var verticals = [
      [[-halfW, GC, frontZ], [-halfW, H, frontZ]],
      [[halfW, GC, frontZ], [halfW, H, frontZ]],
      [[halfW, GC, rearZ], [halfW, H, rearZ]],
      [[-halfW, GC, rearZ], [-halfW, H, rearZ]]
    ];
    verticals.forEach(function(pair) {
      var geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pair[0][0], pair[0][1], pair[0][2]),
        new THREE.Vector3(pair[1][0], pair[1][1], pair[1][2])
      ]);
      scaffoldGroup.add(new THREE.Line(geo, matDim));
    });

    // Center lines
    var clLong = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, GC, frontZ + 200),
      new THREE.Vector3(0, GC, rearZ - 200)
    ]);
    scaffoldGroup.add(new THREE.Line(clLong, mat));

    // Axle lines
    var frontAxleGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW - 100, GC, frontAxleZ),
      new THREE.Vector3(halfW + 100, GC, frontAxleZ)
    ]);
    scaffoldGroup.add(new THREE.Line(frontAxleGeo, mat));

    var rearAxleGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW - 100, GC, rearAxleZ),
      new THREE.Vector3(halfW + 100, GC, rearAxleZ)
    ]);
    scaffoldGroup.add(new THREE.Line(rearAxleGeo, mat));

    // Wheels (simple circles)
    var wheelRadius = GC * 0.9;
    var tireRadius = 330;
    var wheelPositions = [
      [-halfW + 100, tireRadius, frontAxleZ],
      [halfW - 100, tireRadius, frontAxleZ],
      [-halfW + 100, tireRadius, rearAxleZ],
      [halfW - 100, tireRadius, rearAxleZ]
    ];

    wheelGroups = [];
    wheelPositions.forEach(function(pos) {
      var wheelGeo = new THREE.RingGeometry(tireRadius - 30, tireRadius, 32);
      var wheelMat = new THREE.MeshBasicMaterial({
        color: 0x0096ff, opacity: 0.2, transparent: true, side: THREE.DoubleSide
      });
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.rotation.y = Math.PI / 2;

      // Tire outline
      var circleGeo = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, tireRadius, 0, Math.PI * 2).getPoints(32)
          .map(function(p) { return new THREE.Vector3(0, p.y, p.x); })
      );
      var circleLine = new THREE.Line(circleGeo, mat);
      circleLine.position.set(pos[0], pos[1], pos[2]);

      scaffoldGroup.add(wheel);
      scaffoldGroup.add(circleLine);
      wheelGroups.push(wheel);
    });

    // Ground clearance line
    var gcLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW - 200, GC, 0),
      new THREE.Vector3(halfW + 200, GC, 0)
    ]);
    var gcMat = new THREE.LineDashedMaterial({
      color: 0x0096ff, opacity: 0.2, transparent: true,
      dashSize: 50, gapSize: 30
    });
    var gcLine = new THREE.Line(gcLineGeo, gcMat);
    gcLine.computeLineDistances();
    scaffoldGroup.add(gcLine);

    Auto3D.Scene.scene.add(scaffoldGroup);
  }

  function updateDimension(key, value) {
    if (dimensions[key] !== undefined) {
      dimensions[key] = parseInt(value);
      buildScaffold();
    }
  }

  function init() {
    // Wire up sliders
    var sliderIds = {
      'dim-wheelbase': 'wheelbase',
      'dim-width': 'width',
      'dim-height': 'height',
      'dim-front-overhang': 'frontOverhang',
      'dim-rear-overhang': 'rearOverhang',
      'dim-ground-clearance': 'groundClearance'
    };

    Object.keys(sliderIds).forEach(function(sliderId) {
      var slider = document.getElementById(sliderId);
      var dimKey = sliderIds[sliderId];
      if (slider) {
        slider.addEventListener('input', function() {
          updateDimension(dimKey, slider.value);
          var valSpan = document.querySelector('.dim-val[data-for="' + sliderId + '"]');
          if (valSpan) valSpan.textContent = slider.value;
        });
      }
    });

    buildScaffold();
  }

  return {
    init: init,
    getDimensions: function() { return Object.assign({}, dimensions); },
    getTotalLength: getTotalLength,
    updateDimension: updateDimension,
    rebuild: buildScaffold
  };
})();
