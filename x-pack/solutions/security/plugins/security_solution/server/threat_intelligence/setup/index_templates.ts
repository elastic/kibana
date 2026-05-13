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
} from '../../../common/threat_intelligence/hub';

/**
 * Bumps when an index template's mapping changes in a backwards-compatible
 * way. Adding fields is fine; removing or retyping is not without a
 * reindex strategy.
 *
 * v2: adds `extracted.ioc_set_hash` (keyword) and
 * `provenance.related_reports*` (keyword + integer) to support the
 * Workflow 2 cross-report correlation pass, and adds `template_id` to
 * the subscriptions companion index for pre-staged template provenance.
 *
 * v3: adds `provenance.environment_hits` (object — per-layer counts +
 * computed_at timestamp) and `provenance.environment_hits_total` (integer)
 * for the Workflow 4 hit-provenance-backfill loop, and introduces the
 * indicators companion index template for the IOC indicator sync Task
 * Manager job.
 *
 * v4: adds `delivery.connector_id` to the subscriptions companion index so
 * the `digest_delivery` workflow can dispatch through a configured Kibana
 * actions connector (email / slack) instead of the previous `data.set`
 * placeholder.
 *
 * v5: adds the 15-category `extracted.categories` keyword array and the
 * `geography.regions` macro-region keyword array to the threat-reports
 * data stream. Both fields are populated by the stage-2 LLM enrichment
 * step in `nl_extraction_behavioral` and consumed by the visual
 * dashboard's category-breakdown / "Affects You" panels and by
 * `search_reports`'s new `categories[]` / `regions[]` filters. Both
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
 */
const TEMPLATE_VERSION = 7;

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
 *   `threat_intel.search_reports` tool uses an RRF retriever over both paths so
 *   semantic search degrades gracefully when inference is unavailable.
 * - `content_fingerprint` is the SHA-256 of the normalized `body_text`. It is
 *   the dedup key against RSS-syndicated copies and is a forward-compat slot
 *   for Phase C alert/telemetry traceback (`provenance.duplicate_of`).
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
          },
        },
        content: {
          properties: {
            title: {
              type: 'semantic_text' as const,
              // intentionally no inference_id — inherit cluster default
            },
            title_bm25: { type: 'text' as const },
            body_text: {
              type: 'semantic_text' as const,
            },
            body_text_bm25: { type: 'text' as const },
            body_html: { type: 'text' as const, index: false },
            language: { type: 'keyword' as const },
          },
        },
        severity: {
          properties: {
            level: { type: 'keyword' as const },
            score: { type: 'float' as const },
          },
        },
        extracted: {
          properties: {
            iocs: {
              type: 'nested' as const,
              properties: {
                type: { type: 'keyword' as const },
                value: { type: 'keyword' as const },
                defanged: { type: 'keyword' as const },
                severity: { type: 'keyword' as const },
              },
            },
            ioc_set_hash: { type: 'keyword' as const },
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
            // enrichment in `nl_extraction_behavioral`. See
            // `THREAT_CATEGORIES` in `common/constants.ts` for the allowed
            // values.
            categories: { type: 'keyword' as const },
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
        provenance: {
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
                // for the `digest_delivery` workflow to dispatch through the
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
            // Sync bookkeeping — used by the Task Manager runner to
            // decide whether to refresh an existing row or write a new one.
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
            delivered: { type: 'boolean' },
            delivery_error: { type: 'text', index: false },
            space_id: { type: 'keyword' },
          },
        },
      },
    },
  },
];

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

  log.info('Threat intelligence index templates installed');
};
