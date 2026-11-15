# Castle Stalker

A compact castle exploration pilot for mobile and desktop, with two rooms, landscape viewpoints and flight controls.

Production: https://castle-stalker.vercel.app

## Deployment

Vercel project `castle-stalker`, team `mrskydiver2015-4065s-projects`, is connected to this repository. Pushes to `main` deploy production. Root directory: `mobile-preview/dist`. Static HTML, JavaScript and assets; no build step.

## Source and audits

Blender scenes, GLB exports, Python scripts, renders and source images are preserved in this repository. The latest Blender quality pass is shown at `/blender.html`; the interactive pilot loads `assets/castle-quality.glb`, with separate realtime water and landscape. `castle.json` is retained as an earlier audit artifact.

Original migration source is preserved locally as a backup. Temporary archives, browser captures and Blender backup files are excluded from Git.

## Realtime details and navigation

`mobile-preview/dist/life.js` adds original procedural furniture, two framed studies using the existing landscape image, a woven rug, coastal grass, heather, three rowans and seven animated gulls. Blender source and exported GLB remain intact; these are a separate web scene layer. Foliage and birds use instancing to limit draw calls. Ambient animation pauses while hidden and respects reduced-motion preferences.

The Tempo controls apply 1x, 2x, 4x or 6x to walking, free flight, altitude changes and scenic orbit. Walking is subdivided into collision steps no longer than 7 cm. Speed resets to 1x on page reload.
