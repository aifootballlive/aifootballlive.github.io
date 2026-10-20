# Public league security review — 2026-10-20

Scope: public league page, current database grants/RLS, callable public functions,
and Supabase security advisor. Production checks were read-only; no scores,
queues, seasons, sessions or security policies were changed.

## Changes

- Removed the match-return link from the DOM, for standalone and embedded use.
- Removed the external Supabase SDK. The page never initializes Auth or reads,
  refreshes, transmits or modifies the stored administrator session.
- Fetches only league and leagueArchive JSON projections with an anonymous GET,
  no cookies or Authorization header, no stored credentials and no writes.
- Added a page content policy restricting connections/assets and prohibiting
  forms, object embeds and base-URL changes. Inline scripts/styles remain allowed
  for this existing static page; this is not a complete XSS defense on its own.
- Dynamic results use textContent; parent messages require matching origin/source.
- Public standings stay open during an administrator token recheck. Management
  closes immediately and its Settings tab stays hidden until verification succeeds;
  opening the public league tab itself does not require administrator privileges.

## Verified server access

- All eight public game tables have RLS enabled.
- Private device/config tables have RLS and deny anonymous reads and writes.
- anon has SELECT only, no INSERT/UPDATE/DELETE table grants.
- Authenticated writes require the fixed owner UID, AAL2 MFA, and the restrictive
  approved-browser check. Merely signing in does not grant administration.
- Administrative device RPCs and test-shot/keeper RPCs deny anon EXECUTE.
- The anonymously executable timestamp trigger function does not provide a data
  mutation API (it is a trigger function).
- A real anonymous projected GET returned only league/archive and four teams.

## Boundaries and remaining finding

The game uses public read policies for its shared live state. Narrowing the league
page request is data minimization, not server-side column isolation: someone who
constructs their own request can still read the existing public game tables. This
review does not claim the league URL is an access boundary for all game data, nor
that hiding a link prevents someone from entering the public live URL themselves.
No privileged key is included in the league page; its publishable key is public
by design. Any new private information must not be stored in public shared state.

The security advisor's sole current finding is disabled leaked-password protection.
This previously deferred account hardening option was not changed. It does not
grant visitors write access. Guidance:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Regression checks

Mocked phone/desktop browser checks verify GET-only projection, no Authorization
or cookies, no Auth SDK/session access, no game links or controls, escaped text,
foreign-origin message rejection, and network-failure fallback. Existing admin
tab tests verify same-panel switching and preservation of unsaved settings.
