# LIVE metrics and keeper contact timing

Match reports snapshot planned normal/extra minutes (for example 9+1) and show observed elapsed minutes. Old reports without the planned timing remain explicitly unknown.

LIVE reports are separate per-room records, linked to match reports rather than copying broadcast totals into every match. The authenticated local relay receiver observes likes, room-user counts, entries, comments, follows, shares, finished gift streaks and stream-end events when provided. Different-room sessions split automatically; disconnect alone does not end a broadcast. Unknown-room sessions can be explicitly started/ended from the statistics panel. Those buttons control recording only.

Reported totals, observed counts and manually transcribed TikTok end-of-stream figures have separate labels. Unknown total views, participants, fans, diamonds and estimated USD payout are not fabricated. Manual figures survive reload in shared state and override presentation only; they never alter game gifts, jobs, receipts or points. Optional TL estimates use the existing user-supplied coin conversion, never a hardcoded payout. These aggregate reports share the existing publicly readable game-state storage model; the management UI and writes remain owner/MFA/device restricted. No raw viewer names, chat bodies or credentials are added to the game state. Event/viewer identities are hashed, buffered and deduplicated across reconnects.

The optional fallback relay now forwards bounded metric events; it was not started alongside TikFinity. Exact event availability and full end-of-stream totals depend on the running local software. Tests use blocked production connections and mock CAS state.

Keeper UI projects only the active team's already-determined save outcome at the decoded ball-contact frame. The durable shot accounting remains tied to native playback proof, preventing double deduction or lost paid shots on interrupted playback. Goal resets remain at the actual goal frame. Rounded cue timestamps accept the same 12ms frame tolerance as scene effects.

Validated: unit session/dedup/streak/manual/reload/late-flush cases; mobile/desktop receive-to-CAS metrics and 9+1 report UI; manual summary zeros and USD; raw identifier exclusion; auth denial; real playback of all eight clips with synchronous keeper contact assertions; existing queue, goal and season accounting regressions.
