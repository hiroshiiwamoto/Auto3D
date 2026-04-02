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

    console.log('Auto3D initialized');
  }

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
