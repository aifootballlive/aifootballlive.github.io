# AI Football Live demo

This extends the existing Three.js scene in `game-3d.js`. The original `live-v13.html`, Supabase match, gift buttons and legacy admin continue to run unchanged. The new `/live/` and `/admin/` routes have a separate mock state and never write to the existing match database.

## Run

For OBS, run `npm install` then `npm start`. The default host is loopback, port 8890. For a paired phone on the same private Wi-Fi, use `FOOTBALL_HOST=0.0.0.0` and open the PC admin at `http://127.0.0.1:8890/admin/`. The first PC browser gets an HttpOnly device cookie. From that PC, generate a 10-minute single-use pairing code, then open the displayed LAN admin URL on the phone. Only one PC browser and one phone browser can control settings. Revoke a phone from the PC before pairing a replacement. Device cookies are bearer credentials, not hardware attestation; copying a browser profile or cookie also copies its access. LAN HTTP assumes a trusted private network. Do not forward the server port onto the internet.

The email account label can be set with `FOOTBALL_ADMIN_EMAIL` or ignored `football/.runtime/owner.txt`. This is a device-paired local admin, not an email-password or email-delivery service. It performs no email transmission. Lost PC cookies require stopping the server and removing ignored `football/.runtime/devices.json` to pair again. Never publish runtime files. Unauthorized WebSocket clients can read the match and use the explicitly temporary shot/gift/audio controls, but cannot change teams, mappings, scores or bridge configuration. Set `FOOTBALL_TEST_BUTTONS=0` to deny unauthenticated test controls.

GitHub Pages serves `/live/` as a browser-local demo. Its public `/admin/` displays setup instructions only. Private LAN admin controls the local `/live/` and OBS source; it cannot change the public GitHub Pages match across phones/computers. An authenticated public controller deployment is needed for that, and is not provisioned here. Likewise a real TikTok gift bridge must be connected before incoming gifts are automatic. Hiding the test buttons does not disable the gift listener or queue.

The new portrait scene aligns the goal toward the camera on the right and lines up players facing the viewer at the near pitch line. Idle playback rates, offsets, weight shifts, glances and gestures differ per player. Keeper readiness is a procedural knee/arm pose over the supplied idle clip. It is not a new professionally authored animation clip. Audio starts only after the viewer presses the sound control and the same button can mute it again.

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

Run `node --test --test-isolation=none football/tests/*.test.mjs` for burst gifts, streak filtering, duplicate handling, forced goal/save scoring, sequential queue processing, config validation and bridge parsing. Existing scene/head/ball checks are retained in the local model review workspace.
