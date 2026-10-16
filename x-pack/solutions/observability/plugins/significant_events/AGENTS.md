# Significant Events Plugin — Agent Context

Significant Events is the name for a set of functionalities meant to derive useful information from Nightshift sources (the ES|QL queries managed by `nightshift_sources`), related to incident monitoring, investigation and remediation.

It used to be part of the Streams plugin, now it is in its own dedicated plugin.

## Naming conventions

Never abbreviate "significant" in identifiers, file names, or folder names:

| ✅ Correct            | ❌ Avoid      |
| --------------------- | ------------- |
| `significantEvent`    | `sigEvent`    |
| `SignificantEvent`    | `SigEvent`    |
| `significant_event_*` | `sig_event_*` |
| `SIGNIFICANT_EVENT_*` | `SIG_EVENT_*` |

As Significant Events used to be co-located inside Streams, a lot of symbols were prefixed with `SignificantEvents`. Now that there is a separate plugin, consider removing it.

The guideline is: if a concept is meant to be used outside the context of the plugin, consider prefixing it with `SignificantEvents` or `significantEvents`. If it is not, it is safe to not include the prefix.

When something is related to the Knowledge Indicator (KI) system, it should be indicated as such. `KnowledgeIndicator` (or `knowledgeIndicator`), or the use of `KI` are ok. `Ki` is not.

## Cross-package ownership

KI feature extraction, query generation, KI search, token helpers, and diverse
sampling live in `@kbn/nightshift-ai`
(`x-pack/platform/packages/shared/kbn-nightshift-ai`), owned by `@elastic/nightshift`. This
plugin adapts Nightshift sources through `sourceToAnalysisTarget` before calling
into that package.

## Data model

- Knowledge indicators, detections and events are keyed by **source id** (`source.id` in storage). Source-scoped payloads carry `source_id`; events can span sources, so they carry `source_ids`. The old stream-name field is gone from storage, schemas and the wire.
- KI data, reads, onboarding, sync settings and managed workflows are **space-scoped** (reads go through `inSpace(space)`, workflows are installed per space). Maintenance is **per space**: pause, resume and status read and write one saved-object document per space (`significant-events-maintenance-state`, `namespaceType: 'single'`, same id in every space), and a space without a document is enabled. Pause leaves the shared workflows (space `*`) enabled and only disables that space's scheduled workflows, rules and settings. Reset stays deployment-wide: it pauses every space through its own document while it deletes the shared Significant Events data streams, then enables them again. Turning Nightshift off pauses every existing space the same way.
- HTTP paths are unchanged on purpose. The KI and onboarding routes stay under `/internal/streams/{name}`, where `{name}` is a source id, and `/internal/significant_events/*` stays where it is.
- Managed workflow ids keep their `system-streams-ki-*` names.
- Legacy handling that stays: the `sigevents:stream:<name>` rule ownership tag (`LEGACY_RULE_STREAM_TAG_PREFIX`) and the maintenance reset sweep.

## Keeping this file current

Update this file when you make a change that would mislead an agent reading it: cross-package ownership changes, pipeline restructuring, addition or removal of concepts relevant to the pipeline, or naming convention updates. Do not update it for type field additions or directory reorganisations within a package — those are discoverable from the code.
