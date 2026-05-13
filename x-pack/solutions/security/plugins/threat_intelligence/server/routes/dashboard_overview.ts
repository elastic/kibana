/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  DASHBOARD_OVERVIEW_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  THREAT_REPORTS_INDEX_PATTERN,
  type DashboardOverviewResponse,
  type SeverityLevel,
  type ThreatCategory,
  type ThreatRegion,
} from '../../common';
import { buildSpaceFilterTerms, resolveCurrentSpaceId } from '../lib/space_filter';
import type { RouteRegistrationDeps } from '.';

const DEFAULT_LOOKBACK_DAYS = 7;
const ALERTS_INDEX_PATTERN = '.alerts-security.alerts-*';

const overviewQuerySchema = schema.object({
  from: schema.maybe(schema.string()),
  to: schema.maybe(schema.string()),
  regions: schema.maybe(schema.arrayOf(schema.string())),
  categories: schema.maybe(schema.arrayOf(schema.string())),
});

interface BucketCount<TKey = string> {
  key: TKey;
  doc_count: number;
}
interface SeverityBucket extends BucketCount {
  by_severity?: { buckets: BucketCount[] };
}
interface ReportsAggregations {
  by_category?: { buckets: BucketCount[] };
  by_region?: { buckets: BucketCount[] };
  by_severity?: { buckets: BucketCount[] };
  by_time?: { buckets: SeverityBucket[] };
  top_techniques?: { buckets: BucketCount[] };
  environment_hits_total?: { value: number };
  layer_1_total?: { value: number };
  layer_2_total?: { value: number };
  recent_articles?: {
    hits: {
      hits: Array<{
        _id: string;
        _source: {
          '@timestamp'?: string;
          source?: { name?: string };
          content?: { title?: string };
          severity?: { level?: SeverityLevel };
          extracted?: { categories?: ThreatCategory[] };
          geography?: { regions?: ThreatRegion[] };
          provenance?: { environment_hits_total?: number };
        };
      }>;
    };
  };
}

interface AlertsAggregations {
  affected_hosts?: { buckets: BucketCount[] };
  total?: { value: number };
}

const fetchReportsOverview = async (
  esClient: ElasticsearchClient,
  from: string,
  to: string,
  filters: Array<Record<string, unknown>>
) => {
  return esClient.search({
    index: THREAT_REPORTS_INDEX_PATTERN,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [{ range: { '@timestamp': { gte: from, lte: to } } }, ...filters],
      },
    },
    aggs: {
      by_category: {
        terms: { field: 'extracted.categories', size: 20, missing: '<unknown>' },
      },
      by_region: {
        terms: { field: 'geography.regions', size: 12, missing: '<unknown>' },
      },
      by_severity: {
        terms: { field: 'severity.level', size: 4 },
      },
      by_time: {
        date_histogram: { field: '@timestamp', fixed_interval: '1d' },
        aggs: {
          by_severity: { terms: { field: 'severity.level', size: 4 } },
        },
      },
      top_techniques: {
        terms: { field: 'extracted.ttps.techniques', size: 15 },
      },
      environment_hits_total: {
        sum: { field: 'provenance.environment_hits_total' },
      },
      layer_1_total: {
        sum: { field: 'provenance.environment_hits.layer_1_ioc_match' },
      },
      layer_2_total: {
        sum: { field: 'provenance.environment_hits.layer_2_behavioral' },
      },
      recent_articles: {
        top_hits: {
          size: 12,
          sort: [{ '@timestamp': { order: 'desc' } }],
          _source: [
            '@timestamp',
            'source.name',
            'content.title',
            'severity.level',
            'extracted.categories',
            'geography.regions',
            'provenance.environment_hits_total',
          ],
        },
      },
    },
  });
};

const fetchAlertsImpact = async (esClient: ElasticsearchClient, from: string, to: string) => {
  try {
    return await esClient.search({
      index: ALERTS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      track_total_hits: true,
      query: { range: { '@timestamp': { gte: from, lte: to } } },
      aggs: {
        affected_hosts: { terms: { field: 'host.name', size: 12 } },
      },
    });
  } catch {
    return undefined;
  }
};

/**
 * Internal route that powers the visual dashboard. Returns the aggregations
 * the UI panels need in a single response so the dashboard renders without
 * fanning out to multiple endpoints. Gated on the `read` tier of the
 * `threatIntelligence` Kibana feature.
 */
export const registerDashboardOverviewRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: DASHBOARD_OVERVIEW_API_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { query: overviewQuerySchema },
        },
      },
      async (context, request, response) => {
        const now = Date.now();
        const from =
          request.query.from ??
          new Date(now - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const to = request.query.to ?? new Date(now).toISOString();

        const currentSpaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const filters: Array<Record<string, unknown>> = [buildSpaceFilterTerms(currentSpaceId)];
        if (request.query.regions?.length) {
          filters.push({ terms: { 'geography.regions': request.query.regions } });
        }
        if (request.query.categories?.length) {
          filters.push({ terms: { 'extracted.categories': request.query.categories } });
        }

        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;

        try {
          const reportsResponse = await fetchReportsOverview(esClient, from, to, filters);
          const alertsResponse = await fetchAlertsImpact(esClient, from, to);

          const totalReports =
            typeof reportsResponse.hits.total === 'number'
              ? reportsResponse.hits.total
              : reportsResponse.hits.total?.value ?? 0;
          const aggs = reportsResponse.aggregations as ReportsAggregations | undefined;

          const severityCount = (level: SeverityLevel): number =>
            (aggs?.by_severity?.buckets ?? []).find((b) => b.key === level)?.doc_count ?? 0;

          const byCategory = (aggs?.by_category?.buckets ?? []).map((b) => ({
            category: b.key as ThreatCategory | '<unknown>',
            report_count: b.doc_count,
          }));
          const byRegion = (aggs?.by_region?.buckets ?? []).map((b) => ({
            region: b.key as ThreatRegion | '<unknown>',
            report_count: b.doc_count,
            // "Affects You" is a coarse heuristic for v1 — any region with at
            // least one environment hit is flagged red on the dashboard. The
            // PRD's richer location matcher is deferred to a follow-up.
            affects_you: b.doc_count > 0,
          }));

          const severityTimeline = (aggs?.by_time?.buckets ?? []).map((bucket) => {
            const counts: Record<SeverityLevel, number> = {
              low: 0,
              medium: 0,
              high: 0,
              critical: 0,
            };
            for (const sev of bucket.by_severity?.buckets ?? []) {
              if (
                sev.key === 'low' ||
                sev.key === 'medium' ||
                sev.key === 'high' ||
                sev.key === 'critical'
              ) {
                counts[sev.key] = sev.doc_count;
              }
            }
            return {
              bucket: bucket.key as string,
              low: counts.low,
              medium: counts.medium,
              high: counts.high,
              critical: counts.critical,
            };
          });

          const topTechniques = (aggs?.top_techniques?.buckets ?? []).map((b) => ({
            technique_id: b.key,
            report_count: b.doc_count,
          }));

          const environmentHitsTotal = aggs?.environment_hits_total?.value ?? 0;
          const layer1Total = aggs?.layer_1_total?.value ?? 0;
          const layer2Total = aggs?.layer_2_total?.value ?? 0;

          const alertsAggs = alertsResponse?.aggregations as AlertsAggregations | undefined;
          const affectedAssetsSample = (alertsAggs?.affected_hosts?.buckets ?? []).map(
            (b) => b.key
          );

          const recentArticles = (aggs?.recent_articles?.hits.hits ?? []).map((hit) => ({
            report_id: hit._id,
            title: hit._source.content?.title ?? '(untitled)',
            source_name: hit._source.source?.name ?? '<unknown>',
            severity: (hit._source.severity?.level ?? 'medium') as SeverityLevel,
            '@timestamp': hit._source['@timestamp'] ?? '',
            environment_hits_total: hit._source.provenance?.environment_hits_total ?? 0,
            categories: hit._source.extracted?.categories ?? [],
            regions: hit._source.geography?.regions ?? [],
          }));

          const body: DashboardOverviewResponse = {
            time_range_label: `${from} → ${to}`,
            stats_ribbon: {
              total_reports: totalReports,
              critical_reports: severityCount('critical'),
              high_reports: severityCount('high'),
              affects_you_total: environmentHitsTotal,
            },
            by_category: byCategory,
            by_region: byRegion,
            severity_timeline: severityTimeline,
            top_techniques: topTechniques,
            recent_articles: recentArticles,
            environment_impact: {
              total_hits: environmentHitsTotal,
              layer_1_hits: layer1Total,
              layer_2_hits: layer2Total,
              affected_assets_sample: affectedAssetsSample,
            },
          };

          return response.ok({ body });
        } catch (err) {
          logger.warn(`dashboard_overview failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to compute dashboard overview: ${(err as Error).message}` },
          });
        }
      }
    );
};
