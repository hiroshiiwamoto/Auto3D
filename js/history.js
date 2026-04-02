/* Auto3D - Undo/Redo History */
var Auto3D = Auto3D || {};

Auto3D.History = (function() {
  var undoStack = [];
  var redoStack = [];
  var MAX_STATES = 50;

  function serializeState() {
    var curves = Auto3D.state ? Auto3D.state.curves : new Map();
    var data = [];
    curves.forEach(function(curve, id) {
      data.push({
        id: curve.id,
        name: curve.name,
        type: curve.type,
        plane: curve.plane,
        points: curve.points.map(function(p) { return { x: p.x, y: p.y, z: p.z }; }),
        closed: curve.closed,
        visible: curve.visible,
        color: curve.color
      });
    });
    return JSON.stringify(data);
  }

  function restoreState(json) {
    if (!Auto3D.CurveTools) return;
    var data = JSON.parse(json);
    Auto3D.CurveTools.clearAll();
    data.forEach(function(c) {
      var points = c.points.map(function(p) { return new THREE.Vector3(p.x, p.y, p.z); });
      Auto3D.CurveTools.restoreCurve(c, points);
    });
  }

  return {
    save: function() {
      var state = serializeState();
      undoStack.push(state);
      if (undoStack.length > MAX_STATES) undoStack.shift();
      redoStack = [];
    },

    undo: function() {
      if (undoStack.length < 2) return;
      var current = undoStack.pop();
      redoStack.push(current);
      var prev = undoStack[undoStack.length - 1];
      restoreState(prev);
    },

    redo: function() {
      if (redoStack.length === 0) return;
      var state = redoStack.pop();
      undoStack.push(state);
      restoreState(state);
    },

    init: function() {
      undoStack = [];
      redoStack = [];
      this.save();
    }
  };
})();
