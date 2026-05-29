/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import DateMath from '@kbn/datemath';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
  getQueryFilters,
} from '../../common/constants/client_defaults';
import type { SyntheticsEsClient } from '../lib';
import type {
  ErrorStats,
  ErrorInsights,
  LocationErrorStat,
  TopFailingMonitor,
  FailingDomain,
  TagErrorStat,
  StatusCodeStat,
  MonitorTypeStat,
  EmergingTerm,
} from '../../common/runtime_types';

interface GetErrorStatsParams {
  syntheticsEsClient: SyntheticsEsClient;
  from: string;
  to: string;
  monitorTypes?: string[];
  locations?: string[];
  tags?: string[];
  projects?: string[];
  statusCodes?: string[];
  query?: string;
  spaceId: string;
}

/**
 * Computes the mirror previous period for trend comparison.
 * E.g. "now-24h" to "now" → previous period is "now-48h" to "now-24h".
 */
function getPreviousPeriod(from: string, to: string): { prevFrom: string; prevTo: string } {
  const toMs = DateMath.parse(to)?.valueOf() ?? Date.now();
  const fromMs = DateMath.parse(from)?.valueOf() ?? toMs - 24 * 60 * 60 * 1000;
  const durationMs = toMs - fromMs;

  const prevToMs = fromMs;
  const prevFromMs = prevToMs - durationMs;

  return {
    prevFrom: new Date(prevFromMs).toISOString(),
    prevTo: new Date(prevToMs).toISOString(),
  };
}

export async function getErrorStats({
  syntheticsEsClient,
  from,
  to,
  monitorTypes,
  locations,
  tags,
  projects,
  statusCodes,
  query,
  spaceId,
}: GetErrorStatsParams): Promise<ErrorStats> {
  const { prevFrom, prevTo } = getPreviousPeriod(from, to);

  // Always-on filters (data shape, not user-driven)
  const baseFilters: QueryDslQueryContainer[] = [
    SUMMARY_FILTER as QueryDslQueryContainer,
    EXCLUDE_RUN_ONCE_FILTER as QueryDslQueryContainer,
  ];

  // User-driven filters that the insights cards write to.
  // We split these so individual breakdown aggregations can ignore their own
  // dimension (e.g. the monitor-type breakdown shouldn't be filtered by the
  // monitorTypes selection, otherwise the user only ever sees the type they
  // just clicked and has no way to pick another).
  const monitorTypeFilter: QueryDslQueryContainer | null = monitorTypes?.length
    ? { terms: { 'monitor.type': monitorTypes } }
    : null;
  const tagsFilter: QueryDslQueryContainer | null = tags?.length ? { terms: { tags } } : null;
  const locationFilter: QueryDslQueryContainer | null = locations?.length
    ? { terms: { 'observer.geo.name': locations } }
    : null;
  const projectFilter: QueryDslQueryContainer | null = projects?.length
    ? { terms: { 'monitor.project.id': projects } }
    : null;
  // `http.response.status_code` is mapped as a numeric field, so coerce
  // any URL-string codes to numbers before sending the `terms` query.
  const numericStatusCodes = statusCodes?.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  const statusCodeFilter: QueryDslQueryContainer | null = numericStatusCodes?.length
    ? { terms: { 'http.response.status_code': numericStatusCodes } }
    : null;
  const queryFilter: QueryDslQueryContainer | null = query
    ? (getQueryFilters(query) as QueryDslQueryContainer)
    : null;

  // Filters that always apply at the top level — used for caching and as the
  // common denominator for the per-period filter aggregations below.
  const topLevelFilter: QueryDslQueryContainer[] = [
    ...baseFilters,
    { range: { '@timestamp': { gte: prevFrom, lte: to } } },
    { terms: { 'meta.space_id': [spaceId, ALL_SPACES_ID] } },
  ];

  // Helper: build a bool.must list combining a date-range filter with an
  // arbitrary subset of the user filters. Returns a single QueryDslQueryContainer
  // suitable as the body of a `filter` aggregation.
  const buildPeriodFilter = (
    range: QueryDslQueryContainer,
    filters: Array<QueryDslQueryContainer | null>
  ): QueryDslQueryContainer => {
    const must = [range, ...filters.filter((f): f is QueryDslQueryContainer => f !== null)];
    return must.length === 1 ? must[0] : { bool: { must } };
  };

  const currentRange: QueryDslQueryContainer = {
    range: { '@timestamp': { gte: from, lte: to } },
  };
  const previousRange: QueryDslQueryContainer = {
    range: { '@timestamp': { gte: prevFrom, lte: prevTo } },
  };

  // All user filters — used for the main current/previous slices.
  const allUserFilters = [
    monitorTypeFilter,
    tagsFilter,
    locationFilter,
    projectFilter,
    statusCodeFilter,
    queryFilter,
  ];

  // User filters excluding the monitor-type dimension — used by the
  // by_monitor_type breakdown.
  const userFiltersExcludingMonitorType = [
    tagsFilter,
    locationFilter,
    projectFilter,
    statusCodeFilter,
    queryFilter,
  ];

  // User filters excluding the tags dimension — used by the by_tag breakdown.
  const userFiltersExcludingTags = [
    monitorTypeFilter,
    locationFilter,
    projectFilter,
    statusCodeFilter,
    queryFilter,
  ];

  // User filters excluding the status-code dimension — used by the
  // status_codes breakdown so the user can still pick another code after
  // clicking one.
  const userFiltersExcludingStatusCodes = [
    monitorTypeFilter,
    tagsFilter,
    locationFilter,
    projectFilter,
    queryFilter,
  ];

  const result = await syntheticsEsClient.search(
    {
      size: 0,
      query: {
        bool: {
          filter: topLevelFilter,
        },
      },
      aggs: {
        current: {
          filter: buildPeriodFilter(currentRange, allUserFilters),
          aggs: {
            down_checks: {
              filter: { term: { 'monitor.status': 'down' } },
              aggs: {
                affected_monitors: { cardinality: { field: 'config_id' } },
                error_states: { cardinality: { field: 'state.id' } },
                avg_duration: { avg: { field: 'state.duration_ms' } },
                by_location: {
                  terms: { field: 'observer.geo.name', size: 50 },
                },
                error_categories: {
                  categorize_text: {
                    field: 'error.message',
                    size: 20,
                  },
                },
              },
            },
            total_monitors: { cardinality: { field: 'config_id' } },
            per_monitor: {
              terms: {
                field: 'config_id',
                size: 20,
                order: { down: 'desc' as const },
              },
              aggs: {
                down: {
                  filter: { term: { 'monitor.status': 'down' } },
                },
                monitor_info: {
                  top_hits: {
                    size: 1,
                    _source: ['monitor.name', 'config_id'],
                    sort: [{ '@timestamp': { order: 'desc' } }],
                  },
                },
                downtime: {
                  filter: { term: { 'monitor.status': 'down' } },
                  aggs: {
                    per_state: {
                      terms: { field: 'state.id', size: 25 },
                      aggs: {
                        duration: { max: { field: 'state.duration_ms' } },
                      },
                    },
                    total_ms: {
                      sum_bucket: { buckets_path: 'per_state>duration' },
                    },
                  },
                },
              },
            },
            // --- Insights aggregations ---
            failing_domains: {
              filter: { term: { 'monitor.status': 'down' } },
              aggs: {
                domains: {
                  terms: { field: 'url.domain', size: 10 },
                },
              },
            },
          },
        },
        // Same pattern as by_monitor_type / by_tag: lives outside `current`
        // so we can apply every user filter EXCEPT statusCodes, so the user
        // can keep clicking other codes after picking one.
        status_codes: {
          filter: buildPeriodFilter(currentRange, userFiltersExcludingStatusCodes),
          aggs: {
            down: {
              filter: { term: { 'monitor.status': 'down' } },
              aggs: {
                codes: {
                  terms: { field: 'http.response.status_code', size: 10 },
                },
              },
            },
          },
        },
        // Breakdown for the "Error rate by monitor type" card. Lives outside
        // `current` so we can apply every user filter EXCEPT monitorTypes; the
        // card must keep showing all types so the user can refine further.
        by_monitor_type: {
          filter: buildPeriodFilter(currentRange, userFiltersExcludingMonitorType),
          aggs: {
            buckets: {
              terms: { field: 'monitor.type', size: 10 },
              aggs: {
                down: {
                  filter: { term: { 'monitor.status': 'down' } },
                },
              },
            },
          },
        },
        // Same pattern for tags — apply every user filter EXCEPT tags so the
        // user can keep clicking other tags after picking one.
        by_tag: {
          filter: buildPeriodFilter(currentRange, userFiltersExcludingTags),
          aggs: {
            buckets: {
              terms: { field: 'tags', size: 20 },
              aggs: {
                down: {
                  filter: { term: { 'monitor.status': 'down' } },
                },
              },
            },
          },
        },
        previous: {
          filter: buildPeriodFilter(previousRange, allUserFilters),
          aggs: {
            down_checks: {
              filter: { term: { 'monitor.status': 'down' } },
              aggs: {
                error_categories: {
                  categorize_text: {
                    field: 'error.message',
                    size: 25,
                  },
                },
              },
            },
          },
        },
      },
    },
    'getErrorStats'
  );

  const aggs = result.body.aggregations as any;

  const currentTotal = aggs?.current?.doc_count ?? 0;
  const currentDown = aggs?.current?.down_checks?.doc_count ?? 0;
  const currentErrorRate = currentTotal > 0 ? currentDown / currentTotal : 0;

  const prevTotal = aggs?.previous?.doc_count ?? 0;
  const prevDown = aggs?.previous?.down_checks?.doc_count ?? 0;
  const previousErrorRate = prevTotal > 0 ? prevDown / prevTotal : 0;

  const locationBuckets = aggs?.current?.down_checks?.by_location?.buckets ?? [];
  const locationStats: LocationErrorStat[] = locationBuckets.map((bucket: any) => ({
    location: bucket.key as string,
    count: bucket.doc_count as number,
  }));

  const monitorBuckets = aggs?.current?.per_monitor?.buckets ?? [];
  const topFailingMonitors: TopFailingMonitor[] = monitorBuckets
    .filter((bucket: any) => bucket.down?.doc_count > 0)
    .map((bucket: any) => {
      const totalForMonitor = bucket.doc_count as number;
      const downForMonitor = bucket.down?.doc_count as number;
      const source = bucket.monitor_info?.hits?.hits?.[0]?._source;
      return {
        configId: bucket.key as string,
        monitorName: source?.monitor?.name ?? bucket.key,
        downChecks: downForMonitor,
        totalChecks: totalForMonitor,
        errorRate:
          totalForMonitor > 0 ? Math.round((downForMonitor / totalForMonitor) * 10000) / 10000 : 0,
        downtimeMs: bucket.downtime?.total_ms?.value ?? 0,
      };
    });

  // --- Insights ---
  const domainBuckets = aggs?.current?.failing_domains?.domains?.buckets ?? [];
  const failingDomains: FailingDomain[] = domainBuckets.map((b: any) => ({
    domain: b.key as string,
    count: b.doc_count as number,
  }));

  const tagBuckets = aggs?.by_tag?.buckets?.buckets ?? [];
  const tagStats: TagErrorStat[] = tagBuckets
    .filter((b: any) => b.down?.doc_count > 0)
    .map((b: any) => {
      const total = b.doc_count as number;
      const down = b.down?.doc_count as number;
      return {
        tag: b.key as string,
        downChecks: down,
        totalChecks: total,
        errorRate: total > 0 ? Math.round((down / total) * 10000) / 10000 : 0,
      } satisfies TagErrorStat;
    })
    .sort((a: TagErrorStat, b: TagErrorStat) => b.downChecks - a.downChecks);

  const codeBuckets = aggs?.status_codes?.down?.codes?.buckets ?? [];
  const statusCodeStats: StatusCodeStat[] = codeBuckets.map((b: any) => ({
    statusCode: b.key as number,
    count: b.doc_count as number,
  }));

  const monitorTypeBuckets = aggs?.by_monitor_type?.buckets?.buckets ?? [];
  const monitorTypeStats: MonitorTypeStat[] = monitorTypeBuckets
    .map((b: any) => {
      const total = b.doc_count as number;
      const down = b.down?.doc_count as number;
      return {
        monitorType: b.key as string,
        downChecks: down,
        totalChecks: total,
        errorRate: total > 0 ? Math.round((down / total) * 10000) / 10000 : 0,
      } satisfies MonitorTypeStat;
    })
    .sort((a: MonitorTypeStat, b: MonitorTypeStat) => b.downChecks - a.downChecks);

  const currentCategories = aggs?.current?.down_checks?.error_categories?.buckets ?? [];
  const prevCategories = aggs?.previous?.down_checks?.error_categories?.buckets ?? [];
  const prevCategoryKeys = new Set(prevCategories.map((b: any) => b.key as string));

  const emergingTerms: EmergingTerm[] = currentCategories
    .filter((b: any) => !prevCategoryKeys.has(b.key as string))
    .slice(0, 8)
    .map((b: any) => ({
      term: b.key as string,
      score: b.doc_count as number,
      foregroundCount: b.doc_count as number,
      backgroundCount: 0,
    }));

  const insights: ErrorInsights = {
    failingDomains,
    tagStats,
    statusCodes: statusCodeStats,
    monitorTypeStats,
    emergingTerms,
  };

  return {
    totalChecks: currentTotal,
    downChecks: currentDown,
    errorRate: Math.round(currentErrorRate * 10000) / 10000,
    affectedMonitors: aggs?.current?.down_checks?.affected_monitors?.value ?? 0,
    totalMonitors: aggs?.current?.total_monitors?.value ?? 0,
    errorCount: aggs?.current?.down_checks?.error_states?.value ?? 0,
    avgDurationMs: aggs?.current?.down_checks?.avg_duration?.value ?? 0,
    previousErrorRate: Math.round(previousErrorRate * 10000) / 10000,
    errorRateDelta: Math.round((currentErrorRate - previousErrorRate) * 10000) / 10000,
    locationStats,
    topFailingMonitors,
    insights,
  };
}
