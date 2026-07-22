/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  THREAT_REPORTS_DATA_STREAM,
  THREAT_REPORTS_INDEX_PATTERN,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_INTEL_SUBSCRIPTIONS_INDEX,
  THREAT_INTEL_DIGESTS_INDEX,
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_INTEL_ADVISORIES_INDEX,
  THREAT_INTEL_HUNT_FINDINGS_INDEX,
  DIAMOND_INFERENCE_ENDPOINT_ID,
} from '../../../common/threat_intelligence/hub';

/**
 * Bumps when an index template's mapping changes in a backwards-compatible
 * way. Adding fields is fine; removing or retyping is not without a
 * reindex strategy.
 *
 * v2: adds `extracted.ioc_set_hash` (keyword) and
 * `lineage.related_reports*` (keyword + integer) to support the
 * Workflow 2 cross-report correlation pass, and adds `template_id` to
 * the subscriptions companion index for pre-staged template origin.
 *
 * v3: adds `attribution.environment_hits` (object — per-layer counts +
 * computed_at timestamp) and `attribution.environment_hits_total` (integer)
 * for the Workflow 4 attribute-alerts-to-reports loop, and introduces the
 * indicators companion index template for the Promote threat indicators Task
 * Manager job.
 *
 * v4: adds `delivery.connector_id` to the subscriptions companion index so
 * the `deliver_threat_digests` workflow can dispatch through a configured Kibana
 * actions connector (email / slack) instead of the previous `data.set`
 * placeholder.
 *
 * v5: adds the `extracted.categories` keyword array and the
 * `geography.regions` macro-region keyword array to the threat-reports
 * data stream. Both fields are populated by the stage-2 LLM enrichment
 * step in `enrich_threat_report` and consumed by the visual
 * dashboard's category-breakdown / "Affects You" panels and by
 * `find_threat_reports`'s new `categories[]` / `regions[]` filters. Both
 * arrays are closed enums (see `THREAT_CATEGORIES` / `THREAT_REGIONS` in
 * `common/constants.ts`).
 *
 * v6: adds `space_id` (keyword) to the threat-reports data stream and to
 * each companion index. Single global index, logical per-space isolation:
 * routes filter by `request.getSpaceId()` and writes tag the current
 * space. The sentinel `'*'` means "all spaces" and is reserved for
 * built-ins (seeded sources, global subscriptions) so default content
 * stays visible regardless of which space the request originated from.
 *
 * v7: relocates every plugin-owned index under the `.kibana-threat-*`
 * prefix (data stream + four companion indices + their templates). The
 * mappings are unchanged from v6. The rename is required because the
 * `kibana_system` reserved role only grants access to Kibana-owned
 * patterns (`.kibana*`, `.fleet*`, etc.) — the previous `threat-reports`
 * data stream and `.threat-intel-*` companion indices fell outside that
 * envelope and so creation and read calls from the internal user failed
 * with `security_exception`. There is no in-place migration: previously
 * created `threat-reports` / `.threat-intel-*` resources (none of which
 * could have been written to in any environment that didn't elevate
 * `kibana_system`) are abandoned. See
 * `dev_docs/key_concepts/kibana_system_user.mdx`.
 *
 * v8: adds the tradecraft-style ranking signals to the threat-reports
 * data stream:
 *   - `extracted.relevance` (float 0..1) — LLM-emitted "how actionable
 *     is this report for detection?" score, populated by the stage-2
 *     enrichment in `enrich_threat_report`.
 *   - `extracted.detection_actionability` (keyword) — closed-set
 *     classifier (`informational` / `iocs_only` / `ttps_present` /
 *     `rule_candidate`). See `DETECTION_ACTIONABILITY_LEVELS` in
 *     `common/threat_intelligence/hub/constants.ts`.
 *   - `rank_score` (float) — multiplicative composite of
 *     `severity.score * extracted.relevance` computed at extraction
 *     time. Consumed by `find_threat_reports` when `sort_by: 'rank'` and
 *     by the dashboard's "Top reports" panel. Reports missing this
 *     field (e.g. legacy or pending docs) tie-break to 0 via the
 *     `missing` sort parameter on the read side.
 *
 * v9: closes the hunt → ranking feedback loop. Adds:
 *   - `feedback` (object) — per-report aggregate of the latest
 *     orchestrated-hunt outcome:
 *       * `ioc_hit_count` / `ttp_hit_count` (long) — Tier 1 hit counts.
 *       * `affected_host_count` / `affected_user_count` (long) —
 *         Tier 1 affected-asset cardinality.
 *       * `last_hunted_at` (date) — wall-clock of the latest hunt.
 *       * `last_hunt_status` (keyword) — `HuntForThreatStatus` echo so
 *         downstream consumers can distinguish "no hits in this window"
 *         from "no searchable input" without rerunning the hunt.
 *     Written by `services/write_hunt_feedback.ts` from the orchestrator
 *     after every Tier 1 invocation against a known `report_id`.
 *   - `corroborated_rank_score` (float) — `rank_score * (1 + boost)`
 *     where `boost` is a log-based, monotone, clamped function of the
 *     IOC and TTP hit counts. See the formula in
 *     `services/write_hunt_feedback.ts`. `find_threat_reports` sort_by='rank'
 *     prefers this field over the static `rank_score` so reports
 *     corroborated by environment activity float to the top of digests,
 *     dashboard "Top reports" panel, and any future top-N gating. Bound
 *     to `[rank_score, 1.5 * rank_score]` so a noisy report can never
 *     dominate a clean high-relevance one outright; the boost is
 *     idempotent across reruns of the same hunt window.
 *
 * v10: introduces the advisories companion index template
 * (`.kibana-threat-intel-advisories`) for cross-report LLM-synthesised
 * advisories produced by `services/synthesize_advisory.ts`. One row
 * per advisory carrying the rendered narrative, the recommended actions
 * list, and the report ids that fed the synthesis. No changes to the
 * threat-reports data stream mapping in this bump — companion index
 * additions are always backwards-compatible.
 *
 * v12: adds `copy_to` on `content.title` and `content.body_text` so the
 * `content.title_bm25` / `content.body_text_bm25` siblings are populated at
 * index time (the mapping declared these fields in v1 but omitted copy_to,
 * which made `find_threat_reports` field-sorted modes return zero hits).
 *
 * v13: fixes `copy_to` targets to use full paths (`content.title_bm25`,
 * `content.body_text_bm25`). Relative targets (`title_bm25`) copy to the
 * document root under `dynamic: strict`, which rejected every
 * `ingest_threat_feeds` write with `strict_dynamic_mapping_exception`.
 *
 * v11: adds `advisory_id` (keyword) to the digests companion index
 * (`.kibana-threat-intel-digests`). Populated by `deliver_threat_digests` when
 * the agent calls `threat_intel.synthesize_advisory` (with
 * `persist: true`) at the top of the per-subscription render step and
 * weaves the resulting executive summary into the digest markdown.
 * Lets the dashboard cross-link each archived digest back to the
 * advisory row it cites — and lets the per-subscription history pane
 * render "this digest is built around the <theme_title> advisory"
 * without re-running the synthesis. Companion-index addition; the
 * mapping is `dynamic: 'strict'` so the field MUST be declared up-front
 * before any write attempts it.
 *
 * v16: adds `extracted.gate` (object) — the assess_relevance verdict persisted
 *   observe-first on every extraction run. Fields:
 *   - `is_intelligence`         (boolean) — true when the report is genuine threat-intel.
 *   - `quality_class`           (keyword) — 'intel' | 'marketing' | 'rollup' | 'thought_leadership'.
 *   - `evidence_tier`           (keyword) — 'primary' | 'pointer' | 'mixed'.
 *   - `needs_render`            (boolean) — true when the full page must be rendered before analysis.
 *   - `has_original_commentary` (boolean) — true when the report contains original analyst commentary.
 *   - `reason`                  (text, index:false) — LLM explanation (not searched).
 *   - `assessed_at`             (date)   — wall-clock of the gate run.
 *   Note: `primary_links` is deferred — no consumer until Slice-5 link-chasing.
 *   A `migrateExistingGateMappings` call patches pre-v16 backing indices at startup.
 *
 * v17: adds `port` (integer) to the `extracted.iocs` nested block.
 *   Socket extraction (PASS 5) emits `{ type, value, port }` for `host:port` patterns.
 *   Without this mapping, strict dynamic mapping rejected any IOC with a port field.
 *   A `migrateExistingIocPortMapping` call patches pre-v17 backing indices at startup.
 *
 * v18: adds `content.external_references` (nested) — structured citations captured from
 *   STIX SDOs (ExternalReference array on SDO.external_references). Each entry has:
 *   - `source_name`  (keyword) — e.g. "mitre-attack", "cve".
 *   - `url`          (keyword) — canonical citation URL; exact-match target for source-discovery.
 *   - `external_id`  (keyword) — e.g. "T1059.001", "CVE-2024-12345".
 *   - `description`  (text, index:false) — prose reference note; stored but not searched.
 *   Typed as `nested` so per-entry field associations are preserved for future multi-field
 *   queries (e.g. "docs where MITRE cited url X"). Consumed as cross-links (report↔report)
 *   and as the source-discovery seed queue by the self-watering router.
 *   A `migrateExistingExternalReferencesMapping` call patches pre-v18 backing indices at startup.
 *   v19 addition: `canonical_url` (keyword) — scheme/port-normalised form of `url`, used as
 *   the self-watering URL-reconciliation key by `adapters/canonicalize_url.ts`. Added to the
 *   block in v19; the same migration also patches indices that already have external_references
 *   but were created before canonical_url was introduced.
 *
 * v19: adds `sources` (nested) to the indicators companion index
 *   (`.kibana-threat-intel-indicators`) — per-report citation accumulator so an IOC
 *   cited by multiple reports/trails carries ALL citing sources instead of the last writer
 *   winning. Each entry has:
 *   - `report_id`  (keyword) — `_id` of the citing threat report; dedup key within sources[].
 *   - `provider`   (keyword) — `source.name` from the citing report (e.g. "maltrail").
 *   - `trail`      (keyword) — Maltrail trail label (`content.title`); absent for non-maltrail.
 *   - `reference`  (keyword) — per-IOC nearest-ref URL (Maltrail `extracted.iocs[].reference`),
 *                              falling back to the report's `source.url`; absent when neither.
 *   - `first_seen` (date)    — `lineage.extracted_at` of the citing report.
 *   Populated by a Painless scripted upsert in `tasks/promote_threat_indicators.ts`; dedup by
 *   `report_id` ensures re-running the sync for the same report never duplicates its entry.
 *   A `migrateExistingIndicatorSourcesMapping` call patches the pre-v19 companion index at
 *   startup (companion index, not data stream — PUT mapping targets the index directly).
 *   Also adds `extracted.iocs[].reference` (keyword) and `extracted.iocs[].block_index`
 *   (integer) to the reports data stream — written by the `text_indicator_list` adapter for
 *   Maltrail trail files. A `migrateExistingIocReferenceMappings` call patches pre-v19 backing
 *   indices at startup.
 *   Also adds `content.external_references[].ref_part` (integer) and `.ref_part_count` (integer)
 *   — per-reference fragmentation m-of-n fields written when a single `# Reference:` block must
 *   be split across multiple chunk docs to stay under the 10k nested-object limit. Always present
 *   on text_indicator_list reports (unsplit = 1/1). Folded into `migrateExistingExternalReferencesMapping`
 *   so pre-v19 indices gain these fields at startup without a separate migration call.
 *
 * v20: adds `extracted.vulnerability.*` (8 fields) — structured advisory fields for CISA KEV
 *   and similar vulnerability-feed adapters. All fields are keyword/date (aggregatable) so INFOSEC
 *   can filter and aggregate by vendor, product, cveID, etc.
 *   Fields: cve_id (keyword), vendor (keyword), product (keyword), name (keyword),
 *           cwes (keyword), date_added (date), due_date (date), ransomware_use (keyword).
 *   A `migrateExistingVulnerabilityMappings` call patches pre-v20 backing indices at startup.
 *
 * v22: adds deploy-status fields to the hunt findings companion index
 *   (`.kibana-threat-intel-hunt-findings`):
 *   - `status`            (keyword) — 'new' | 'deployed'
 *   - `deployed_rule_id`  (keyword) — Detection Engine rule id created from the finding
 *   - `deployed_at`       (date)    — when the rule was linked
 *   A `migrateExistingHuntFindingDeployMappings` call patches pre-v22 indices at startup.
 *
 * v16: adds `extracted.gate.*` (7 fields) — the relevance/evidence gate verdict block.
 *   Note: `primary_links` is deferred — no consumer until Slice-5 link-chasing.
 *   A `migrateExistingGateMappings` call patches pre-v16 backing indices at startup.
 *
 * v15: adds IOC tier fields to the `extracted.iocs` nested block:
 *   - `tier`          (keyword) — active tier assignment (heuristic for now; LLM override in B2).
 *   - `tier_heuristic`(keyword) — the deterministic heuristic's assignment (preserved for tuning).
 *   - `tier_basis`    (keyword) — the rule name that fired (e.g. defanged_source, hash_high_entropy).
 * These fields are DISTINCT from `source.tier` (integer feed-quality snapshot at line ~214).
 * All three are `dynamic: 'strict'`-safe keyword additions; additive, no data loss.
 * A `migrateExistingIocTierMappings` call patches pre-v15 backing indices at startup.
 *
 * v14: adds Diamond Model extraction fields and source-snapshot fields to the
 * threat-reports data stream. Diamond fields under `extracted.diamond.*`:
 *   - Four vertices (adversary / capability / infrastructure / victim), each with:
 *     * `signal`  (keyword)       — HIGH | PARTIAL | NONE
 *     * `summary` (semantic_text, inference_id: DIAMOND_INFERENCE_ENDPOINT_ID) —
 *       1-3 sentence factual summary; empty when signal is NONE.
 *   - `signal_count`    (integer) — non-NONE vertex count (0..4).
 *   - `model_id`        (keyword) — connector/model that produced the extraction.
 *   - `extracted_at`    (date)    — wall-clock of the extraction run.
 *   - `extraction_mode` (keyword) — 'single_call' | 'per_vertex_fallback'.
 * Source-snapshot fields on `source.*`:
 *   - `admiralty_rating` (keyword) — NATO-style source reliability rating (A–F).
 *   - `tier`             (integer) — feed tier snapshot at ingest.
 * ES validates the `summary` inference_id at document-index time (not at
 * template PUT or rollover). `bootstrap_threat_intelligence` logs an error at
 * startup if the endpoint is absent so operators catch the gap before data flows.
 */
/**
 * v21: splits former report-level catch-all metadata into `lineage`
 * (ingest/dedup/extraction) and `attribution` (environment hit rollup);
 * renames `extracted.gate` tier field to `evidence_tier`.
 */
const TEMPLATE_VERSION = 22;

/** Keyword sentinel meaning "visible from every space". */
export const SPACE_ID_GLOBAL = '*' as const;

const TEMPLATE_META = { managed_by: 'threat_intelligence', version: TEMPLATE_VERSION };

/**
 * Source-agnostic threat reports data stream.
 *
 * Mappings notes:
 * - `content.title` and `content.body_text` are `semantic_text`. We deliberately
 *   omit `inference_id` so Elasticsearch inherits the cluster default at index
 *   creation time (typically Jina v5 on EIS, then ELSER-on-EIS, then ELSER, then
 *   multilingual-e5). This matches Streams' pattern in `storage_settings.ts` and
 *   makes the plugin work transparently across deployments.
 * - `content.title_bm25` and `content.body_text_bm25` are sibling `text` fields
 *   populated via `copy_to` from the `semantic_text` siblings. The
 *   `threat_intel.find_threat_reports` tool uses an RRF retriever over both paths so
 *   semantic search degrades gracefully when inference is unavailable.
 * - `content_fingerprint` is the SHA-256 of the normalized `body_text`. It is
 *   the dedup key against RSS-syndicated copies and is a forward-compat slot
 *   for Phase C alert/telemetry traceback (`lineage.duplicate_of`).
 * - `source.type: 'telemetry'` is reserved for Phase C
 *   (`threat_intel.generalize_from_telemetry`); leaving the enum value in the
 *   keyword field requires no migration when the tool lands.
 */
const threatReportsTemplate = {
  index_patterns: [THREAT_REPORTS_INDEX_PATTERN],
  data_stream: {},
  priority: 200,
  _meta: TEMPLATE_META,
  template: {
    settings: {
      'index.lifecycle.name': undefined,
      'index.mapping.total_fields.limit': 5000,
      'index.default_pipeline': undefined,
    },
    mappings: {
      dynamic: 'strict' as const,
      properties: {
        '@timestamp': { type: 'date' as const },
        content_fingerprint: { type: 'keyword' as const },
        // Logical per-space isolation tag. `'*'` = visible from every
        // space. Routes filter by current space + `'*'`.
        space_id: { type: 'keyword' as const },
        source: {
          properties: {
            type: { type: 'keyword' as const },
            name: { type: 'keyword' as const },
            url: { type: 'keyword' as const },
            adapter_id: { type: 'keyword' as const },
            // Snapshot fields written at ingest time (not extracted by the LLM).
            // `admiralty_rating` mirrors the NATO/military source reliability scale
            // (A = completely reliable … F = reliability cannot be judged).
            // `tier` is the feed tier snapshot so consumers can filter by source
            // quality without joining back to `.kibana-threat-intel-sources`.
            admiralty_rating: { type: 'keyword' as const },
            tier: { type: 'integer' as const },
          },
        },
        content: {
          properties: {
            title: {
              type: 'semantic_text' as const,
              // intentionally no inference_id — inherit cluster default
              copy_to: ['content.title_bm25'],
            },
            title_bm25: { type: 'text' as const },
            body_text: {
              type: 'semantic_text' as const,
              copy_to: ['content.body_text_bm25'],
            },
            body_text_bm25: { type: 'text' as const },
            body_html: { type: 'text' as const, index: false },
            language: { type: 'keyword' as const },
            // Structured citations from STIX SDOs (external_references array). Nested so
            // per-entry field associations survive multi-field queries (e.g. source_name +
            // url). description is stored but not searched (prose reference note).
            external_references: {
              type: 'nested' as const,
              properties: {
                source_name: { type: 'keyword' as const },
                url: { type: 'keyword' as const },
                canonical_url: { type: 'keyword' as const },
                external_id: { type: 'keyword' as const },
                description: { type: 'text' as const, index: false as const },
                // Per-reference m-of-n fragmentation fields (v19 chunking). Written by the
                // text_indicator_list adapter when a single # Reference: block must be split
                // across multiple report docs to stay under the nested-object limit.
                // Always present on text_indicator_list reports (unsplit = 1/1).
                ref_part: { type: 'integer' as const },
                ref_part_count: { type: 'integer' as const },
              },
            },
          },
        },
        severity: {
          properties: {
            level: { type: 'keyword' as const },
            score: { type: 'float' as const },
          },
        },
        // Multiplicative composite of `severity.score * extracted.relevance`
        // computed at extraction time. Populated by the
        // `enrich_threat_report` workflow's `capture_ranking_signals`
        // step so downstream consumers (`find_threat_reports` sort_by='rank',
        // dashboard "Top reports" panel, digest top-N gating) can rank
        // reports by detection actionability rather than recency or
        // severity alone. See the v8 doc comment above and tradecraft's
        // severity × relevance scoring model.
        rank_score: { type: 'float' as const },
        // Hunt-feedback-corroborated derivative of `rank_score`. Equal to
        // `rank_score * (1 + boost)` where `boost ∈ [0, 0.5]` is a
        // log-based function of `feedback.ioc_hit_count` and
        // `feedback.ttp_hit_count`. Written by
        // `services/write_hunt_feedback.ts` after every orchestrated
        // hunt; `find_threat_reports` sort_by='rank' uses this as the
        // primary sort key with `rank_score` and `severity.score` as
        // tie-breakers (so legacy or never-hunted reports still rank
        // sensibly). See the v9 doc comment above.
        corroborated_rank_score: { type: 'float' as const },
        extracted: {
          properties: {
            iocs: {
              type: 'nested' as const,
              properties: {
                type: { type: 'keyword' as const },
                value: { type: 'keyword' as const },
                defanged: { type: 'keyword' as const },
                severity: { type: 'keyword' as const },
                // IOC tier fields (v15). Distinct from source.tier (integer).
                // tier = active assignment; tier_heuristic = deterministic rule output;
                // tier_basis = rule name for tuning/observability.
                tier: { type: 'keyword' as const },
                tier_heuristic: { type: 'keyword' as const },
                tier_basis: { type: 'keyword' as const },
                // Port from socket extraction (v17): ip:port / domain:port → integer.
                port: { type: 'integer' as const },
                // Per-IOC nearest-ref URL from Maltrail trail files (v19). The promote_threat_indicators
                // task copies this into sources[].reference for the indicators companion index.
                reference: { type: 'keyword' as const },
                // Index of the Maltrail block this IOC belongs to (v19). Used by the sync task
                // to associate each IOC with its source reference URL.
                block_index: { type: 'integer' as const },
              },
            },
            ioc_set_hash: { type: 'keyword' as const },
            // LLM-emitted "how actionable is this report for writing a
            // detection rule?" score in `[0, 1]`. Populated by the
            // stage-2 enrichment in `enrich_threat_report`.
            // Multiplied with `severity.score` to derive `rank_score`.
            // A neutral 0.5 baseline is written if the enrichment step
            // fails (best-effort) so reports still get a usable rank.
            relevance: { type: 'float' as const },
            // Closed-set classifier — see `DETECTION_ACTIONABILITY_LEVELS`
            // in `common/threat_intelligence/hub/constants.ts`. Allows
            // operators to filter the digest / dashboard to only
            // `rule_candidate` reports without thresholding the float
            // `relevance` field.
            detection_actionability: { type: 'keyword' as const },
            ttps: {
              properties: {
                tactics: { type: 'keyword' as const },
                techniques: { type: 'keyword' as const },
              },
            },
            behaviors: {
              type: 'nested' as const,
              properties: {
                id: { type: 'keyword' as const },
                technique_id: { type: 'keyword' as const },
                description: { type: 'text' as const },
                telemetry_targets: { type: 'keyword' as const },
                llm_confidence: { type: 'float' as const },
                confidence: { type: 'float' as const },
              },
            },
            threat_actors: { type: 'keyword' as const },
            target_sectors: { type: 'keyword' as const },
            // Closed-set 15-category taxonomy. Populated by the stage-2
            // enrichment in `enrich_threat_report`. See
            // `THREAT_CATEGORIES` in `common/constants.ts` for the allowed
            // values.
            categories: { type: 'keyword' as const },
            // Diamond Model extraction fields — populated by `extract_diamond`
            // for threat-positive reports (gated on `enrich_taxonomy`'s
            // `detection_actionability` signal). See Phase 1 design.
            diamond: {
              properties: {
                adversary: {
                  properties: {
                    // HIGH = specific named actor; PARTIAL = vague/unattributed; NONE = absent.
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                    },
                  },
                },
                capability: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                    },
                  },
                },
                infrastructure: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                    },
                  },
                },
                victim: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                    },
                  },
                },
                // Count of vertices with signal != NONE (0..4). Cheap filter
                // for "how much diamond structure did we extract from this report?"
                signal_count: { type: 'integer' as const },
                // Connector/model that produced the extraction — for audit trail.
                model_id: { type: 'keyword' as const },
                extracted_at: { type: 'date' as const },
                // 'single_call' (normal path) | 'per_vertex_fallback' (context-overflow fallback).
                extraction_mode: { type: 'keyword' as const },
                // Gate result written for EVERY report (true+false) by persist_extractions and
                // backfill_diamond_fields. Queryable for observability + future dry_run estimation
                // using real measured fraction rather than the documented constant estimate.
                suitable: { type: 'boolean' as const },
              },
            },
            // assess_relevance gate verdict — persisted observe-first on every
            // extraction run. No consumer gates on this yet; validated corpus-wide
            // before an if:-skip is added in a follow-up slice.
            // Note: primary_links is deferred (no consumer until Slice-5).
            gate: {
              properties: {
                is_intelligence: { type: 'boolean' as const },
                quality_class: { type: 'keyword' as const },
                evidence_tier: { type: 'keyword' as const },
                needs_render: { type: 'boolean' as const },
                has_original_commentary: { type: 'boolean' as const },
                reason: { type: 'text' as const, index: false },
                assessed_at: { type: 'date' as const },
              },
            },
            // Structured vulnerability fields — populated at ingest by the kev adapter
            // for CISA KEV entries. All fields are keyword/date (aggregatable) so INFOSEC
            // can filter and aggregate by vendor/product/cveID without text analysis.
            // Added in v20.
            vulnerability: {
              properties: {
                cve_id: { type: 'keyword' as const },
                vendor: { type: 'keyword' as const },
                product: { type: 'keyword' as const },
                name: { type: 'keyword' as const },
                cwes: { type: 'keyword' as const },
                date_added: { type: 'date' as const },
                due_date: { type: 'date' as const },
                ransomware_use: { type: 'keyword' as const },
              },
            },
          },
        },
        // Closed-set geographic macro-region taxonomy. Populated by the
        // same stage-2 enrichment as `extracted.categories`. See
        // `THREAT_REGIONS` in `common/constants.ts` for the allowed values.
        geography: {
          properties: {
            regions: { type: 'keyword' as const },
          },
        },
        lineage: {
          properties: {
            ingested_at: { type: 'date' as const },
            extracted_at: { type: 'date' as const },
            extraction_method: { type: 'keyword' as const },
            source_doc_ref: {
              properties: {
                index: { type: 'keyword' as const },
                id: { type: 'keyword' as const },
              },
            },
            duplicate_of: { type: 'keyword' as const },
            related_reports: { type: 'keyword' as const },
            related_reports_count: { type: 'integer' as const },
          },
        },
        // Alert-to-report rollup from `attribute_alerts_to_reports`.
        attribution: {
          properties: {
            environment_hits: {
              properties: {
                window: { type: 'keyword' as const },
                computed_at: { type: 'date' as const },
                layer_1_ioc_match: { type: 'integer' as const },
                layer_2_behavioral: { type: 'integer' as const },
              },
            },
            environment_hits_total: { type: 'integer' as const },
          },
        },
        // Hunt-feedback aggregate, refreshed by `write_hunt_feedback`
        // after every orchestrator hunt against a known `report_id`.
        // Distinct from `attribution.environment_hits` (which is the
        // hourly cross-rule backfill from `attribute_alerts_to_reports`):
        // `feedback` reflects the latest *targeted* hunt's outcome and
        // feeds `corroborated_rank_score`; the attribution block reflects
        // ambient Detection Engine alert volume. The two coexist
        // deliberately so the digest can show both "what this report's
        // IOCs hit in the targeted hunt" and "what alerts have fired
        // referencing this report in the last 7d".
        feedback: {
          properties: {
            ioc_hit_count: { type: 'long' as const },
            ttp_hit_count: { type: 'long' as const },
            affected_host_count: { type: 'long' as const },
            affected_user_count: { type: 'long' as const },
            last_hunted_at: { type: 'date' as const },
            // `HuntForThreatStatus` echo — see
            // `services/hunt_for_threat.ts`. Closed enum but typed as
            // keyword so a future enum extension does not require a
            // mapping migration.
            last_hunt_status: { type: 'keyword' as const },
            // Wall-clock window of the hunt that produced these counts,
            // ISO-8601 stringified. Lets readers tell "no hits because
            // not hunted recently" from "no hits in the searched window".
            last_hunt_window: {
              properties: {
                from: { type: 'date' as const },
                to: { type: 'date' as const },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Companion regular indices. Smaller, low-volume; no rollover needed.
 * One template per index with `index_patterns: [exactName]`.
 */
const COMPANION_INDEX_TEMPLATES: Array<{
  name: string;
  body: Parameters<ElasticsearchClient['indices']['putIndexTemplate']>[0];
}> = [
  {
    name: `${THREAT_INTEL_SOURCES_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_SOURCES_INDEX}-template`,
      index_patterns: [THREAT_INTEL_SOURCES_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          dynamic: 'strict',
          properties: {
            adapter_type: { type: 'keyword' },
            name: { type: 'keyword' },
            enabled: { type: 'boolean' },
            config: { type: 'object', enabled: false },
            tags: { type: 'keyword' },
            space_id: { type: 'keyword' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },
      },
    },
  },
  {
    name: `${THREAT_INTEL_SUBSCRIPTIONS_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_SUBSCRIPTIONS_INDEX}-template`,
      index_patterns: [THREAT_INTEL_SUBSCRIPTIONS_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          dynamic: 'strict',
          properties: {
            owner: { type: 'keyword' },
            tags: { type: 'keyword' },
            severity_threshold: { type: 'keyword' },
            schedule_rrule: { type: 'keyword' },
            delivery: {
              properties: {
                type: { type: 'keyword' },
                target: { type: 'keyword' },
                // Configured Kibana actions connector instance id. Required
                // for the `deliver_threat_digests` workflow to dispatch through the
                // actions plugin (the connector type is implied by
                // `delivery.type`: `.email` for `email`, `.slack` for `slack`).
                connector_id: { type: 'keyword' },
              },
            },
            workflow_id: { type: 'keyword' },
            human_summary: { type: 'text' },
            template_id: { type: 'keyword' },
            space_id: { type: 'keyword' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' },
          },
        },
      },
    },
  },
  {
    name: `${THREAT_INTEL_INDICATORS_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_INDICATORS_INDEX}-template`,
      index_patterns: [THREAT_INTEL_INDICATORS_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          // ECS-aligned `threat.indicator.*` shape so Detection Engine's
          // Indicator Match rule type can query this index with its default
          // field mapping. The `indicator.reference` field carries
          // `threat-report:<report_id>` for the Workflow 4 hit backfill.
          dynamic: 'strict',
          properties: {
            '@timestamp': { type: 'date' },
            threat: {
              properties: {
                indicator: {
                  properties: {
                    type: { type: 'keyword' },
                    provider: { type: 'keyword' },
                    reference: { type: 'keyword' },
                    description: { type: 'text', index: false },
                    confidence: { type: 'keyword' },
                    first_seen: { type: 'date' },
                    last_seen: { type: 'date' },
                    ip: { type: 'ip' },
                    url: {
                      properties: {
                        full: { type: 'keyword' },
                        domain: { type: 'keyword' },
                      },
                    },
                    file: {
                      properties: {
                        hash: {
                          properties: {
                            md5: { type: 'keyword' },
                            sha1: { type: 'keyword' },
                            sha256: { type: 'keyword' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            // Per-report citation accumulator (v19). Nested so each entry's
            // fields are associated correctly in multi-field queries. Dedup key
            // within the array is `report_id` — scripted upsert in
            // `tasks/promote_threat_indicators.ts` guards against duplicates.
            sources: {
              type: 'nested',
              properties: {
                report_id: { type: 'keyword' },
                provider: { type: 'keyword' },
                trail: { type: 'keyword' },
                reference: { type: 'keyword' },
                first_seen: { type: 'date' },
              },
            },
            // Sync bookkeeping — retained for backward-compat reads; sources[]
            // is now the authoritative citation store.
            source_report_id: { type: 'keyword' },
            source_report_url: { type: 'keyword' },
            severity: { type: 'keyword' },
          },
        },
      },
    },
  },
  {
    name: `${THREAT_INTEL_DIGESTS_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_DIGESTS_INDEX}-template`,
      index_patterns: [THREAT_INTEL_DIGESTS_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          dynamic: 'strict',
          properties: {
            '@timestamp': { type: 'date' },
            subscription_id: { type: 'keyword' },
            time_range: {
              properties: {
                from: { type: 'date' },
                to: { type: 'date' },
              },
            },
            content_markdown: { type: 'text' },
            report_ids: { type: 'keyword' },
            // `_id` of the row in `.kibana-threat-intel-advisories` the
            // agent cited as the executive summary for this digest.
            // Optional — absent when `synthesize_advisory` returned
            // `no_reports` / `no_inference` (graceful-degradation paths
            // documented in `services/synthesize_advisory.ts`). See
            // `workflows/deliver_threat_digests.yaml`'s `archive_digest` step
            // for how it's populated.
            advisory_id: { type: 'keyword' },
            delivered: { type: 'boolean' },
            delivery_error: { type: 'text', index: false },
            space_id: { type: 'keyword' },
          },
        },
      },
    },
  },
  {
    // Advisories companion — LLM-synthesised cross-report narratives. See
    // `services/synthesize_advisory.ts`. One row per advisory; rows are
    // append-only (no in-place edits) so re-runs over the same window
    // produce a new row, letting the UI render an audit trail of
    // synthesis attempts. Indexed by `theme_id` (a stable digest of the
    // input report-id set) so the de-dup logic can filter at query time.
    name: `${THREAT_INTEL_ADVISORIES_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_ADVISORIES_INDEX}-template`,
      index_patterns: [THREAT_INTEL_ADVISORIES_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          dynamic: 'strict',
          properties: {
            '@timestamp': { type: 'date' },
            // Stable digest of the input set — used to detect duplicate
            // synthesis runs over the same window + report selection.
            theme_id: { type: 'keyword' },
            time_range: {
              properties: {
                from: { type: 'date' },
                to: { type: 'date' },
              },
            },
            // Filter inputs that produced the advisory, persisted so the
            // dashboard can render "synthesised from X reports in CATEGORY
            // over the past 7 days" without recomputing.
            filters: {
              properties: {
                tags: { type: 'keyword' },
                categories: { type: 'keyword' },
                regions: { type: 'keyword' },
                min_severity: { type: 'keyword' },
              },
            },
            // LLM-produced narrative. `theme_title` is the short headline,
            // `narrative_markdown` is the 2-3 paragraph body. Both are
            // text-only (no inference / semantic_text) — advisories are
            // read by humans, not searched.
            theme_title: { type: 'text' },
            narrative_markdown: { type: 'text' },
            // Recommended actions — short imperative bullets, parsed by
            // the UI into a checkbox list and a "Open a Case" button.
            recommended_actions: { type: 'keyword' },
            // Source reports — the report ids the advisory was synthesised
            // from. Lets the UI render "View source reports" drill-downs
            // and powers the "advisory coverage" panel on the dashboard.
            report_ids: { type: 'keyword' },
            // Threat actor / category aggregations the LLM was given as
            // a prompt anchor. Persisted so a later re-render of the
            // advisory does not have to re-compute them.
            grouping: {
              properties: {
                threat_actors: { type: 'keyword' },
                categories: { type: 'keyword' },
                regions: { type: 'keyword' },
              },
            },
            generated_by: { type: 'keyword' },
            space_id: { type: 'keyword' },
          },
        },
      },
    },
  },
  {
    name: `${THREAT_INTEL_HUNT_FINDINGS_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_HUNT_FINDINGS_INDEX}-template`,
      index_patterns: [THREAT_INTEL_HUNT_FINDINGS_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        mappings: {
          dynamic: 'strict',
          properties: {
            '@timestamp': { type: 'date' },
            space_id: { type: 'keyword' },
            report_id: { type: 'keyword' },
            report_title: { type: 'text' },
            technique_id: { type: 'keyword' },
            technique_name: { type: 'keyword' },
            hypothesis: { type: 'text' },
            hypothesis_rationale: { type: 'text' },
            confidence: { type: 'float' },
            severity: { type: 'keyword' },
            risk_score: { type: 'integer' },
            proposed_esql_rule: { type: 'text', index: false },
            rule_name: { type: 'keyword' },
            affected_assets: {
              properties: {
                hosts: { type: 'keyword' },
                users: { type: 'keyword' },
              },
            },
            tier1_status: { type: 'keyword' },
            hunt_run_status: { type: 'keyword' },
            hunt_run_id: { type: 'keyword' },
            status: { type: 'keyword' },
            deployed_rule_id: { type: 'keyword' },
            deployed_at: { type: 'date' },
          },
        },
      },
    },
  },
];

/**
 * Patches the `extracted.diamond.*` field mappings onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices that were created before the
 * v14 template deployed. The v14 template adds these fields automatically to
 * new rollovers, but pre-existing backing indices keep their original (v13)
 * mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: if `extracted.diamond.suitable`
 * already exists the backing index is skipped; ES PUT-mapping for additive
 * fields is otherwise a no-op for fields that already match.
 *
 * Without this migration the `backfill_diamond_fields` task would silently
 * fail all ES updates with `strict_dynamic_mapping_exception` because
 * `dynamic: 'strict'` rejects unknown fields.
 */
const migrateExistingDiamondMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('diamond-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `diamond-mapping-migration: data stream not found — skipping (${(err as Error).message})`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const extractedProps = (
        indexMappings?.mappings?.properties as
          | Record<string, { properties?: Record<string, unknown> }>
          | undefined
      )?.extracted?.properties;

      if (!extractedProps?.diamond) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                diamond: {
                  properties: {
                    suitable: { type: 'boolean' },
                    signal_count: { type: 'integer' },
                    model_id: { type: 'keyword' },
                    extracted_at: { type: 'date' },
                    extraction_mode: { type: 'keyword' },
                    adversary: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                        },
                      },
                    },
                    capability: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                        },
                      },
                    },
                    infrastructure: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                        },
                      },
                    },
                    victim: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_INFERENCE_ENDPOINT_ID,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated diamond mappings on ${indexName} (v14 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate diamond mappings on ${indexName}: ${(err as Error).message}. ` +
          `The backfill_diamond_fields task will be unable to write diamond fields to ` +
          `documents in this index until the mapping is updated manually: ` +
          `PUT ${indexName}/_mapping { "properties": { "extracted": { "properties": { "diamond": { ... } } } } }`
      );
    }
  }
};

/**
 * Patches the `extracted.iocs[].tier*` keyword fields onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices created before the v15 template.
 * The v15 template adds these fields automatically to new rollovers; pre-existing
 * backing indices keep their original (v14) mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive
 * keyword fields. Without this, writes to pre-v15 indices fail with
 * `strict_dynamic_mapping_exception` because the iocs nested object is
 * `dynamic: strict` via the parent mapping.
 */
const migrateExistingIocTierMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-tier-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `ioc-tier-mapping-migration: data stream not found — skipping (${(err as Error).message})`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const iocProps = (
        (
          indexMappings?.mappings?.properties as
            | Record<
                string,
                { properties?: Record<string, { properties?: Record<string, unknown> }> }
              >
            | undefined
        )?.extracted?.properties?.iocs as { properties?: Record<string, unknown> } | undefined
      )?.properties;

      if (!iocProps?.tier) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                iocs: {
                  type: 'nested',
                  properties: {
                    tier: { type: 'keyword' },
                    tier_heuristic: { type: 'keyword' },
                    tier_basis: { type: 'keyword' },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated ioc tier mappings on ${indexName} (v15 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate ioc tier mappings on ${indexName}: ${(err as Error).message}. ` +
          `The extracted.iocs tier fields will be rejected by dynamic: strict until the ` +
          `mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches the `extracted.iocs[].port` field onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices created before the v17 template.
 * The v17 template adds `port` automatically to new rollovers; pre-existing
 * backing indices keep their original (v15/v16) mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive
 * changes. If the index does not exist yet no-ops silently.
 */
const migrateExistingIocPortMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-port-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `ioc-port-mapping-migration: data stream not found — skipping (${(err as Error).message})`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const iocProps = (
        (
          indexMappings?.mappings?.properties as
            | Record<
                string,
                { properties?: Record<string, { properties?: Record<string, unknown> }> }
              >
            | undefined
        )?.extracted?.properties?.iocs as { properties?: Record<string, unknown> } | undefined
      )?.properties;

      if (!iocProps?.port) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                iocs: {
                  type: 'nested',
                  properties: {
                    port: { type: 'integer' },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated ioc port mapping on ${indexName} (v17 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate ioc port mapping on ${indexName}: ${(err as Error).message}. ` +
          `The extracted.iocs port field will be rejected by dynamic: strict until the ` +
          `mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches the `extracted.iocs[].reference` and `extracted.iocs[].block_index` fields
 * onto any existing `.ds-.kibana-threat-reports-*` backing indices created before
 * the v19 template. These fields are written by the `text_indicator_list` adapter
 * (Maltrail trail files) — `reference` is the per-IOC nearest-ref URL; `block_index`
 * is the ordinal position of the Maltrail block that contributed the IOC.
 *
 * Safe to re-run on every plugin start: PUT mapping is additive and idempotent.
 * Without this, text_indicator_list writes fail with `strict_dynamic_mapping_exception`
 * on pre-v19 indices.
 */
const migrateExistingIocReferenceMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-reference-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `ioc-reference-mapping-migration: data stream not found — skipping (${
        (err as Error).message
      })`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const iocProps = (
        (
          indexMappings?.mappings?.properties as
            | Record<
                string,
                { properties?: Record<string, { properties?: Record<string, unknown> }> }
              >
            | undefined
        )?.extracted?.properties?.iocs as { properties?: Record<string, unknown> } | undefined
      )?.properties;

      if (!iocProps?.reference || !iocProps?.block_index) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                iocs: {
                  type: 'nested',
                  properties: {
                    reference: { type: 'keyword' },
                    block_index: { type: 'integer' },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated ioc reference/block_index mappings on ${indexName} (v19 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate ioc reference mappings on ${indexName}: ${(err as Error).message}. ` +
          `The extracted.iocs reference/block_index fields will be rejected by dynamic: strict ` +
          `until the mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches the `extracted.gate.*` field mappings onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices created before the v16 template.
 * The v16 template adds these fields automatically to new rollovers; pre-existing
 * backing indices keep their original (v15) mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive
 * fields. Without this, writes to pre-v16 indices fail with
 * `strict_dynamic_mapping_exception` because `dynamic: 'strict'` rejects
 * unknown fields under `extracted`.
 */
const migrateExistingGateMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('gate-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `gate-mapping-migration: data stream not found — skipping (${(err as Error).message})`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const extractedProps = (
        indexMappings?.mappings?.properties as
          | Record<string, { properties?: Record<string, unknown> }>
          | undefined
      )?.extracted?.properties;

      if (!extractedProps?.gate) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                gate: {
                  properties: {
                    is_intelligence: { type: 'boolean' },
                    quality_class: { type: 'keyword' },
                    lineage: { type: 'keyword' },
                    needs_render: { type: 'boolean' },
                    has_original_commentary: { type: 'boolean' },
                    reason: { type: 'text', index: false },
                    assessed_at: { type: 'date' },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated gate mappings on ${indexName} (v16 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate gate mappings on ${indexName}: ${(err as Error).message}. ` +
          `The extracted.gate fields will be rejected by dynamic: strict until the ` +
          `mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches the `content.external_references` nested field onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices created before the v18 template.
 * The v18 template adds this field automatically to new rollovers; pre-existing
 * backing indices keep their original mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive
 * nested fields. Without this, writes to pre-v18 indices fail with
 * `strict_dynamic_mapping_exception` because `dynamic: 'strict'` rejects
 * unknown fields under `content`.
 */
const migrateExistingExternalReferencesMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('external-references-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `external-references-mapping-migration: data stream not found — skipping (${
        (err as Error).message
      })`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const contentProps = (
        indexMappings?.mappings?.properties as
          | Record<string, { properties?: Record<string, unknown> }>
          | undefined
      )?.content?.properties;

      const extRefProps = (
        contentProps?.external_references as { properties?: Record<string, unknown> } | undefined
      )?.properties;

      if (!contentProps?.external_references) {
        // State 2: index predates v18 — no external_references block at all.
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            content: {
              properties: {
                external_references: {
                  type: 'nested',
                  properties: {
                    source_name: { type: 'keyword' },
                    url: { type: 'keyword' },
                    canonical_url: { type: 'keyword' },
                    external_id: { type: 'keyword' },
                    description: { type: 'text', index: false },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated external_references mapping on ${indexName} (v18 backfill)`);
      } else if (!extRefProps?.canonical_url) {
        // State 3: index has external_references (v18/v19) but canonical_url subfield is absent.
        // putMapping onto an existing nested field is additive and idempotent.
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            content: {
              properties: {
                external_references: {
                  type: 'nested',
                  properties: {
                    canonical_url: { type: 'keyword' },
                    ref_part: { type: 'integer' },
                    ref_part_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        });
        log.info(
          `Migrated canonical_url + ref_part/ref_part_count subfields on ${indexName} (v19 backfill)`
        );
      } else if (!extRefProps?.ref_part || !extRefProps?.ref_part_count) {
        // State 4: index has external_references + canonical_url but lacks ref_part/ref_part_count
        // (v19 indices created before chunking was added). Additive and idempotent.
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            content: {
              properties: {
                external_references: {
                  type: 'nested',
                  properties: {
                    ref_part: { type: 'integer' },
                    ref_part_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        });
        log.info(
          `Migrated ref_part/ref_part_count subfields on ${indexName} (v19 chunking backfill)`
        );
      }
    } catch (err) {
      log.error(
        `Failed to migrate external_references mapping on ${indexName}: ${
          (err as Error).message
        }. ` +
          `The content.external_references field will be rejected by dynamic: strict until the ` +
          `mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches the `sources` nested field mapping onto the pre-v19 indicators companion
 * index (`.kibana-threat-intel-indicators`). The indicators index is a plain companion
 * index (not a data stream), so the PUT mapping targets it directly.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive fields.
 * Without this, scripted upserts that write `sources[]` entries would be rejected by
 * `strict_dynamic_mapping_exception` on pre-v19 indices.
 */
const migrateExistingIndicatorSourcesMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('indicator-sources-mapping-migration');

  try {
    const exists = await esClient.indices.exists({ index: THREAT_INTEL_INDICATORS_INDEX });
    if (!exists) {
      log.debug(`indicator-sources-mapping-migration: index not found — skipping`);
      return;
    }

    const { [THREAT_INTEL_INDICATORS_INDEX]: indexMappings } = await esClient.indices.getMapping({
      index: THREAT_INTEL_INDICATORS_INDEX,
    });
    const topLevelProps = indexMappings?.mappings?.properties as
      | Record<string, unknown>
      | undefined;

    if (!topLevelProps?.sources) {
      await esClient.indices.putMapping({
        index: THREAT_INTEL_INDICATORS_INDEX,
        properties: {
          sources: {
            type: 'nested',
            properties: {
              report_id: { type: 'keyword' },
              provider: { type: 'keyword' },
              trail: { type: 'keyword' },
              reference: { type: 'keyword' },
              first_seen: { type: 'date' },
            },
          },
        },
      });
      log.info(`Migrated sources[] mapping on ${THREAT_INTEL_INDICATORS_INDEX} (v19 backfill)`);
    }
  } catch (err) {
    log.error(
      `Failed to migrate sources[] mapping on ${THREAT_INTEL_INDICATORS_INDEX}: ${
        (err as Error).message
      }. ` +
        `The sources[] field will be rejected by dynamic: strict until the mapping is updated manually.`
    );
  }
};

/**
 * Patches `extracted.vulnerability.*` field mappings onto any existing
 * `.ds-.kibana-threat-reports-*` backing indices created before the v20 template.
 * The v20 template adds these fields automatically to new rollovers; pre-existing
 * backing indices keep their original mapping until explicitly updated.
 *
 * Safe to re-run on every plugin start: PUT mapping is idempotent for additive
 * fields. Without this, writes from the kev adapter fail with
 * `strict_dynamic_mapping_exception` because `dynamic: 'strict'` rejects
 * unknown fields under `extracted`.
 */
const migrateExistingVulnerabilityMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('vulnerability-mapping-migration');

  let backingIndices: string[];
  try {
    const streamInfo = await esClient.indices.getDataStream(
      { name: THREAT_REPORTS_DATA_STREAM },
      { ignore: [404] }
    );
    backingIndices = (streamInfo.data_streams ?? []).flatMap((ds) =>
      (ds.indices ?? []).map((i) => i.index_name)
    );
  } catch (err) {
    log.debug(
      `vulnerability-mapping-migration: data stream not found — skipping (${
        (err as Error).message
      })`
    );
    return;
  }

  for (const indexName of backingIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const extractedProps = (
        indexMappings?.mappings?.properties as
          | Record<string, { properties?: Record<string, unknown> }>
          | undefined
      )?.extracted?.properties;

      if (!extractedProps?.vulnerability) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            extracted: {
              properties: {
                vulnerability: {
                  properties: {
                    cve_id: { type: 'keyword' },
                    vendor: { type: 'keyword' },
                    product: { type: 'keyword' },
                    name: { type: 'keyword' },
                    cwes: { type: 'keyword' },
                    date_added: { type: 'date' },
                    due_date: { type: 'date' },
                    ransomware_use: { type: 'keyword' },
                  },
                },
              },
            },
          },
        });
        log.info(`Migrated extracted.vulnerability mappings on ${indexName} (v20 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate vulnerability mappings on ${indexName}: ${(err as Error).message}. ` +
          `The extracted.vulnerability fields will be rejected by dynamic: strict until the ` +
          `mapping is updated manually.`
      );
    }
  }
};

/**
 * Patches deploy-status fields onto the hunt findings companion index when it
 * was created before the v22 template. Safe to re-run: PUT mapping is
 * idempotent for additive fields. Without this, updates that write `status` /
 * `deployed_rule_id` / `deployed_at` are rejected by `dynamic: strict`.
 */
const migrateExistingHuntFindingDeployMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('hunt-finding-deploy-mapping-migration');

  try {
    const exists = await esClient.indices.exists({ index: THREAT_INTEL_HUNT_FINDINGS_INDEX });
    if (!exists) {
      log.debug(`hunt-finding-deploy-mapping-migration: index not found — skipping`);
      return;
    }

    const { [THREAT_INTEL_HUNT_FINDINGS_INDEX]: indexMappings } = await esClient.indices.getMapping({
      index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
    });
    const topLevelProps = indexMappings?.mappings?.properties as
      | Record<string, unknown>
      | undefined;

    if (!topLevelProps?.status || !topLevelProps?.deployed_rule_id || !topLevelProps?.deployed_at) {
      await esClient.indices.putMapping({
        index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
        properties: {
          status: { type: 'keyword' },
          deployed_rule_id: { type: 'keyword' },
          deployed_at: { type: 'date' },
        },
      });
      log.info(
        `Migrated deploy-status mappings on ${THREAT_INTEL_HUNT_FINDINGS_INDEX} (v22 backfill)`
      );
    }
  } catch (err) {
    log.error(
      `Failed to migrate deploy-status mappings on ${THREAT_INTEL_HUNT_FINDINGS_INDEX}: ${
        (err as Error).message
      }. ` +
        `Deploy status writes will be rejected by dynamic: strict until the mapping is updated manually.`
    );
  }
};

const ensureCompanionIndex = async (
  esClient: ElasticsearchClient,
  indexName: string,
  logger: Logger
): Promise<void> => {
  const exists = await esClient.indices.exists({ index: indexName });
  if (exists) return;
  try {
    await esClient.indices.create({ index: indexName });
    logger.debug(`Created companion index ${indexName}`);
  } catch (err) {
    // Concurrent creation race — ignore the conflict.
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 400) return;
    throw err;
  }
};

const ensureDataStream = async (
  esClient: ElasticsearchClient,
  dataStreamName: string,
  logger: Logger
): Promise<void> => {
  const existing = await esClient.indices.getDataStream(
    { name: dataStreamName },
    { ignore: [404] }
  );
  if (existing.data_streams && existing.data_streams.length > 0) return;
  try {
    await esClient.indices.createDataStream({ name: dataStreamName });
    logger.debug(`Created data stream ${dataStreamName}`);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 400) return;
    throw err;
  }
};

/**
 * Idempotently registers all index templates and creates the data stream and
 * companion indices. Safe to call on every plugin start; only writes when
 * something is missing or out of date.
 */
export const installIndexTemplates = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const log = logger.get('index-templates');
  log.info('Installing threat intelligence index templates');

  await esClient.indices.putIndexTemplate({
    // Derived from the data-stream constant so the template name stays in
    // lockstep with the data-stream name and never drifts (e.g. on the v7
    // `.kibana-threat-*` rename).
    name: `${THREAT_REPORTS_DATA_STREAM}-template`,
    ...threatReportsTemplate,
  });

  for (const template of COMPANION_INDEX_TEMPLATES) {
    await esClient.indices.putIndexTemplate(template.body);
  }

  await ensureDataStream(esClient, THREAT_REPORTS_DATA_STREAM, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_SOURCES_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_SUBSCRIPTIONS_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_DIGESTS_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_INDICATORS_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_ADVISORIES_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_HUNT_FINDINGS_INDEX, log);

  // Patch diamond fields onto any pre-v14 backing indices. Safe to re-run.
  await migrateExistingDiamondMappings(esClient, log);
  // Patch ioc tier fields onto any pre-v15 backing indices. Safe to re-run.
  await migrateExistingIocTierMappings(esClient, log);
  // Patch gate fields onto any pre-v16 backing indices. Safe to re-run.
  await migrateExistingGateMappings(esClient, log);
  // Patch ioc port field onto any pre-v17 backing indices. Safe to re-run.
  await migrateExistingIocPortMapping(esClient, log);
  // Patch content.external_references nested field onto any pre-v18 backing indices. Safe to re-run.
  await migrateExistingExternalReferencesMapping(esClient, log);
  // Patch ioc reference/block_index fields onto any pre-v19 backing indices. Safe to re-run.
  await migrateExistingIocReferenceMappings(esClient, log);
  // Patch sources[] nested field onto the pre-v19 indicators companion index. Safe to re-run.
  await migrateExistingIndicatorSourcesMapping(esClient, log);
  // Patch extracted.vulnerability.* fields onto any pre-v20 backing indices. Safe to re-run.
  await migrateExistingVulnerabilityMappings(esClient, log);
  // Patch deploy-status fields onto the pre-v22 hunt findings companion index. Safe to re-run.
  await migrateExistingHuntFindingDeployMappings(esClient, log);

  log.info('Threat intelligence index templates installed');
};
