# Auto3D - 3D Car Design Tool

A web-based 3D car design/sketching tool. Like sketching with pencil and paper, but in 3D.

## Features

- **Dimension Scaffold** - Set wheelbase, width, height, overhangs, ground clearance (mm)
- **Curve Drawing** - Draw Catmull-Rom spline curves to define car profiles and cross-sections
- **Multi-View** - Perspective, Side, Front, Top, Rear views with smooth transitions
- **Surface Lofting** - Generate 3D surfaces from selected curves
- **Automatic Mirroring** - Symmetric design with one-side editing
- **Environment Presets** - Studio, Outdoor, Showroom, Sunset rendering
- **PBR Materials** - Metallic car paint with clearcoat, color presets
- **Undo/Redo** - Full history support

## Quick Start

Open `index.html` in a web browser. No build tools or server required.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| D | Draw curve tool |
| E | Edit points tool |
| S | Surface tool |
| X | Delete tool |
| 1-5 | Switch views |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Enter | Finish drawing curve |
| Escape | Cancel drawing |
| Delete | Delete selected curves |

## Workflow

1. Set car dimensions in the right panel
2. Switch to **Side View** (key 2) and use **Draw** tool (key D) to sketch the side profile
3. Switch to **Front View** (key 3) and draw cross-sections
4. Select multiple curves with **Select** tool (Shift+click) or **Surface** tool
5. Click **Loft Selected Curves** to generate a 3D surface
6. Choose an environment and material for rendering

## Tech Stack

- Three.js r160 (via CDN)
- Vanilla HTML/CSS/JavaScript
- No build tools required
