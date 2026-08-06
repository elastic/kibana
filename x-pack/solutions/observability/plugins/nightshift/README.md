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

When the plugin does load, the app is gated behind the significant events rollout
feature flag (`streams.significantEventsAvailable`): when the flag is off the app is
hidden from navigation and direct visits redirect to the Observability overview.
