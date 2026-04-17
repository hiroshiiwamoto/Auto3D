/* Auto3D - Application Entry Point */
var Auto3D = Auto3D || {};

// Global state
Auto3D.state = {
  tool: 'select',
  mirror: true,
  snap: true
};

(function() {
  function init() {
    // Check Three.js loaded
    if (typeof THREE === 'undefined') {
      document.body.innerHTML = '<div style="color:#ff6b6b;padding:40px;font-family:sans-serif;">' +
        '<h2>Three.js failed to load</h2>' +
        '<p>Check your internet connection. Auto3D requires Three.js from a CDN.</p></div>';
      return;
    }
    // Initialize modules in order
    Auto3D.Scene.init();
    Auto3D.Views.init();
    Auto3D.CarDimensions.init();
    Auto3D.CurveTools.init();
    Auto3D.SurfaceEngine.init();
    Auto3D.Environment.init();
    Auto3D.Materials.init();
    Auto3D.History.init();

    // Tool buttons
    setupToolButtons();

    // Undo/Redo buttons
    setupUndoRedo();

    // Mirror/Snap checkboxes
    setupToggles();

    // Keyboard shortcuts
    setupKeyboard();

    // Collapsible sections
    setupCollapsibles();

    // Welcome overlay
    setupWelcome();

    // Demo + Clear buttons
    setupDemoClear();

    console.log('Auto3D initialized');
  }

  function showToast(msg, duration) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function() {
      toast.classList.remove('show');
    }, duration || 2500);
  }
  Auto3D.showToast = showToast;

  function setupWelcome() {
    var overlay = document.getElementById('welcome-overlay');
    if (!overlay) return;

    document.getElementById('welcome-start').addEventListener('click', function() {
      overlay.classList.add('hidden');
      showToast('Press D to draw, 2 for side view', 3000);
    });
    document.getElementById('welcome-demo').addEventListener('click', function() {
      overlay.classList.add('hidden');
      loadDemoCar();
    });
  }

  function setupDemoClear() {
    var demoBtn = document.getElementById('btn-demo');
    if (demoBtn) {
      demoBtn.addEventListener('click', loadDemoCar);
    }
    var clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (confirm('Clear all curves and surfaces?')) {
          Auto3D.CurveTools.clearAll();
          // Clear surfaces too
          var surfs = Auto3D.SurfaceEngine.getSurfaces();
          var surfIds = Array.from(surfs.keys());
          surfIds.forEach(function(id) { Auto3D.SurfaceEngine.removeSurface(id); });
          showToast('Cleared');
        }
      });
    }
  }

  function loadDemoCar() {
    Auto3D.CurveTools.clearAll();

    // Create a simple car silhouette (side view) and cross-sections
    var curves = [
      // Side silhouette
      {
        name: 'Side Profile',
        plane: 'side',
        points: [
          [0, 400, -2350],  // rear bumper bottom
          [0, 800, -2300],  // rear trunk start
          [0, 1350, -1400], // rear pillar top
          [0, 1400, -200],  // roof mid
          [0, 1380, 900],   // windshield top
          [0, 850, 1500],   // hood front
          [0, 400, 2350]    // front bumper
        ]
      },
      // Front cross-section (at car's front, z=1500)
      {
        name: 'Front Section',
        plane: 'front',
        points: [
          [-900, 400, 1500],
          [-850, 700, 1500],
          [-600, 900, 1500],
          [0, 950, 1500],
          [600, 900, 1500],
          [850, 700, 1500],
          [900, 400, 1500]
        ]
      },
      // Mid cross-section (roof highest point, z=0)
      {
        name: 'Mid Section',
        plane: 'front',
        points: [
          [-925, 400, 0],
          [-900, 800, 0],
          [-700, 1250, 0],
          [0, 1400, 0],
          [700, 1250, 0],
          [900, 800, 0],
          [925, 400, 0]
        ]
      },
      // Rear cross-section (at z=-1500)
      {
        name: 'Rear Section',
        plane: 'front',
        points: [
          [-900, 400, -1500],
          [-880, 750, -1500],
          [-650, 1200, -1500],
          [0, 1320, -1500],
          [650, 1200, -1500],
          [880, 750, -1500],
          [900, 400, -1500]
        ]
      }
    ];

    var crossSectionIds = [];
    curves.forEach(function(c, i) {
      var points = c.points.map(function(p) { return new THREE.Vector3(p[0], p[1], p[2]); });
      var data = {
        id: Auto3D.Utils.generateId(),
        name: c.name,
        type: c.plane === 'side' ? 'profile' : 'cross-section',
        plane: c.plane,
        closed: false,
        visible: true,
        color: [0xff6b6b, 0x51cf66, 0x339af0, 0xfcc419][i % 4]
      };
      Auto3D.CurveTools.restoreCurve(data, points);
      if (c.plane === 'front') {
        crossSectionIds.push(data.id);
      }
    });

    // Auto-generate surface from the 3 cross-sections
    if (crossSectionIds.length >= 2) {
      Auto3D.SurfaceEngine.generateSurface(crossSectionIds, {
        resolution: 32,
        mirror: false  // cross-sections already span both sides
      });
    }

    // Switch to perspective to see the result
    Auto3D.Views.switchView('perspective');

    showToast('Demo car loaded with surface. Rotate to view.', 3500);
  }
  Auto3D.loadDemoCar = loadDemoCar;

  function setTool(toolName) {
    Auto3D.state.tool = toolName;

    // Update UI
    document.querySelectorAll('.tool-btn').forEach(function(btn) {
      var btnTool = btn.id.replace('tool-', '');
      btn.classList.toggle('active', btnTool === toolName);
    });

    // Update body class for cursor
    document.body.className = 'tool-' + toolName;

    // Update status
    var names = { select: 'Select', draw: 'Draw Curve', edit: 'Edit Points', surface: 'Surface', erase: 'Delete' };
    document.getElementById('status-tool').textContent = 'Tool: ' + (names[toolName] || toolName);

    // Update hints
    var hints = {
      select: 'Click curve to select. Shift+click for multi-select.',
      draw: 'Click to place points. Double-click or Enter to finish. Escape to cancel.',
      edit: 'Click control point to select, drag to move.',
      surface: 'Select 2+ curves, then click "Loft Selected Curves".',
      erase: 'Click a curve to delete it.'
    };
    document.getElementById('status-hint').textContent = hints[toolName] || '';

    // Cancel any drawing in progress when switching away from draw
    if (toolName !== 'draw') {
      Auto3D.CurveTools.cancelDrawing();
    }

    // Show/hide drawing plane visualizer
    if (toolName === 'draw') {
      // Auto-switch to side view if in perspective (better for drawing)
      if (Auto3D.Views.getCurrentView() === 'perspective' && !Auto3D._hasDrawnOnce) {
        Auto3D.Views.switchView('side');
        Auto3D._hasDrawnOnce = true;
      } else {
        Auto3D.Views.showDrawPlane();
      }
      showToast('Click to place points. Press Enter to finish.', 3500);
    } else {
      Auto3D.Views.hideDrawPlane();
    }

    // Orbit controls: enable in select, surface mode; disable in others for ortho
    var isOrthoView = Auto3D.Views.getCurrentView() !== 'perspective';
    if (toolName === 'draw' || toolName === 'edit') {
      if (isOrthoView) Auto3D.Scene.controls.enabled = false;
    } else {
      Auto3D.Scene.controls.enabled = !isOrthoView;
    }
  }

  function setupToolButtons() {
    var tools = ['select', 'draw', 'edit', 'surface', 'erase'];
    tools.forEach(function(tool) {
      var btn = document.getElementById('tool-' + tool);
      if (btn) {
        btn.addEventListener('click', function() {
          setTool(tool);
        });
      }
    });
  }

  function setupUndoRedo() {
    document.getElementById('btn-undo').addEventListener('click', function() {
      Auto3D.History.undo();
    });
    document.getElementById('btn-redo').addEventListener('click', function() {
      Auto3D.History.redo();
    });
  }

  function setupToggles() {
    document.getElementById('chk-mirror').addEventListener('change', function() {
      Auto3D.state.mirror = this.checked;
      Auto3D.CurveTools.updateAllVisuals();
    });
    document.getElementById('chk-snap').addEventListener('change', function() {
      Auto3D.state.snap = this.checked;
    });
  }

  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Don't handle if focused on input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.key) {
        case 'v': case 'V': setTool('select'); break;
        case 'd': case 'D': setTool('draw'); break;
        case 'e': case 'E': setTool('edit'); break;
        case 's': case 'S':
          if (!e.ctrlKey && !e.metaKey) setTool('surface');
          break;
        case 'x': case 'X': setTool('erase'); break;
        case '1': Auto3D.Views.switchView('perspective'); break;
        case '2': Auto3D.Views.switchView('side'); break;
        case '3': Auto3D.Views.switchView('front'); break;
        case '4': Auto3D.Views.switchView('top'); break;
        case '5': Auto3D.Views.switchView('rear'); break;
        case 'z': case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              Auto3D.History.redo();
            } else {
              Auto3D.History.undo();
            }
          }
          break;
        case 'y': case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            Auto3D.History.redo();
          }
          break;
      }
    });
  }

  function setupCollapsibles() {
    document.querySelectorAll('.section-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var targetId = header.getAttribute('data-toggle');
        if (!targetId) return;
        var body = document.getElementById(targetId);
        if (body) {
          body.classList.toggle('collapsed');
          header.classList.toggle('collapsed');
        }
      });
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
