# Server deployment prerequisites — not enabled on production

The static site and local tests cannot prove or enforce a PC/phone allowlist. No Supabase management credentials or database connection are available in this task. Do not report the device restriction or the database audit as completed.

## Activation sequence

1. Owner opens the existing project in the Supabase dashboard. Run `ops/supabase-security-audit.sql` (read only). Save the policy/grant report outside the public repository; never paste access tokens.
2. Review every exposed table and SECURITY DEFINER RPC. Preserve public READ access for the broadcast, deny anonymous INSERT/UPDATE/DELETE, and restrict every mutation to the owner UID plus server-approved session and MFA AAL2. Restrictive policies must cover all mutating paths, including existing RPCs that can bypass table RLS.
3. Add server-owned `trusted_admin_devices` records for precisely PC and phone, revocation timestamps, server-bound sessions, and proof-of-possession using passkeys/WebAuthn. A browser label or IP address alone is not a device proof. Owner approves each device once. Disable self-approval. Device registration, MFA recovery and revocation must be tested before enforcing policies to avoid locking the owner out.
4. Add an MFA challenge to login and a server-side policy check before granting admin controls. New device, logged-out session, expired session, missing MFA and revoked device must all fail writes. A real allowlisted session must still operate. Keep the public broadcast readable.
5. Rate-limit login/challenge/approval on the server; redact tokens, use short-lived signed challenges, audit approval/revocation, rotate secrets, verify backup restore and rollback. Do not place a service-role key in HTML or client JS.

Official references:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/auth/sessions

## Durable gift receiver design

The receiver must run on an independent always-on server. A local TikFinity process on the PC cannot receive gifts while that PC is offline. An authorized upstream TikTok integration or provider must send events to the independent collector; a local replay buffer cannot recover events never delivered upstream.

Flow: authenticated provider -> HTTPS collector -> durable event ledger/outbox -> transactional Supabase delivery RPC -> common match job queue -> broadcast viewers.

- Store stable provider transaction/room/gift identity and a one-way sender identifier; do not store unnecessary names. Streak gifts are accepted only at final repeat count, not once per intermediate update.
- Verify provider signature, timestamp and bounded request body. Keep provider credentials and any service-role key only on the receiver.
- A unique event key rejects duplicate webhook/reconnect deliveries. Acknowledge only after committing the ledger; retain undelivered events across process restarts.
- Worker claims have expiring leases. Deliver the event key to a database RPC that inserts a durable receipt and appends its shot count under the same row lock/transaction, then increments the shared revision. Retrying after a lost acknowledgement must be harmless. In-memory sets and finite browser receipt arrays are insufficient for permanent deduplication.
- Gifts during match results and from non-finalists stay in durable jobs with league/season destination. Never reset the job list when a round or season advances.
- Monitor oldest pending age, accepted/delivered counts and dead letters. Add restart, network outage, delivery-commit-before-ack loss, concurrent workers, duplicate streak completion, and long-disconnect replay tests before enabling the receiver.

No receiver is deployed and no upstream TikTok/provider credentials are configured. Hosting, upstream permission and database management access are required before activation.

## Real-device checks still needed

Local Chrome/Edge tests do not prove TikTok LIVE Studio audio routing or physical phone rendering. Verify the public link as a 9:16 source, confirm only the selected output is audible, and test a real approved phone and PC. Keep player videos, faces, uniforms and source resolution unchanged.
