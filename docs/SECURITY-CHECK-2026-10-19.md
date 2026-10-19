# Security verification — 19 October 2026

Project verified through the connected Ai Football Live Supabase account: LiveFootballGame (xozzbaguihyhruloiqjm).

## Verified on the live database
- RLS is enabled on all eight public application tables. Existing mutation policies require the designated owner UID. Anonymous/public SELECT policies remain for broadcast data; gift_events has no public SELECT policy.
- Legacy SECURITY DEFINER public_add_test_shots/public_add_test_keeper are not executable by anon or authenticated.
- Applied remote migration enrolled_admin_mfa_write_enforcement. SQL retained in ops/enrolled-admin-mfa-enforcement.sql. 24 restrictive INSERT/UPDATE/DELETE policies across eight tables call a private, owner-scoped function. The private helper only reads verification status for auth.uid(), returns a boolean, uses empty search_path, and is not in an exposed schema. Public/anon execution revoked.
- After the first verified MFA factor, management writes require AAL2, including previously signed-in AAL1 sessions. Before enrollment AAL1 remains allowed so the owner can complete setup; this is NOT evidence that MFA is already active.
- Function checks for owner AAL2, non-owner AAL2 and anonymous identity passed. No production scores, queues, users or credentials were modified as tests.

## Required user actions / remaining blockers
- Auth account currently has zero enrolled/verified MFA factors. Open admin-security.html in the owner's signed-in browser, initiate setup, scan with the user's authenticator, and enter its first code on that page. Neither OTP nor setup secret should be posted in chat. Then verify live factor status and AAL1 rejection again through the management connection.
- Organization plan is Free. Supabase leaked-password protection requires Pro or above; the security advisor still reports auth_leaked_password_protection. No paid upgrade was performed. A dashboard login page is open for the user; an attempted GitHub OAuth login was rejected by automatic review because the account was unspecified, and was not retried or bypassed.
- Only PC+phone trusted-device enforcement is still not deployed. MFA does not itself implement a two-device allowlist. Independent gift collection/provider verification remains pending.

References: [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

## Queue correctness protection activated
- After HTTP verification of the fixed live.html serving v204, applied activate_unplayed_shot_integrity_guard. public.games trigger preserve_unplayed_shots is enabled. It rejects decreases without a matching full-playback receipt or an explicit admin reset/resize marker. This is correctness protection under existing owner RLS, not a substitute for authentication or a device allowlist.
- Fixture-only SQL verification passed after activation. No production queues/scores were modified. Reload old admin/source pages once so explicit admin edits use the new protocol.
- Final MFA check still found zero verified factors; user enrollment remains required. Security advisor still reports only leaked-password protection disabled on the Free plan.

## MFA completed — live verification follow-up
- Owner account now has one verified MFA factor (supersedes the earlier zero-factor checks).
- All 24 restrictive mutation policies remain installed. Transaction-local claim tests verified owner AAL1 denied and owner AAL2 permitted through private.admin_mfa_authorized(). No application data or authentication credentials were changed.
- Security advisor still reports leaked-password protection disabled. Trusted-device allowlist and physical TikTok end-to-end checks remain separate incomplete work; verified MFA does not prove either.

## Approved browser protection prepared
- Applied owner_approved_browser_sessions + keep_device_privilege_helpers_in_private_schema. 24 additional restrictive write policies, active Auth session and owner AAL2 check, private helper implementation with invoker public wrappers.
- PC + phone approval UI: admin-devices.html. Two approved browser sessions maximum, explicit first-PC activation, trusted-PC confirmation for phone, revocation and request expiry. Not hardware attestation; browser session cloning remains a limitation. Both sessions lost requires management recovery.
- Database fixture tests rolled back; actual enabled=false, registered=0 until user explicitly approves PC. Do not report enforcement enabled before this step.
- Owner requested skipping leaked-password protection. Latest advisor reports only that acknowledged warning; no new device-function warning remains.
