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
- KI data, reads, onboarding, sync settings and managed workflows are **space-scoped** (reads go through `inSpace(space)`, workflows are installed per space). Maintenance is **per space**: pause, resume, reset and status read and write one saved-object document per space (`significant-events-maintenance-state`, `namespaceType: 'single'`, same id in every space), and a space without a document is enabled. Pause leaves the shared workflows (space `*`) enabled and only disables that space's scheduled workflows, rules and settings. Reset clears only documents tagged with the current space, preserving shared data streams, sources/views, investigations, untagged legacy documents and `.rule-events` history. Turning Nightshift off pauses every existing space.
- A feature's storage identity is per source (`uuid = v5(source_id, slug)`); its **slug** is the cross-source identity, and Topology Match intersects slugs. Identification converges slugs across sources: the similarity tool searches every readable source in the space, entity slugs derive from a `service.name` equality filter, and reconcile lets such an authoritative slug replace (and tombstone) a divergent local feature. `GET /internal/streams/_features` and `ki_search` fold features on exact `(type, slug, excluded)` into rows carrying `sources`/`instances`; computed features never fold.
- HTTP paths are unchanged on purpose. The KI and onboarding routes stay under `/internal/streams/{name}`, where `{name}` is a source id, and `/internal/significant_events/*` stays where it is.
- Managed workflow ids keep their `system-streams-ki-*` names.
- Legacy handling that stays: the `sigevents:stream:<name>` rule ownership tag (`LEGACY_RULE_STREAM_TAG_PREFIX`) and the maintenance reset sweep.

## KI semantic search

All KI search is ES|QL (`IndicatorSearcher`); do not reach for the `_search` DSL. Ranking only ever sees latest revisions: `findIndicators` resolves them first and passes their `_id`s as the request `filter`; `findFeaturesAcrossSources` folds the latest-per-group pick into the rank query itself (`pickLatestPerGroup`) so the corpus is not capped by the revision reader, and ranks at most `CROSS_SOURCE_RANK_LIMIT` (300) rows.

- `search_embedding` is a `semantic_text` field; the semantic branch ranks with `MATCH(search_embedding, ?q)`.
- Score threshold: the semantic branch is `FUSE LINEAR` minmax-normalised and then cut at `semantic_min_score` (0.15). Minmax maps an all-tied window (including a single row) to 0, so `rankWithTieFallback` retries without the threshold when no returned row carries the semantic `label` (https://github.com/elastic/elasticsearch/issues/135543).
- **`sources` on similarity hits is not derived from the ranking window.** `findSimilarFeatures` collapses hits by slug and then asks `getFeatureSourcesBySlug` (exact `feature.slug` lookup across the readable sources, active + non-excluded + non-expired) for the complete holder list, so the dedup agent sees every source that already holds the slug even when the ranking window only surfaced one copy.
- **Documents without embeddings.** `bulkCreateWithInferenceFallback` retries inference failures and then indexes the batch **without** `search_embedding`; those revisions never match on `search_embedding` and are only reachable through keyword ranking, which is a whole-query substring `LIKE` over title, description, `feature.type`, `feature.subtype` and tags. `searchWithKeywordFallback` only falls back to keyword when the caller did not pin a `searchMode` and the ranking query throws; the similarity tool pins `semantic`, so an inference outage surfaces as a per-candidate `{ candidate_id, error }` group, while missing embeddings on the stored side degrade silently to "no match".

## Keeping this file current

Update this file when you make a change that would mislead an agent reading it: cross-package ownership changes, pipeline restructuring, addition or removal of concepts relevant to the pipeline, or naming convention updates. Do not update it for type field additions or directory reorganisations within a package — those are discoverable from the code.
