# Significant Events app — agent notes

- This plugin hosts the Significant Events UI, extracted from `streams_app`. The
  server side lives in `x-pack/solutions/observability/plugins/significant_events`; follow
  the naming conventions documented in that plugin's `AGENTS.md`.
- Never abbreviate "significant" to "sig" in identifiers, filenames, folders, i18n
  ids or test subjects. `significantEvent` / `significant_event` only.
- i18n messages use the `xpack.significantEventsApp.` prefix.
- Data access goes through `significantEventsRepositoryClient`
  (`dependencies.start.significantEvents`). Sources (the ES|QL queries Nightshift
  onboards) come from the `nightshiftSources` plugin: `await
  dependencies.start.nightshiftSources.getClient()`, then `fetch` on
  `/internal/nightshift/sources*`. Read them through `useFetchSources` /
  `useSourcesById`, write them through `useSourcesApi`.
- The app does not depend on the `streams` plugin. The KI and onboarding routes keep
  their `/internal/streams/{sourceId}` paths, and `{sourceId}` is a source id.
- The default tab is `sources` (`/streams` redirects there). URL state and the locator
  filter knowledge indicators with `source` (source ids).
