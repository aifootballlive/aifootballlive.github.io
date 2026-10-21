# Free owner announcements

Settings > Ses has a 500-character announcement draft, local voice selection, local preview, shared send and cancel. Draft and device voice choice persist locally. No generation service, TTS API, credits or API keys are used; only local browser speech voices are listed. A native Chrome check on this PC found Microsoft Tolga (tr-TR, localService=true).

Authenticated shared-game commands are claimed by the existing playback owner before speaking. Other tabs and public viewers do not speak them. Commands have a 90-second expiry and are never automatically replayed after a playing owner reloads. Manual cancellation and retry are available. No match clocks, scores, gift receipts or shot jobs are modified. Announcement text is public broadcast material in the already-public game JSON; no secrets should be entered.

Host speech reads only the submitted text without a spoken introduction, uses the device voice at rate .94 / pitch 1.12, and prevents concurrent commentator speech. Master mute cancels it. It waits for the host audio to be unlocked. Browser autoplay, local voice availability and OBS/TikTok audio routing still apply; playback success is not proof that the outbound stream captures it.

Verification: browser test with native speech interface stubbed covers Turkish local voice selection, local-only preview, authenticated send/claim/finish, duplicate prevention, cancellation, commentary priority, public-user denial, unchanged queues and mobile/desktop layout. Native local Turkish voice enumeration was also checked without playing audio. No real broadcast message was sent.
