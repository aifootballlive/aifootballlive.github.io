# AI Football Live — 19 October 2026 pre-live security gate

Status: **NOT APPROVED FOR PUBLIC GIFT-DRIVEN LIVE** until the Supabase checks below pass.
This public GitHub Pages repository cannot prevent visitors from downloading HTML/JavaScript files, including admin UI markup. Actual privilege isolation must be enforced by Supabase and/or a private server, not CSS, a secret URL, or a UID embedded in JavaScript.

## Already implemented in the published frontend
- Only the designated Supabase Auth user may unlock manager controls, and the login / live routes verify identity with Auth `getUser()`. Invalid/failed verification is fail closed.
- Guest 1/5-shot test buttons default OFF; the authenticated manager has an explicit, confirm-before-enable toggle. The leader checks the persisted flag both on receipt and at write time.
- Public realtime channel messages can no longer assert an authoritative video start or completion. The authenticated admin playback is currently the only accepted source of video-end acknowledgements.
- Existing client-side rate limits are defense in depth only, not a substitute for server-owned rate limiting and anti-abuse.

## Must be completed in Supabase before public LIVE
1. On the correct Supabase project, run the READ-ONLY SQL at `ops/supabase-security-audit.sql` and inspect real rows and policies; do not paste any passwords, secrets, or service-role keys into chat.
2. Enforce RLS: anonymous clients should have only the minimum SELECT access needed for public scoreboard / match display. INSERT, UPDATE and DELETE of match state, scores, jobs, game rules, keeper power, results, league and admin settings must require the verified owner account, ideally MFA assurance level 2. Check ALL public tables and all RPCs / SECURITY DEFINER functions, including legacy test-shot RPCs.
3. Verify with an incognito/anonymous session that attempts to modify `public.games` or invoke privileged RPCs fail (401/403/RLS rejection), while SELECT for live match still works. Do not change a running match as a test.
4. Turn on MFA for the manager's Auth account and review sessions, recovery methods and access logs. Disable anonymous signup/access to any privileged endpoints; rate-limit logins and invitations on the server. Review unexpected users.
5. Configure an authenticated HTTPS TikTok/TikFinity gift collector with provider authenticity checks, server rate limits and durable deduplication; do not trust arbitrary local/public websocket messages as real paid gifts.
6. Confirm both the manager video and public OBS view show the same match on physical devices. Because public video completion broadcasts were disabled against spoofing, a **visible and playing authorized manager match view** is needed to record completed clips until a server-authenticated playback relay is deployed.
7. Test with the guest trial toggle OFF and all public shot buttons disabled; turn trial ON only for supervised friends' tests, then OFF before broadcast. Avoid public trial testing during a paid-gift LIVE.

## Outstanding
- Supabase security audit results and policy deployment: **NOT VERIFIED**. The repository connector does not have Supabase database management access.
- True protected admin page/network-only reachability: **NOT IMPLEMENTED** (GitHub Pages is public/static). Authorization of backend operations requires verified RLS.
- Server-side guest anti-abuse, independent gift receiver and TikTok live gift proof: **NOT IMPLEMENTED**.
- End-to-end attack simulation and genuine TikTok gift tests on devices: **NOT COMPLETED**.

Do not state that the site is fully protected or publicly launch gift processing until these blocking checks are passed.
