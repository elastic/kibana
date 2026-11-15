# Significant Events app

Owner: `@elastic/nightshift`

Browser-only plugin serving the Significant Events UI at `/app/significant_events`.

The application covers the Significant Events management surface: rules (queries),
detections and events. Sources, knowledge indicators, Cortex, Memory and Decision Trees
are served by Nightshift (`/app/nightshift/sources`, `/app/nightshift/knowledge`). Settings
is served by Nightshift at `/app/nightshift/settings`. The application consumes the
`significant_events` plugin
(server APIs via the typed `significantEventsRepositoryClient`) and the `nightshiftSources`
plugin (the sources API via `getClient()`).

Availability is decided server-side by `GET /internal/significant_events/availability`
(rollout feature flag, project type, pricing tier, Enterprise license and required
plugins). It gates app/deep-link visibility in global search and the page itself; when
unavailable the app is hidden from navigation/global search and direct visits show
`SignificantEventsNotEnabledPrompt`.

Deep links go through the share plugin locator registered under
`SIGNIFICANT_EVENTS_APP_LOCATOR_ID`.
