# Nightshift

Owner: `@elastic/nightshift-context-and-research-team`, `@elastic/nightshift-sre-agent-team`

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

Flipping `nightshift.enabled` from on to off at runtime pauses Significant Events
deployment-wide, like the Pause action in its settings: managed workflows are disabled in
every space, in-flight executions are cancelled, and the continuous onboarding and
scheduled discovery toggles are turned off, with their previous values kept for Resume.
The maintenance state records `system:feature_flag` as who paused it. The alerting rules
backing knowledge indicator queries keep running, because alerting v2 cannot toggle rules
without a user request. A flag value only counts once it has held for 15 seconds, so the
value read at startup, or a brief flip, never triggers a pause.

Flipping it back on does not resume. After the managed workflows are reinstalled the pause
is re-asserted, and activity stays stopped until a user resumes it. While the flag is off,
`POST /internal/significant_events/maintenance/_pause` and
`GET /internal/significant_events/maintenance/_status` stay available (Resume does not), so
activity can still be stopped by hand, rules included.
