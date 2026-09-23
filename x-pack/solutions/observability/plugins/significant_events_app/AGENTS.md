# Significant Events app — agent notes

- This plugin hosts the Significant Events UI, extracted from `streams_app`. The
  server side lives in `x-pack/platform/plugins/shared/significant_events`; follow
  the naming conventions documented in that plugin's `AGENTS.md`.
- Never abbreviate "significant" to "sig" in identifiers, filenames, folders, i18n
  ids or test subjects. `significantEvent` / `significant_event` only.
- i18n messages use the `xpack.significantEventsApp.` prefix.
- Data access goes through `significantEventsRepositoryClient`
  (`dependencies.start.significant_events`). If stream listing is rehomed here and
  needs `streamsRepositoryClient`, re-add `streams` as a required plugin.
