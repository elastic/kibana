/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../../../common/endpoint_assets';
import type { DriftSummaryResponse } from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

const TIME_RANGE_TO_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const VALID_CATEGORIES = ['privileges', 'persistence', 'network', 'software', 'posture'] as const;
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

export const registerDriftSummaryRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.DRIFT_SUMMARY,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              time_range: schema.oneOf(
                [
                  schema.literal('1h'),
                  schema.literal('4h'),
                  schema.literal('24h'),
                  schema.literal('7d'),
                  schema.literal('30d'),
                ],
                { defaultValue: '24h' }
              ),
              categories: schema.maybe(schema.string()),
              severities: schema.maybe(schema.string()),
              host_id: schema.maybe(schema.string()),
              page: schema.maybe(schema.number({ min: 1, defaultValue: 1 })),
              page_size: schema.maybe(schema.number({ min: 1, max: 100, defaultValue: 10 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const {
            time_range: timeRange,
            categories: categoriesParam,
            severities: severitiesParam,
            host_id: hostId,
            page = 1,
            page_size: pageSize = 10,
          } = request.query;

          const timeRangeMs = TIME_RANGE_TO_MS[timeRange] || TIME_RANGE_TO_MS['24h'];
          const rangeStart = Date.now() - timeRangeMs;

          // Parse and validate categories
          const categories = categoriesParam
            ? categoriesParam.split(',').filter((c): c is (typeof VALID_CATEGORIES)[number] =>
                VALID_CATEGORIES.includes(c as (typeof VALID_CATEGORIES)[number])
              )
            : [];

          // Parse and validate severities
          const severities = severitiesParam
            ? severitiesParam.split(',').filter((s): s is (typeof VALID_SEVERITIES)[number] =>
                VALID_SEVERITIES.includes(s as (typeof VALID_SEVERITIES)[number])
              )
            : [];

          // Build filter clauses for category, severity, and host
          const filterClauses: Array<Record<string, unknown>> = [];
          if (categories.length > 0) {
            filterClauses.push({ terms: { 'drift.category': categories } });
          }
          if (severities.length > 0) {
            filterClauses.push({ terms: { 'drift.severity': severities } });
          }
          if (hostId) {
            filterClauses.push({ term: { 'host.id': hostId } });
          }

          const result = await esClient.search({
            index: 'endpoint-drift-events-*',
            size: 0,
            query: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: rangeStart,
                        lte: Date.now(),
                      },
                    },
                  },
                ],
                filter: filterClauses.length > 0 ? filterClauses : undefined,
              },
            },
            aggs: {
              total_events: {
                value_count: { field: '@timestamp' },
              },
              by_category: {
                terms: {
                  field: 'drift.category',
                  size: 10,
                },
              },
              by_severity: {
                terms: {
                  field: 'drift.severity',
                  size: 10,
                },
              },
              unique_hosts: {
                cardinality: {
                  field: 'host.id',
                },
              },
              top_changed_assets: {
                terms: {
                  field: 'host.id',
                  size: 10,
                  order: { _count: 'desc' },
                },
                aggs: {
                  host_name: {
                    terms: {
                      field: 'host.name',
                      size: 1,
                    },
                  },
                },
              },
            },
          });

          const aggs = result.aggregations as Record<string, unknown> | undefined;
          const totalEventsAgg = aggs?.total_events as { value: number } | undefined;
          const byCategoryAgg = aggs?.by_category as
            | {
                buckets: Array<{ key: string; doc_count: number }>;
              }
            | undefined;
          const bySeverityAgg = aggs?.by_severity as
            | {
                buckets: Array<{ key: string; doc_count: number }>;
              }
            | undefined;
          const uniqueHostsAgg = aggs?.unique_hosts as { value: number } | undefined;
          const topChangedAssetsAgg = aggs?.top_changed_assets as
            | {
                buckets: Array<{
                  key: string;
                  doc_count: number;
                  host_name: {
                    buckets: Array<{ key: string }>;
                  };
                }>;
              }
            | undefined;

          const eventsByCategory = {
            privileges: 0,
            persistence: 0,
            network: 0,
            software: 0,
            posture: 0,
          };

          if (byCategoryAgg?.buckets) {
            for (const bucket of byCategoryAgg.buckets) {
              const category = bucket.key as keyof typeof eventsByCategory;
              if (category in eventsByCategory) {
                eventsByCategory[category] = bucket.doc_count;
              }
            }
          }

          const eventsBySeverity = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          };

          if (bySeverityAgg?.buckets) {
            for (const bucket of bySeverityAgg.buckets) {
              const severity = bucket.key as keyof typeof eventsBySeverity;
              if (severity in eventsBySeverity) {
                eventsBySeverity[severity] = bucket.doc_count;
              }
            }
          }

          const topChangedAssets =
            topChangedAssetsAgg?.buckets.map((bucket) => ({
              host_id: bucket.key,
              host_name: bucket.host_name.buckets[0]?.key ?? bucket.key,
              event_count: bucket.doc_count,
            })) ?? [];

          // Fetch recent changes with pagination
          const from = (page - 1) * pageSize;
          const recentEventsResult = await esClient.search({
            index: 'endpoint-drift-events-*',
            size: pageSize,
            from,
            sort: [{ '@timestamp': 'desc' }],
            track_total_hits: true,
            query: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: rangeStart,
                        lte: Date.now(),
                      },
                    },
                  },
                ],
                filter: filterClauses.length > 0 ? filterClauses : undefined,
              },
            },
            _source: [
              '@timestamp',
              'host.id',
              'host.name',
              'drift.category',
              'drift.action',
              'drift.item.name',
              'drift.severity',
            ],
          });

          const recentChanges = recentEventsResult.hits.hits.map((hit) => {
            const source = hit._source as Record<string, unknown>;
            const host = source.host as Record<string, string> | undefined;
            const drift = source.drift as Record<string, unknown> | undefined;
            const driftItem = drift?.item as Record<string, string> | undefined;

            return {
              timestamp: source['@timestamp'] as string,
              host_id: host?.id ?? 'unknown',
              host_name: host?.name ?? host?.id ?? 'unknown',
              category: (drift?.category as string) ?? 'unknown',
              action: (drift?.action as string) ?? 'unknown',
              item_name: driftItem?.name ?? 'unknown',
              severity: (drift?.severity as string) ?? 'low',
            };
          });

          // Get total count for pagination
          const totalHits = recentEventsResult.hits.total;
          const totalCount = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

          const summaryResponse: DriftSummaryResponse = {
            total_events: totalEventsAgg?.value ?? 0,
            events_by_category: eventsByCategory,
            events_by_severity: eventsBySeverity,
            assets_with_changes: uniqueHostsAgg?.value ?? 0,
            top_changed_assets: topChangedAssets,
            recent_changes: recentChanges,
            time_range: timeRange,
            page,
            page_size: pageSize,
            total_recent_changes: totalCount,
          };

          return response.ok({
            body: summaryResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting drift summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
