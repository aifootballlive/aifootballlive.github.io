# Season and match history

The public league screen offers season and match selection, all retained results, dates in Europe/Istanbul, match points and standings through the selected match. It remains anonymous GET-only and never reads administrator tokens. Parent messages supply the same season archive.

Settings / Season prepares an explicit season and match number without kickoff. This authenticated CAS operation rejects a running/countdown match, stale selection, invalid numbers, and unavailable historical scores. Pending paid shots and receipt identities survive. The next match increments the chosen season-relative number; the protocol round remains a separate identifier.

Completed regular results are keyed by season and matchNumber. Replay replaces the previous result, rebuilds standings from retained games plus the preserved legacy totals, and adjusts an existing champion cup before recomputing the championship. Financial/shot reports preserve real previous attempts, labelled as replaced rather than deleting received gift records.

Season snapshots and new full match histories persist in the shared game JSON. Migration uses current history, archived seasons and prior reset snapshots. Missing old individual scores are not invented; their aggregate points survive, and such unknown slots cannot be replaced safely. Clearing history remains an explicit reset checkbox.

Validation: season selection/replay/queue/auth/stale/legacy/trophy unit cases; existing season completion/extra rounds and reset regressions; mobile and desktop real UI selection with mocked CAS; all 20 games browsable with per-match scores and points; anonymous production projected GET; read-only/session isolation checks; admin tab/category and two-CAS shot-handoff regressions. No live scores, queues or seasons were changed for testing.

## Active-match selection fix (v301)

The selector now follows the actual current season/match until the user edits either field, avoiding the initial 1/1 placeholder sticking after a delayed shared-state load. While a match or countdown is active, the button explicitly offers to stop and prepare the selection. A guarded first CAS closes the running match with its existing score (or cancels a countdown without inventing a result), preserving pending shots. A separate second CAS prepares the target without kickoff. Both steps validate the season/reset/selection identity and exact clock identity; a concurrent new match cannot be overwritten. Invalid or unavailable historical targets are rejected before stopping. Existing default API calls still reject running matches unless the explicit stop action is requested.

Additional tests cover the screenshot-like 0-0-6-0 active match, all pending/reserved shots, countdown cancellation, stale-clock rejection, initial-field refresh, and mobile/desktop end-to-end stop/select/reload. Real production match state was not modified for testing.
