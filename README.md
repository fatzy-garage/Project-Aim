# Mobile Aim Lab — Web Edition

A Vite + React + TypeScript project using Babylon.js for a real 3D scene and camera-based ray picking.

## Run locally

1. Install Node.js 20 or newer.
2. Extract this ZIP.
3. In the project folder run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite. For Android testing, use the computer's LAN address and ensure both devices are on the same network.
5. Create a production build with `npm run build`; preview it with `npm run preview`.

## Included in this starter build

- Babylon.js 3D arena, first-person camera, real 3D target meshes and scene ray picking.
- Six selectable training mode presets and a session timer.
- Touch camera-look zone, on-screen fire control, pause/resume and exit confirmation.
- Local FOV and sensitivity preferences.
- IndexedDB session history, summary statistics and reset action.
- Responsive landscape-first interface, portrait rotate prompt, manifest and service-worker caching.

## Important implementation notes

This is a playable first build / foundation, not a claim that every item in the long specification is production-complete. In particular, gyroscope aiming and permission handling, a custom drill editor, crosshair editor, audio controls, detailed per-mode analytics, true reaction-time measurement, advanced tracking metrics, adaptive quality controls, offline-first asset precaching, install icons, and device-level QA still need implementation and testing. Some mode presets currently share simplified target-spawn logic. The reaction-time field is intentionally stored as zero until proper reaction measurement is added.

The service worker caches the app shell and runtime GET responses; a first online load is needed before offline use. Add real PWA icon files before publishing. Actual Android Chrome performance and multi-touch behavior must be tested on target devices.

## Suggested next development milestones

1. Complete pointer-ID multi-touch arbitration and desktop mouse-look controls.
2. Implement distinct, validated logic and metrics for each training mode.
3. Add custom presets, crosshair/audio/gyro settings and quality scaling.
4. Add PWA icons and deterministic precaching of production assets.
5. Run browser/device tests, then tune performance for specific Android hardware.
