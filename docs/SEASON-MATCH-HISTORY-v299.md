# Season and match history

The public league screen offers season and match selection, all retained results, dates in Europe/Istanbul, match points and standings through the selected match. It remains anonymous GET-only and never reads administrator tokens. Parent messages supply the same season archive.

Settings / Season prepares an explicit season and match number without kickoff. This authenticated CAS operation rejects a running/countdown match, stale selection, invalid numbers, and unavailable historical scores. Pending paid shots and receipt identities survive. The next match increments the chosen season-relative number; the protocol round remains a separate identifier.

Completed regular results are keyed by season and matchNumber. Replay replaces the previous result, rebuilds standings from retained games plus the preserved legacy totals, and adjusts an existing champion cup before recomputing the championship. Financial/shot reports preserve real previous attempts, labelled as replaced rather than deleting received gift records.

Season snapshots and new full match histories persist in the shared game JSON. Migration uses current history, archived seasons and prior reset snapshots. Missing old individual scores are not invented; their aggregate points survive, and such unknown slots cannot be replaced safely. Clearing history remains an explicit reset checkbox.

Validation: season selection/replay/queue/auth/stale/legacy/trophy unit cases; existing season completion/extra rounds and reset regressions; mobile and desktop real UI selection with mocked CAS; all 20 games browsable with per-match scores and points; anonymous production projected GET; read-only/session isolation checks; admin tab/category and two-CAS shot-handoff regressions. No live scores, queues or seasons were changed for testing.
