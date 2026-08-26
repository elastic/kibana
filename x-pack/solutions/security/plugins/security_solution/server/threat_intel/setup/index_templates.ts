/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ExpandWildcards } from '@elastic/elasticsearch/lib/api/types';
import {
  THREAT_REPORTS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_INTEL_INDICATORS_INDEX,
  DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
} from '../../../common/threat_intel';

const TEMPLATE_VERSION = 24;

const TEMPLATE_META = { managed_by: 'threat_intel', version: TEMPLATE_VERSION };

/**
 * These are plugin-owned indices, not user data: they must not show up in index
 * patterns, `_cat` output, or `*` searches. Anything reading them by wildcard has
 * to opt in with `expand_wildcards: ['open', 'hidden']`.
 */
const HIDDEN_INDEX_SETTINGS = { 'index.hidden': true } as const;

/** Wildcard reads must ask for hidden indices explicitly. */
export const HIDDEN_INDEX_SEARCH_OPTIONS = {
  expand_wildcards: ['open', 'hidden'] as ExpandWildcards,
  ignore_unavailable: true,
  allow_no_indices: true,
};

const threatReportsTemplate = {
  index_patterns: [THREAT_REPORTS_INDEX_PATTERN],
  priority: 200,
  _meta: TEMPLATE_META,
  template: {
    settings: {
      ...HIDDEN_INDEX_SETTINGS,
      'index.mapping.total_fields.limit': 5000,
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
        // Multiplicative composite of severity.score * extracted.relevance,
        // written by enrich_threat_report's capture_ranking_signals step.
        rank_score: { type: 'float' as const },
        // Hunt-feedback-corroborated derivative of rank_score (rank_score * boost).
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
            // LLM-emitted "how useful is this report for writing a
            // detection rule?" score in `[0, 1]`. Populated by the
            // stage-2 enrichment in `enrich_threat_report`.
            // Multiplied with `severity.score` to derive `rank_score`.
            // A neutral 0.5 baseline is written if the enrichment step
            // fails (best-effort) so reports still get a usable rank.
            relevance: { type: 'float' as const },
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
            // Diamond Model extraction — populated by extract_diamond for
            // threat-positive reports (gated on enrich_taxonomy actionability).
            diamond: {
              properties: {
                adversary: {
                  properties: {
                    // HIGH = specific named actor; PARTIAL = vague/unattributed; NONE = absent.
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                    },
                  },
                },
                capability: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                    },
                  },
                },
                infrastructure: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                    },
                  },
                },
                victim: {
                  properties: {
                    signal: { type: 'keyword' as const },
                    summary: {
                      type: 'semantic_text' as const,
                      inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
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
                // Whether extract_diamond considered this report suitable (observability).
                suitable: { type: 'boolean' as const },
              },
            },
            // assess_relevance gate verdict — persisted on every enrichment run.
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
            // Structured vulnerability fields from the kev adapter (keyword/date, aggregatable).
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
            // Set once the retention task drops the untrusted report body. Also
            // the idempotency marker that keeps the task from re-scrubbing.
            content_scrubbed_at: { type: 'date' as const },
          },
        },
        // Environment hit rollup keyed by report (when attribution is written).
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
        // Per-report hunt outcome aggregate (ioc/ttp hit counts, last hunt window).
        feedback: {
          properties: {
            ioc_hit_count: { type: 'long' as const },
            ttp_hit_count: { type: 'long' as const },
            affected_host_count: { type: 'long' as const },
            affected_user_count: { type: 'long' as const },
            last_hunted_at: { type: 'date' as const },
            // Latest targeted hunt status echo (keyword for mapping stability).
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
        settings: { ...HIDDEN_INDEX_SETTINGS },
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
    name: `${THREAT_INTEL_INDICATORS_INDEX}-template`,
    body: {
      name: `${THREAT_INTEL_INDICATORS_INDEX}-template`,
      index_patterns: [THREAT_INTEL_INDICATORS_INDEX],
      priority: 200,
      _meta: TEMPLATE_META,
      template: {
        settings: { ...HIDDEN_INDEX_SETTINGS },
        mappings: {
          // ECS-aligned `threat.indicator.*` shape so Detection Engine's
          // Indicator Match rule type can query this index with its default
          // field mapping. The `indicator.reference` field carries
          // `threat-report:<report_id>` for alert-to-report joins.
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
                            sha512: { type: 'keyword' },
                          },
                        },
                      },
                    },
                    // One field per remaining `IOC_TYPES` entry. `dynamic:
                    // 'strict'` rejects the whole document otherwise, so any
                    // type `ecsIndicatorPayload` can emit needs a mapping here.
                    email: { type: 'keyword' },
                    network: {
                      properties: {
                        cidr: { type: 'keyword' },
                      },
                    },
                    cryptocurrency: {
                      properties: {
                        address: { type: 'keyword' },
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
            // Owning space of the citing reports. Indicators are keyed
            // `<space_id>:<type>:<value>` so a value seen in two spaces stays two
            // isolated docs and sources[] never merges across space boundaries.
            space_id: { type: 'keyword' },
            // Legacy single-source fields; sources[] is authoritative for citations.
            source_report_id: { type: 'keyword' },
            source_report_url: { type: 'keyword' },
            severity: { type: 'keyword' },
            // extract_iocs tier that let this row through the promote vetting gate.
            ioc_tier: { type: 'keyword' },
          },
        },
      },
    },
  },
];

/**
 * Concrete report indices to patch. Reports live in a regular index (they are
 * updated in place by enrich, attribution, and feedback), so there is no data
 * stream to ask for backing indices — resolving the pattern is the only way to
 * find them.
 */
const resolveReportIndices = async (
  esClient: ElasticsearchClient,
  log: Logger
): Promise<string[]> => {
  try {
    const response = await esClient.indices.get(
      { index: THREAT_REPORTS_INDEX_PATTERN, ...HIDDEN_INDEX_SEARCH_OPTIONS },
      { ignore: [404] }
    );
    return Object.keys(response ?? {});
  } catch (err) {
    log.debug(`reports index not found — skipping migration (${(err as Error).message})`);
    return [];
  }
};

const migrateExistingDiamondMappings = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('diamond-mapping-migration');

  for (const indexName of reportIndices) {
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
                          inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                        },
                      },
                    },
                    capability: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                        },
                      },
                    },
                    infrastructure: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
                        },
                      },
                    },
                    victim: {
                      properties: {
                        signal: { type: 'keyword' },
                        summary: {
                          type: 'semantic_text',
                          inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
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
          `extract_diamond writes will fail on documents in this index until the mapping is updated manually: ` +
          `PUT ${indexName}/_mapping { "properties": { "extracted": { "properties": { "diamond": { ... } } } } }`
      );
    }
  }
};

const migrateExistingIocTierMappings = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-tier-mapping-migration');

  for (const indexName of reportIndices) {
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

const migrateExistingIocPortMapping = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-port-mapping-migration');

  for (const indexName of reportIndices) {
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

const migrateExistingIocReferenceMappings = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('ioc-reference-mapping-migration');

  for (const indexName of reportIndices) {
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

const migrateExistingGateMappings = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('gate-mapping-migration');

  for (const indexName of reportIndices) {
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
                    evidence_tier: { type: 'keyword' },
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

const migrateExistingExternalReferencesMapping = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('external-references-mapping-migration');

  for (const indexName of reportIndices) {
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
        // Install the *complete* current property set, not just the v18 fields.
        // These branches are exclusive, so a partial install here would leave
        // ref_part/ref_part_count missing until a second Kibana boot, and until
        // then dynamic: strict rejects every chunked text-indicator-list doc.
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
                    ref_part: { type: 'integer' },
                    ref_part_count: { type: 'integer' },
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

/** `lineage.content_scrubbed_at` (v23) for clusters created before retention existed. */
const migrateExistingContentScrubbedMapping = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('content-scrubbed-mapping-migration');

  for (const indexName of reportIndices) {
    try {
      const { [indexName]: indexMappings } = await esClient.indices.getMapping({
        index: indexName,
      });
      const lineageProps = (
        (
          indexMappings?.mappings?.properties as
            | Record<string, { properties?: Record<string, unknown> }>
            | undefined
        )?.lineage as { properties?: Record<string, unknown> } | undefined
      )?.properties;

      if (!lineageProps?.content_scrubbed_at) {
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            lineage: { properties: { content_scrubbed_at: { type: 'date' } } },
          },
        });
        log.info(`Migrated lineage.content_scrubbed_at on ${indexName} (v23 backfill)`);
      }
    } catch (err) {
      log.error(
        `Failed to migrate lineage.content_scrubbed_at on ${indexName}: ${
          (err as Error).message
        }. The retention task cannot mark scrubbed reports until the mapping is updated.`
      );
    }
  }
};

/**
 * Index templates only apply at creation time, so clusters that created these
 * indices before `index.hidden` was set still expose them to index patterns and
 * `*` searches. Settings updates are cheap and idempotent.
 */
const migrateExistingIndicesToHidden = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('hidden-index-migration');
  const targets = [...reportIndices, THREAT_INTEL_SOURCES_INDEX, THREAT_INTEL_INDICATORS_INDEX];

  for (const index of targets) {
    try {
      const settings = await esClient.indices.getSettings({ index }, { ignore: [404] });
      const current = settings?.[index]?.settings?.index?.hidden;
      // Elasticsearch reports this as the string 'true' or a boolean.
      if (current !== true && current !== 'true') {
        await esClient.indices.putSettings({ index, settings: HIDDEN_INDEX_SETTINGS });
        log.info(`Marked ${index} as hidden`);
      }
    } catch (err) {
      log.warn(
        `Could not mark ${index} as hidden: ${(err as Error).message}. It stays visible to ` +
          `index patterns and wildcard searches until this succeeds.`
      );
    }
  }
};

/**
 * Adds the `threat.indicator` fields for the `email`, `cidr`, and `wallet` IOC
 * types (plus `sha512`). Without them `dynamic: 'strict'` rejects every bulk
 * upsert for those types, and the promote task only logs a warning, so the
 * indicators were dropped silently.
 */
const migrateExistingIndicatorTypeMappings = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('indicator-type-mapping-migration');

  try {
    const exists = await esClient.indices.exists({ index: THREAT_INTEL_INDICATORS_INDEX });
    if (!exists) {
      log.debug('indicator-type-mapping-migration: index not found — skipping');
      return;
    }

    const { [THREAT_INTEL_INDICATORS_INDEX]: indexMappings } = await esClient.indices.getMapping({
      index: THREAT_INTEL_INDICATORS_INDEX,
    });
    const indicatorProps = (
      (
        indexMappings?.mappings?.properties as
          | Record<
              string,
              { properties?: Record<string, { properties?: Record<string, unknown> }> }
            >
          | undefined
      )?.threat?.properties?.indicator as { properties?: Record<string, unknown> } | undefined
    )?.properties;

    const topLevelProps = indexMappings?.mappings?.properties as
      | Record<string, unknown>
      | undefined;

    if (
      indicatorProps?.email &&
      indicatorProps?.network &&
      indicatorProps?.cryptocurrency &&
      topLevelProps?.ioc_tier
    ) {
      return;
    }

    await esClient.indices.putMapping({
      index: THREAT_INTEL_INDICATORS_INDEX,
      properties: {
        ioc_tier: { type: 'keyword' },
        threat: {
          properties: {
            indicator: {
              properties: {
                email: { type: 'keyword' },
                network: { properties: { cidr: { type: 'keyword' } } },
                cryptocurrency: { properties: { address: { type: 'keyword' } } },
                file: { properties: { hash: { properties: { sha512: { type: 'keyword' } } } } },
              },
            },
          },
        },
      },
    });
    log.info(
      `Migrated email / cidr / wallet indicator mappings on ${THREAT_INTEL_INDICATORS_INDEX} (v23 backfill)`
    );
  } catch (err) {
    log.error(
      `Failed to migrate indicator type mappings on ${THREAT_INTEL_INDICATORS_INDEX}: ${
        (err as Error).message
      }. Email, CIDR, and wallet indicators will be rejected by dynamic: strict ` +
        `until the mapping is updated manually.`
    );
  }
};

/**
 * Adds the top-level `space_id` keyword to the indicators index (v24). Indicators
 * are keyed `<space_id>:<type>:<value>` so a value cited by reports in different
 * spaces stays in separate docs and sources[] never merges across space
 * boundaries. Without the mapping `dynamic: 'strict'` rejects every upsert once
 * the promote task starts stamping `space_id`.
 */
const migrateExistingIndicatorSpaceIdMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const log = logger.get('indicator-space-id-mapping-migration');

  try {
    const exists = await esClient.indices.exists({ index: THREAT_INTEL_INDICATORS_INDEX });
    if (!exists) {
      log.debug('indicator-space-id-mapping-migration: index not found — skipping');
      return;
    }

    const { [THREAT_INTEL_INDICATORS_INDEX]: indexMappings } = await esClient.indices.getMapping({
      index: THREAT_INTEL_INDICATORS_INDEX,
    });
    const topLevelProps = indexMappings?.mappings?.properties as
      | Record<string, unknown>
      | undefined;

    if (topLevelProps?.space_id) return;

    await esClient.indices.putMapping({
      index: THREAT_INTEL_INDICATORS_INDEX,
      properties: {
        space_id: { type: 'keyword' },
      },
    });
    log.info(`Migrated space_id mapping on ${THREAT_INTEL_INDICATORS_INDEX} (v24 backfill)`);
  } catch (err) {
    log.error(
      `Failed to migrate space_id mapping on ${THREAT_INTEL_INDICATORS_INDEX}: ${
        (err as Error).message
      }. Indicators will be rejected by dynamic: strict until the mapping is updated manually.`
    );
  }
};

const migrateExistingVulnerabilityMappings = async (
  esClient: ElasticsearchClient,
  reportIndices: readonly string[],
  logger: Logger
): Promise<void> => {
  const log = logger.get('vulnerability-mapping-migration');

  for (const indexName of reportIndices) {
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
    // Only the concurrent-creation race is safe to swallow. Matching on the
    // 400 status alone also hid real failures such as
    // cluster_shard_limit_exceeded: boot would succeed, the index would not
    // exist, and every later write to it would fail with no obvious cause.
    const errorType = (err as { body?: { error?: { type?: string } } })?.body?.error?.type;
    if (errorType === 'resource_already_exists_exception') return;
    throw err;
  }
};

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
    // Derived from the reports index constant so the template name stays in lockstep.
    name: `${THREAT_REPORTS_INDEX}-template`,
    ...threatReportsTemplate,
  });

  for (const template of COMPANION_INDEX_TEMPLATES) {
    await esClient.indices.putIndexTemplate(template.body);
  }

  // Reports are a regular hidden index (enrich/attribution/feedback update by id),
  // not a data stream. Companions are sources + indicators only.
  await ensureCompanionIndex(esClient, THREAT_REPORTS_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_SOURCES_INDEX, log);
  await ensureCompanionIndex(esClient, THREAT_INTEL_INDICATORS_INDEX, log);

  // Patch mapping fields onto pre-template reports indices. Safe to re-run.
  // The report-targeting migrations all operate on the same set, so resolve the
  // pattern once here instead of issuing an identical indices.get per migration.
  const reportIndices = await resolveReportIndices(esClient, log);

  await migrateExistingDiamondMappings(esClient, reportIndices, log);
  await migrateExistingIocTierMappings(esClient, reportIndices, log);
  await migrateExistingGateMappings(esClient, reportIndices, log);
  await migrateExistingIocPortMapping(esClient, reportIndices, log);
  await migrateExistingExternalReferencesMapping(esClient, reportIndices, log);
  await migrateExistingIocReferenceMappings(esClient, reportIndices, log);
  await migrateExistingIndicatorSourcesMapping(esClient, log);
  await migrateExistingIndicatorTypeMappings(esClient, log);
  await migrateExistingIndicatorSpaceIdMapping(esClient, log);
  await migrateExistingVulnerabilityMappings(esClient, reportIndices, log);
  await migrateExistingContentScrubbedMapping(esClient, reportIndices, log);
  await migrateExistingIndicesToHidden(esClient, reportIndices, log);

  log.info('Threat intelligence index templates installed');
};
