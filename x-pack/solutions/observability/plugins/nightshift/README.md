# Nightshift

Owner: `@elastic/nightshift-context-and-research-team`, `@elastic/nightshift-sre-agent-team`

Browser-only plugin serving the Nightshift UI at `/app/nightshift`.

Nightshift surfaces significant events, their detections, the entities they touch and
the investigations opened against them. It reads through the `significant_events`
plugin's public APIs; this plugin owns no server code.

The app is gated behind the significant events rollout feature flag
(`streams.significantEventsAvailable`): when the flag is off the app is hidden from
global search and direct visits redirect to the Observability overview.
