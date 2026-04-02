/* Auto3D - Curve Drawing and Editing Tools */
var Auto3D = Auto3D || {};

Auto3D.CurveTools = (function() {
  var curves = new Map();
  var selectedCurveIds = new Set();
  var drawingPoints = [];
  var previewLine = null;
  var previewGroup = null;
  var controlPointSpheres = [];
  var selectedPointIndex = -1;
  var curveColorIndex = 0;
  var curveColors = [0xff6b6b, 0x51cf66, 0x339af0, 0xfcc419, 0xcc5de8, 0x20c997, 0xff922b, 0x74c0fc];

  function getNextColor() {
    var color = curveColors[curveColorIndex % curveColors.length];
    curveColorIndex++;
    return color;
  }

  function createCurveVisual(curveData) {
    var group = new THREE.Group();
    group.name = 'curve_' + curveData.id;

    // Create spline
    if (curveData.points.length < 2) return group;

    var spline = new THREE.CatmullRomCurve3(curveData.points, curveData.closed, 'catmullrom', 0.5);
    var sampleCount = Math.max(curveData.points.length * 20, 100);
    var splinePoints = spline.getPoints(sampleCount);

    // Line
    var lineGeo = new THREE.BufferGeometry().setFromPoints(splinePoints);
    var lineMat = new THREE.LineBasicMaterial({
      color: curveData.color,
      linewidth: 2
    });
    var line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    // Mirror line (if enabled)
    if (Auto3D.state && Auto3D.state.mirror && curveData.plane !== 'top') {
      var mirrorPoints = splinePoints.map(function(p) {
        return new THREE.Vector3(-p.x, p.y, p.z);
      });
      var mirrorGeo = new THREE.BufferGeometry().setFromPoints(mirrorPoints);
      var mirrorMat = new THREE.LineBasicMaterial({
        color: curveData.color,
        linewidth: 1,
        opacity: 0.4,
        transparent: true
      });
      group.add(new THREE.Line(mirrorGeo, mirrorMat));
    }

    // Control points
    curveData.points.forEach(function(pt, idx) {
      var sphereGeo = new THREE.SphereGeometry(20, 8, 8);
      var sphereMat = new THREE.MeshBasicMaterial({ color: curveData.color });
      var sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(pt);
      sphere.userData.curveId = curveData.id;
      sphere.userData.pointIndex = idx;
      group.add(sphere);
    });

    group.userData.curveId = curveData.id;
    return group;
  }

  function updateCurveVisual(curveId) {
    var curveData = curves.get(curveId);
    if (!curveData) return;

    // Remove old visual
    var scene = Auto3D.Scene.scene;
    var old = scene.getObjectByName('curve_' + curveId);
    if (old) {
      scene.remove(old);
    }

    // Create new visual
    if (curveData.points.length >= 2) {
      var visual = createCurveVisual(curveData);
      scene.add(visual);
    }
  }

  function updateAllVisuals() {
    curves.forEach(function(curveData, id) {
      updateCurveVisual(id);
    });
  }

  function highlightSelected() {
    var scene = Auto3D.Scene.scene;
    curves.forEach(function(curveData, id) {
      var group = scene.getObjectByName('curve_' + id);
      if (!group) return;
      var isSelected = selectedCurveIds.has(id);
      group.children.forEach(function(child) {
        if (child.isLine && child.material) {
          child.material.color.setHex(isSelected ? 0xffffff : curveData.color);
        }
      });
    });
  }

  function addPointToDrawing(point) {
    var snap = Auto3D.state && Auto3D.state.snap;
    if (snap) {
      point = Auto3D.Utils.snapVec3ToGrid(point, 50);
    }
    drawingPoints.push(point.clone());
    updatePreview();
  }

  function updatePreview() {
    var scene = Auto3D.Scene.scene;
    if (previewGroup) {
      scene.remove(previewGroup);
    }

    if (drawingPoints.length === 0) return;

    previewGroup = new THREE.Group();
    previewGroup.name = 'drawPreview';

    // Points
    drawingPoints.forEach(function(pt) {
      var geo = new THREE.SphereGeometry(25, 8, 8);
      var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(pt);
      previewGroup.add(sphere);
    });

    // Preview curve
    if (drawingPoints.length >= 2) {
      var spline = new THREE.CatmullRomCurve3(drawingPoints, false, 'catmullrom', 0.5);
      var pts = spline.getPoints(drawingPoints.length * 20);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var mat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.7, transparent: true });
      previewGroup.add(new THREE.Line(geo, mat));
    }

    scene.add(previewGroup);
  }

  function finishDrawing() {
    if (drawingPoints.length < 2) {
      cancelDrawing();
      return null;
    }

    var id = Auto3D.Utils.generateId();
    var currentView = Auto3D.Views.getCurrentView();
    var planeType = 'free';
    if (currentView === 'side') planeType = 'side';
    else if (currentView === 'front') planeType = 'front';
    else if (currentView === 'rear') planeType = 'rear';
    else if (currentView === 'top') planeType = 'top';

    var curveData = {
      id: id,
      name: 'Curve ' + (curves.size + 1),
      type: 'profile',
      plane: planeType,
      points: drawingPoints.map(function(p) { return p.clone(); }),
      closed: false,
      visible: true,
      color: getNextColor()
    };

    curves.set(id, curveData);
    updateCurveVisual(id);
    cancelDrawing();
    updateCurveList();

    Auto3D.History.save();
    updateStatusCurveCount();

    return curveData;
  }

  function cancelDrawing() {
    drawingPoints = [];
    if (previewGroup) {
      Auto3D.Scene.scene.remove(previewGroup);
      previewGroup = null;
    }
  }

  function getWorldPosition(event) {
    var currentView = Auto3D.Views.getCurrentView();
    var plane = Auto3D.Views.getDrawPlane();
    return Auto3D.Utils.screenToWorld(event, Auto3D.Scene.camera, plane);
  }

  function findClickedCurvePoint(event) {
    var scene = Auto3D.Scene.scene;
    var spheres = [];
    curves.forEach(function(curveData, id) {
      var group = scene.getObjectByName('curve_' + id);
      if (group) {
        group.children.forEach(function(child) {
          if (child.isMesh && child.userData.curveId) {
            spheres.push(child);
          }
        });
      }
    });
    return Auto3D.Utils.screenToMeshIntersection(event, Auto3D.Scene.camera, spheres);
  }

  function findClickedCurve(event) {
    var scene = Auto3D.Scene.scene;
    var lines = [];
    curves.forEach(function(curveData, id) {
      var group = scene.getObjectByName('curve_' + id);
      if (group) {
        group.children.forEach(function(child) {
          if (child.isLine) {
            child.userData.curveId = id;
            lines.push(child);
          }
        });
      }
    });

    var mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 50 };
    raycaster.setFromCamera(mouse, Auto3D.Scene.camera);
    var intersects = raycaster.intersectObjects(lines, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  function selectCurve(id, additive) {
    if (!additive) {
      selectedCurveIds.clear();
    }
    if (id) {
      if (selectedCurveIds.has(id)) {
        selectedCurveIds.delete(id);
      } else {
        selectedCurveIds.add(id);
      }
    }
    highlightSelected();
    updateCurveList();
  }

  function deleteCurve(id) {
    var scene = Auto3D.Scene.scene;
    var group = scene.getObjectByName('curve_' + id);
    if (group) scene.remove(group);
    curves.delete(id);
    selectedCurveIds.delete(id);
    updateCurveList();
    updateStatusCurveCount();
    Auto3D.History.save();
  }

  function deleteSelectedCurves() {
    selectedCurveIds.forEach(function(id) {
      var scene = Auto3D.Scene.scene;
      var group = scene.getObjectByName('curve_' + id);
      if (group) scene.remove(group);
      curves.delete(id);
    });
    selectedCurveIds.clear();
    updateCurveList();
    updateStatusCurveCount();
    Auto3D.History.save();
  }

  function updateCurveList() {
    var list = document.getElementById('curve-list');
    if (!list) return;
    list.innerHTML = '';
    curves.forEach(function(curveData, id) {
      var div = document.createElement('div');
      div.className = 'curve-item' + (selectedCurveIds.has(id) ? ' selected' : '');
      div.innerHTML = '<span class="curve-color" style="background:#' + curveData.color.toString(16).padStart(6, '0') + '"></span>' + curveData.name;
      div.addEventListener('click', function(e) {
        selectCurve(id, e.shiftKey);
      });
      list.appendChild(div);
    });
  }

  function updateStatusCurveCount() {
    var el = document.getElementById('status-curves');
    if (el) el.textContent = 'Curves: ' + curves.size;
  }

  function handleMouseDown(event) {
    if (event.button !== 0) return;
    if (isOverUI(event)) return;

    var tool = Auto3D.state.tool;

    if (tool === 'draw') {
      var pos = getWorldPosition(event);
      if (pos) {
        addPointToDrawing(pos);
      }
    } else if (tool === 'select') {
      var hit = findClickedCurve(event);
      if (hit && hit.object.userData.curveId) {
        selectCurve(hit.object.userData.curveId, event.shiftKey);
      } else {
        selectCurve(null, false);
      }
    } else if (tool === 'edit') {
      var ptHit = findClickedCurvePoint(event);
      if (ptHit && ptHit.object.userData.curveId) {
        selectedCurveIds.clear();
        selectedCurveIds.add(ptHit.object.userData.curveId);
        selectedPointIndex = ptHit.object.userData.pointIndex;
        highlightSelected();
        Auto3D.Scene.controls.enabled = false;
      } else {
        selectedPointIndex = -1;
        Auto3D.Scene.controls.enabled = true;
      }
    } else if (tool === 'erase') {
      var eraseLine = findClickedCurve(event);
      if (eraseLine && eraseLine.object.userData.curveId) {
        deleteCurve(eraseLine.object.userData.curveId);
      }
    } else if (tool === 'surface') {
      var surfHit = findClickedCurve(event);
      if (surfHit && surfHit.object.userData.curveId) {
        selectCurve(surfHit.object.userData.curveId, true);
      }
    }
  }

  function handleMouseMove(event) {
    var tool = Auto3D.state.tool;

    if (tool === 'edit' && selectedPointIndex >= 0 && event.buttons === 1) {
      // Drag point
      var pos = getWorldPosition(event);
      if (pos) {
        var snap = Auto3D.state && Auto3D.state.snap;
        if (snap) pos = Auto3D.Utils.snapVec3ToGrid(pos, 50);

        selectedCurveIds.forEach(function(id) {
          var curveData = curves.get(id);
          if (curveData && curveData.points[selectedPointIndex]) {
            curveData.points[selectedPointIndex].copy(pos);
            updateCurveVisual(id);
          }
        });
      }
    }
  }

  function handleMouseUp(event) {
    if (Auto3D.state.tool === 'edit' && selectedPointIndex >= 0) {
      selectedPointIndex = -1;
      Auto3D.Scene.controls.enabled = (Auto3D.Views.getCurrentView() === 'perspective');
      Auto3D.History.save();
    }
  }

  function handleDoubleClick(event) {
    if (Auto3D.state.tool === 'draw' && drawingPoints.length >= 2) {
      finishDrawing();
    }
  }

  function handleKeyDown(event) {
    if (Auto3D.state.tool === 'draw') {
      if (event.key === 'Enter' || event.key === 'Return') {
        finishDrawing();
      } else if (event.key === 'Escape') {
        cancelDrawing();
      }
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (Auto3D.state.tool === 'select' || Auto3D.state.tool === 'erase') {
        deleteSelectedCurves();
      }
    }
  }

  function isOverUI(event) {
    var el = event.target;
    while (el) {
      if (el.id === 'toolbar' || el.id === 'panel-left' || el.id === 'panel-right' || el.id === 'status-bar') {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function init() {
    var canvas = document.getElementById('viewport');
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('keydown', handleKeyDown);
  }

  return {
    init: init,
    getCurves: function() { return curves; },
    getSelectedIds: function() { return selectedCurveIds; },
    finishDrawing: finishDrawing,
    cancelDrawing: cancelDrawing,
    updateAllVisuals: updateAllVisuals,
    updateCurveList: updateCurveList,

    clearAll: function() {
      var scene = Auto3D.Scene.scene;
      curves.forEach(function(curveData, id) {
        var group = scene.getObjectByName('curve_' + id);
        if (group) scene.remove(group);
      });
      curves.clear();
      selectedCurveIds.clear();
      updateCurveList();
      updateStatusCurveCount();
    },

    restoreCurve: function(data, points) {
      var curveData = {
        id: data.id,
        name: data.name,
        type: data.type,
        plane: data.plane,
        points: points,
        closed: data.closed,
        visible: data.visible,
        color: data.color
      };
      curves.set(data.id, curveData);
      updateCurveVisual(data.id);
      updateCurveList();
      updateStatusCurveCount();
    }
  };
})();
