/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  LIST_SOURCES_API_PATH,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms, resolveCurrentSpaceId } from '../lib/space_filter';
import type { RouteRegistrationDeps } from '.';

const listBodySchema = schema.object({
  size: schema.maybe(schema.number({ min: 1, max: 500 })),
  time_range: schema.maybe(
    schema.object({
      from: schema.string(),
      to: schema.string(),
    })
  ),
});

interface ThreatIntelSourceDoc {
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  config?: { url?: unknown };
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
}

export interface ListSourcesItem {
  source_id: string;
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  url?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
  /** Count of threat reports attributed to this source name. */
  report_count: number;
  /** Latest `lineage.ingested_at` across reports for this source. */
  last_ingested_at?: string;
  /** Sum of `attribution.environment_hits_total` across reports for this source. */
  env_hits_total: number;
}

interface SourceReportStats {
  report_count: number;
  last_ingested_at?: string;
  env_hits_total: number;
}

const mapSourceHit = (hit: {
  _id?: string;
  _source?: ThreatIntelSourceDoc;
}): Omit<ListSourcesItem, 'report_count' | 'last_ingested_at' | 'env_hits_total'> => {
  const source = hit._source ?? {};
  const configUrl = source.config?.url;
  return {
    source_id: hit._id ?? '',
    name: source.name,
    adapter_type: source.adapter_type,
    enabled: source.enabled,
    ...(typeof configUrl === 'string' ? { url: configUrl } : {}),
    tags: source.tags,
    created_at: source.created_at,
    updated_at: source.updated_at,
    space_id: source.space_id,
  };
};

const emptyStats = (): SourceReportStats => ({
  report_count: 0,
  env_hits_total: 0,
});

/**
 * Aggregate report activity per `source.name` so the Hub Sources tab can show
 * whether a catalog entry has produced useful data.
 */
export const loadSourceReportStatsByName = async ({
  esClient,
  spaceId,
  logger,
  timeRange,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  timeRange?: { from: string; to: string };
}): Promise<Map<string, SourceReportStats>> => {
  const statsByName = new Map<string, SourceReportStats>();

  try {
    const filters: Record<string, unknown>[] = [buildSpaceFilterTerms(spaceId)];
    if (timeRange?.from || timeRange?.to) {
      filters.push({
        range: {
          '@timestamp': {
            ...(timeRange.from ? { gte: timeRange.from } : {}),
            ...(timeRange.to ? { lte: timeRange.to } : {}),
          },
        },
      });
    }

    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        by_source_name: {
          terms: {
            field: 'source.name',
            size: 500,
          },
          aggs: {
            last_ingested: {
              max: { field: 'lineage.ingested_at' },
            },
            env_hits: {
              sum: { field: 'attribution.environment_hits_total' },
            },
          },
        },
      },
    });

    const buckets =
      (
        response.aggregations?.by_source_name as
          | {
              buckets?: Array<{
                key: string | number;
                doc_count: number;
                last_ingested?: { value?: number | null; value_as_string?: string };
                env_hits?: { value?: number | null };
              }>;
            }
          | undefined
      )?.buckets ?? [];

    for (const bucket of buckets) {
      const name = String(bucket.key);
      const lastIngested =
        bucket.last_ingested?.value_as_string ??
        (typeof bucket.last_ingested?.value === 'number'
          ? new Date(bucket.last_ingested.value).toISOString()
          : undefined);
      statsByName.set(name, {
        report_count: bucket.doc_count,
        ...(lastIngested ? { last_ingested_at: lastIngested } : {}),
        env_hits_total: Math.round(bucket.env_hits?.value ?? 0),
      });
    }
  } catch (err) {
    logger.warn(
      `list_sources report enrichment failed: ${(err as Error).message}; returning catalog only`
    );
  }

  return statsByName;
};

/**
 * POST `/api/threat_intelligence/sources/list` — source catalog for Hub, enriched
 * with report counts / last ingest / env hits from `.kibana-threat-reports*`.
 */
export const registerListSourcesRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: LIST_SOURCES_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { body: listBodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const size = request.body.size ?? 500;

        try {
          const [searchResponse, reportStatsByName] = await Promise.all([
            esClient.search<ThreatIntelSourceDoc>({
              index: THREAT_INTEL_SOURCES_INDEX,
              ignore_unavailable: true,
              size,
              track_total_hits: true,
              sort: [{ name: { order: 'asc' } }],
              query: {
                bool: {
                  filter: [buildSpaceFilterTerms(spaceId)],
                },
              },
            }),
            loadSourceReportStatsByName({
              esClient,
              spaceId,
              logger,
              timeRange: request.body.time_range,
            }),
          ]);

          const sources = (searchResponse.hits.hits ?? []).map((hit) => {
            const base = mapSourceHit(hit);
            const stats =
              (base.name ? reportStatsByName.get(base.name) : undefined) ?? emptyStats();
            return {
              ...base,
              report_count: stats.report_count,
              ...(stats.last_ingested_at ? { last_ingested_at: stats.last_ingested_at } : {}),
              env_hits_total: stats.env_hits_total,
            };
          });

          const total =
            typeof searchResponse.hits.total === 'number'
              ? searchResponse.hits.total
              : searchResponse.hits.total?.value ?? sources.length;

          return response.ok({ body: { total, sources } });
        } catch (err) {
          logger.warn(`list_sources failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to list sources: ${(err as Error).message}` },
          });
        }
      }
    );
};
