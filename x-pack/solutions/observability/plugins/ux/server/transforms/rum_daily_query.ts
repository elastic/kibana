/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  durationToMs,
  emptyPageImpact,
  emptyVitalAttribution,
  summarizePagesKpis,
  type RumOverviewResponse,
  type RumPageRow,
  type RumPagesResponse,
  type RumVitalSummary,
} from '../../common/rum_app';
import { RUM_PAGES_DAILY_INDEX, RUM_SERVICE_DAILY_INDEX } from '../../common/rum_daily';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import { termsBuckets } from '../routes/rum/query';

const escapeWildcard = (raw: string): string => raw.replace(/[?*\\]/g, '\\$&');

export const weightedAverage = (
  rows: Array<{ value: number | null; weight: number }>
): number | null => {
  let num = 0;
  let den = 0;
  for (const row of rows) {
    if (row.value != null && row.weight > 0) {
      num += row.value * row.weight;
      den += row.weight;
    }
  }
  return den > 0 ? num / den : null;
};

const sumValue = (agg: unknown): number => {
  const value = (agg as { value?: number | null } | undefined)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const weightedValue = (agg: unknown): number | null => {
  const value = (agg as { value?: number | null } | undefined)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const dailyTimeFilter = (rangeFrom: string, rangeTo: string, watermark?: string | null) => {
  const lte = watermark && watermark < rangeTo ? watermark : rangeTo;
  return { range: { '@timestamp': { gte: rangeFrom, lte } } };
};

const dailyPageUrlFilter = (pageUrl?: string): object[] => {
  if (!pageUrl) {
    return [];
  }
  const needle = escapeWildcard(pageUrl.trim().replace(/[*?]/g, '')).slice(0, 200);
  if (!needle) {
    return [];
  }
  return [{ wildcard: { 'url.path.grouped': `*${needle}*` } }];
};

const dailyBaseFilters = ({
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  watermark,
}: {
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  watermark?: string | null;
}): object[] => {
  const filters: object[] = [dailyTimeFilter(rangeFrom, rangeTo, watermark)];
  if (serviceName) {
    filters.push({ term: { 'service.name': serviceName } });
  }
  filters.push(...dailyPageUrlFilter(pageUrl));
  return filters;
};

const vitalFromDaily = (p75: number | null, samples: number): RumVitalSummary => ({
  p75,
  ranks: null,
  samples,
});

const emptyOverview = (): RumOverviewResponse => ({
  kpis: {
    sessions: 0,
    pageViews: 0,
    errorSessions: 0,
    errorRate: 0,
    p75LoadMs: null,
    p75Inp: null,
  },
  vitals: {
    lcp: vitalFromDaily(null, 0),
    inp: vitalFromDaily(null, 0),
    cls: vitalFromDaily(null, 0),
    fcp: vitalFromDaily(null, 0),
  },
  trends: [],
  frustration: {
    rageSessions: 0,
    errorSessions: 0,
    deadClickSessions: 0,
    rageClicks: 0,
    deadClicks: 0,
    errorClicks: 0,
  },
  topPages: [],
  browsers: [],
  os: [],
  countries: [],
});

const kpiAggs = {
  page_views: { sum: { field: 'page_views' } },
  sessions: { sum: { field: 'sessions' } },
  error_sessions: { sum: { field: 'error_sessions' } },
  error_count: { sum: { field: 'error_count' } },
  rage_clicks: { sum: { field: 'rage_clicks' } },
  dead_clicks: { sum: { field: 'dead_clicks' } },
  error_clicks: { sum: { field: 'error_clicks' } },
  rage_sessions: { sum: { field: 'rage_sessions' } },
  dead_sessions: { sum: { field: 'dead_sessions' } },
  lcp_samples: { sum: { field: 'lcp_samples' } },
  inp_samples: { sum: { field: 'inp_samples' } },
  cls_samples: { sum: { field: 'cls_samples' } },
  fcp_samples: { sum: { field: 'fcp_samples' } },
  load_samples: { sum: { field: 'load_samples' } },
  lcp_p75: {
    weighted_avg: { value: { field: 'lcp_p75' }, weight: { field: 'lcp_samples' } },
  },
  inp_p75: {
    weighted_avg: { value: { field: 'inp_p75' }, weight: { field: 'inp_samples' } },
  },
  cls_p75: {
    weighted_avg: { value: { field: 'cls_p75' }, weight: { field: 'cls_samples' } },
  },
  fcp_p75: {
    weighted_avg: { value: { field: 'fcp_p75' }, weight: { field: 'fcp_samples' } },
  },
  load_p75: {
    weighted_avg: { value: { field: 'load_p75' }, weight: { field: 'load_samples' } },
  },
  trends: {
    date_histogram: { field: '@timestamp', calendar_interval: '1d' as const },
    aggs: {
      sessions: { sum: { field: 'sessions' } },
      page_views: { sum: { field: 'page_views' } },
      errors: { sum: { field: 'error_count' } },
    },
  },
};

const pageRowAggs = {
  views: { sum: { field: 'page_views' } },
  errors: { sum: { field: 'error_count' } },
  sessions: { sum: { field: 'sessions' } },
  rage: { sum: { field: 'rage_clicks' } },
  dead: { sum: { field: 'dead_clicks' } },
  lcp: { weighted_avg: { value: { field: 'lcp_p75' }, weight: { field: 'lcp_samples' } } },
  inp: { weighted_avg: { value: { field: 'inp_p75' }, weight: { field: 'inp_samples' } } },
  cls: { weighted_avg: { value: { field: 'cls_p75' }, weight: { field: 'cls_samples' } } },
  load: { weighted_avg: { value: { field: 'load_avg' }, weight: { field: 'load_samples' } } },
};

const pageRowFromBucket = (bucket: {
  key: string | number;
  views?: unknown;
  errors?: unknown;
  sessions?: unknown;
  rage?: unknown;
  dead?: unknown;
  lcp?: unknown;
  inp?: unknown;
  cls?: unknown;
  load?: unknown;
}): RumPageRow => ({
  path: String(bucket.key),
  views: sumValue(bucket.views),
  errorCount: sumValue(bucket.errors),
  p75Lcp: weightedValue(bucket.lcp),
  p75Inp: weightedValue(bucket.inp),
  p75Cls: weightedValue(bucket.cls),
  avgDurationMs: durationToMs(weightedValue(bucket.load)),
  ...emptyPageImpact(),
  sessionCount: sumValue(bucket.sessions),
  rageClicks: sumValue(bucket.rage),
  deadClicks: sumValue(bucket.dead),
  attribution: emptyVitalAttribution(),
  resources: [],
});

const overviewFromAggs = (
  aggs: Record<string, unknown>,
  topPages: RumPageRow[]
): RumOverviewResponse => {
  const sessions = sumValue(aggs.sessions);
  const pageViews = sumValue(aggs.page_views);
  const errorSessions = sumValue(aggs.error_sessions);
  const empty = emptyOverview();
  return {
    ...empty,
    kpis: {
      sessions,
      pageViews,
      errorSessions,
      errorRate: sessions > 0 ? errorSessions / sessions : 0,
      p75LoadMs: durationToMs(weightedValue(aggs.load_p75)),
      p75Inp: weightedValue(aggs.inp_p75),
    },
    vitals: {
      lcp: vitalFromDaily(weightedValue(aggs.lcp_p75), sumValue(aggs.lcp_samples)),
      inp: vitalFromDaily(weightedValue(aggs.inp_p75), sumValue(aggs.inp_samples)),
      cls: vitalFromDaily(weightedValue(aggs.cls_p75), sumValue(aggs.cls_samples)),
      fcp: vitalFromDaily(weightedValue(aggs.fcp_p75), sumValue(aggs.fcp_samples)),
    },
    trends: termsBuckets(aggs.trends).map((bucket) => ({
      timestamp:
        (bucket as { key_as_string?: string }).key_as_string ??
        new Date(Number(bucket.key)).toISOString(),
      sessions: sumValue(bucket.sessions),
      pageViews: sumValue(bucket.page_views),
      errors: sumValue(bucket.errors),
    })),
    frustration: {
      rageSessions: sumValue(aggs.rage_sessions),
      errorSessions,
      deadClickSessions: sumValue(aggs.dead_sessions),
      rageClicks: sumValue(aggs.rage_clicks),
      deadClicks: sumValue(aggs.dead_clicks),
      errorClicks: sumValue(aggs.error_clicks),
    },
    topPages,
  };
};

export const queryDailyOverview = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  usePages,
  useService,
  pagesWatermark,
  serviceWatermark,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  usePages: boolean;
  useService: boolean;
  pagesWatermark?: string | null;
  serviceWatermark?: string | null;
}): Promise<RumOverviewResponse> => {
  const kpiFromPages = Boolean(pageUrl) || !useService;
  if (kpiFromPages && !usePages) {
    return emptyOverview();
  }

  const kpiIndex = kpiFromPages ? RUM_PAGES_DAILY_INDEX : RUM_SERVICE_DAILY_INDEX;
  const kpiWatermark = kpiFromPages ? pagesWatermark : serviceWatermark;
  const kpiFilters = dailyBaseFilters({
    rangeFrom,
    rangeTo,
    serviceName,
    pageUrl: kpiFromPages ? pageUrl : undefined,
    watermark: kpiWatermark,
  });

  const [kpiResult, pagesResult] = await Promise.all([
    client.search(
      {
        index: kpiIndex,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: kpiFilters } },
        aggs: kpiAggs,
      },
      rumEsSearchOptions
    ),
    usePages
      ? client.search(
          {
            index: RUM_PAGES_DAILY_INDEX,
            ignore_unavailable: true,
            allow_no_indices: true,
            size: 0,
            query: {
              bool: {
                filter: dailyBaseFilters({
                  rangeFrom,
                  rangeTo,
                  serviceName,
                  pageUrl,
                  watermark: pagesWatermark,
                }),
              },
            },
            aggs: {
              pages: {
                terms: { field: 'url.path.grouped', size: 8, order: { views: 'desc' as const } },
                aggs: pageRowAggs,
              },
            },
          },
          rumEsSearchOptions
        )
      : Promise.resolve(null),
  ]);

  const topPages = pagesResult
    ? termsBuckets((pagesResult.aggregations as { pages?: unknown } | undefined)?.pages).map(
        (bucket) => pageRowFromBucket(bucket)
      )
    : [];

  return overviewFromAggs((kpiResult.aggregations ?? {}) as Record<string, unknown>, topPages);
};

export const queryDailyPages = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  watermark,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  watermark?: string | null;
}): Promise<RumPagesResponse> => {
  const result = await client.search(
    {
      index: RUM_PAGES_DAILY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          filter: dailyBaseFilters({ rangeFrom, rangeTo, serviceName, pageUrl, watermark }),
        },
      },
      aggs: {
        pages: {
          terms: { field: 'url.path.grouped', size: 80, order: { views: 'desc' as const } },
          aggs: pageRowAggs,
        },
      },
    },
    rumEsSearchOptions
  );

  const pages = termsBuckets((result.aggregations as { pages?: unknown } | undefined)?.pages).map(
    (bucket) => pageRowFromBucket(bucket)
  );
  return {
    pages,
    kpis: summarizePagesKpis(
      pages,
      pages.reduce((sum, page) => sum + page.sessionCount, 0)
    ),
  };
};
