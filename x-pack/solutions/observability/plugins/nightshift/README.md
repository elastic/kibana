# Nightshift

Owner: `@elastic/nightshift`

Browser-only plugin serving the Nightshift UI at `/app/nightshift`.

Nightshift surfaces significant events, their detections, the entities they touch and
the investigations opened against them. All data access goes through
`significantEventsRepositoryClient` from the `significant_events` start contract; this
plugin owns no server code and issues no bare HTTP requests.

`significant_events` is a **required** plugin, so wherever it is disabled — Search,
Security and Logs Essentials serverless projects, for instance — Nightshift is
cascade-disabled with it.

When the plugin does load, the app is gated on
`GET /internal/significant_events/availability` — the single source of truth for whether
Significant Events can run, aggregating the rollout flag
(`nightshift.enabled`), project type, pricing tier, license and required
plugins. When it reports unavailable the app is hidden from navigation and direct visits
redirect to the Observability overview.

## Turning `nightshift.enabled` off and on

Flipping `nightshift.enabled` from on to off at runtime pauses Significant Events in
every space, like the Pause action in its settings does for one space: each space's
scheduled workflows are disabled, in-flight executions are cancelled, and the continuous
onboarding and scheduled discovery toggles are turned off, with their previous values kept
for Resume. A space that a user already paused keeps its own record. The shared workflows
stay enabled. The maintenance state of each space records `system:feature_flag` as who
paused it. The alerting rules backing knowledge indicator queries keep running, because
alerting v2 cannot toggle rules without a user request. A flag value only counts once it
has held for 15 seconds, so the value read at startup, or a brief flip, never triggers a
pause. If the spaces cannot be listed, nothing is paused and the failure is logged; the
next managed-workflow install re-applies the pause only in spaces that are already paused.

Flipping it back on does not resume. After the managed workflows are reinstalled the pause
is re-asserted, and activity stays stopped until a user resumes it. While the flag is off,
`POST /internal/significant_events/maintenance/_pause` and
`GET /internal/significant_events/maintenance/_status` stay available (Resume does not), so
activity can still be stopped by hand, rules included.
