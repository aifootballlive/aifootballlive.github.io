# AI Football Live demo

This extends the existing Three.js scene in `game-3d.js`. The original `live-v13.html`, Supabase match, gift buttons and legacy admin continue to run unchanged. The new `/live/` and `/admin/` routes have a separate mock state and never write to the existing match database.

## Run

For OBS, run `npm install` then `npm start` in the repository, or use `football/start-demo.cmd` on Windows. Open `http://127.0.0.1:8890/admin/`; set OBS Browser Source to `http://127.0.0.1:8890/live/` at **1080×1920**. This local server owns the queue and synchronizes independent browser profiles over WebSocket. It only listens on localhost and checks the WebSocket Origin. It does not expose an admin server to the internet. Scores/config persist in ignored `football/.runtime/state.json`; waiting jobs are discarded on server restart. Click “Yayın sesini aç” once through OBS's Interact window to grant browser audio permission. Admin then controls mute, ambience and volume.

GitHub Pages also serves `/live/` and `/admin/` without a build. In this static-only mode open both in the **same browser profile on the same computer**: Web Locks elect one controller, and BroadcastChannel carries snapshots. When that controller closes another tab continues. Scores/config persist locally; queued gifts do not survive closing every tab. Queue capacity: 200 waiting shots; one gift yields at most 20 shots. Static mode requires Web Locks/BroadcastChannel support.

Use the local server URLs for an independent OBS Browser Source, or window capture for the static Pages demo. Mobile admins and multiple computers would need a separately hosted, authenticated controller. No real TikTok account connection is provisioned by this demo.

## Modules

- `config.mjs`: validated teams, models, gift mappings, settings and local persistence.
- `engine.mjs`: bounded serial shot queue, deduplication, authoritative outcome and score timeline.
- `adapters.mjs`: mock events and a WebSocket TikTok bridge adapter.
- `runtime.mjs`: controller election, tab synchronization and commands.
- `controller.mjs` / `server.mjs`: shared controls and localhost OBS WebSocket server.
- `audio.mjs`: browser audio unlock, continuous synthetic ambience and throttled shot/result effects.
- `live.mjs` / `admin.mjs`: broadcast display and controls.

Teams are configurable (1–6), with a player GLB, two colours, name and short name. More teams reuse existing assets; they are not newly sculpted identities. Missing/invalid assets retain procedural actors. The current textured striker asset is not photoreal. The female keeper reuses the striker geometry with a green kit; it is not a separately authored goalie asset. Idle, run and kick clips are reused. Arm reactions/keeper dives are blended skeletal poses; no authored facial smile blendshapes or cloth simulation are supplied. Sound is synthesized, not licensed stadium recordings.

## TikTok bridge protocol

Enter a `wss://` bridge endpoint in admin (or `ws://localhost` while developing). A server-side connector owns TikTok credentials/session and sends JSON:

```json
{"type":"gift","data":{"id":"unique-final-gift-event","giftId":"rose","repeatCount":1,"repeatEnd":true,"username":"viewer"}}
```

`type` may be `gift`, `like`, `follow`, `comment`. Use a stable event ID on reconnect. Only final repeat streaks are queued; duplicate IDs are ignored. Match `giftId` (or name) to admin mappings. Gift `points` means scoreboard points per successful goal; default 1. `onStatus` reports connection state. The adapter never embeds credentials in the static Pages site.

## Verification

Run `node --test football/tests/engine.test.mjs` for burst gifts, streak filtering, duplicate handling, forced goal/save scoring, sequential queue processing, config validation and bridge parsing. Existing scene/head/ball checks are retained in the local model review workspace.
