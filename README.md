# ACG — Three.js + Vite

A minimal Three.js app served with Vite that loads a GLTF model (Tokyo Tower) with simple lighting and a transparent renderer background.

## Prerequisites
- Node.js 18+ installed

## Quick Start
Run the dev server:

```zsh
npm install
npx vite
```
Open `http://localhost:5173` in your browser.

## Production Build (optional)
Create an optimized build and preview it locally:

```zsh
npx vite build
npx vite preview
```
The site is served from the generated `dist/` folder.

## Project Structure
```
index.html          # Entry HTML
main.js             # Three.js scene and model loader
package.json        # Dependencies and scripts
models/
  tokyo_tower/
    scene.gltf
    scene.bin
    textures/
    license.txt
public/             # Static assets served as-is by Vite (optional)
```

## How It Works
- Uses `three` and `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`).
- Renders a scene with ambient + directional lights and an alpha (transparent) background.
- Loads the model via:
  ```js
  loadModel('./models/tokyo_tower/scene.gltf', new THREE.Vector3(0, 0, 0), 0.8);
  ```

## GLTF Assets Notes
GLTF files often reference a binary (`scene.bin`) and textures by relative paths.

- For dev (`npx vite`), the current relative path may work.
- For production builds, Vite reliably serves files placed under `public/` or referenced via `new URL()` at build time.

Recommended for production:
1. Move the model under `public/models/tokyo_tower/`:
   ```zsh
   mkdir -p public/models
   mv models/tokyo_tower public/models/
   ```
2. Load with an absolute path:
   ```js
   loader.load('/models/tokyo_tower/scene.gltf', (gltf) => { /* ... */ });
   ```

Alternatively, keep assets in `models/` and load with Vite’s URL helper:
```js
const url = new URL('./models/tokyo_tower/scene.gltf', import.meta.url);
loader.load(url.href, (gltf) => { /* ... */ });
```

## Troubleshooting
- 404s for `scene.bin` or textures: move the assets under `public/` or switch to `new URL(..., import.meta.url)`.
- Model too dark/invisible: ensure lights are present (ambient + directional are already added in `main.js`).
- Transparent background: set via `new THREE.WebGLRenderer({ alpha: true })` and `renderer.setClearColor(0x000000, 0)`.

## License
- The Tokyo Tower model includes `models/tokyo_tower/license.txt`. Please review and comply with its terms when sharing or deploying.
