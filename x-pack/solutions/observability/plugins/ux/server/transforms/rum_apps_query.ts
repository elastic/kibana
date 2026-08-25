/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { getInspectResponse, type InspectResponse } from '@kbn/observability-shared-plugin/common';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import {
  OTEL_ATTR_RUM_PLATFORM,
  OTEL_OS_NAME,
  OTEL_OS_TYPE,
  OTEL_RUM_PLATFORM,
  OTEL_SERVICE_ENVIRONMENT,
  OTEL_SERVICE_NAME,
} from '../../common/otel_rum';
import { platformKeysForInventory } from '../../common/rum_platform';
import {
  enrichRumAppInventory,
  mergeRumAppRows,
  mergeRumAppsResponses,
  overlayAppInventoryVitals,
  parseRumSessionTraffic,
  rumAppFromBucket,
  type RumAppInventoryRow,
  type RumAppsQueryStage,
  type RumAppsResponse,
} from '../../common/rum_apps';
import { ranksFromPercentileRanks, VITAL_RANK_THRESHOLDS } from '../../common/rum_app';
import { rumPerformanceScore, type RumPerformanceVitals } from '../../common/rum_performance_score';
import { previousEqualPeriod } from '../../common/rum_report';
import { RUM_CANONICAL_SESSION_ID_FIELD, RUM_SESSIONS_INDEX } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX, SESSION_ID_FIELDS } from '../../common/session_replay';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import {
  EXCEPTION_FILTER,
  PAGE_VIEW_FILTER,
  WEB_VITAL_FILTER,
  cardValue,
  percentileValue,
  rumBaseFilters,
  sessionCardinality,
  termsBuckets,
} from '../routes/rum/query';
import { sessionIndexTimeFilter } from './rum_sessions_query';
import { resolveNewTailSessionIds } from './rum_sessions_tail';

const platformSubAggs = {
  rumPlatform: { terms: { field: OTEL_RUM_PLATFORM, size: 5 } },
  attrPlatform: { terms: { field: OTEL_ATTR_RUM_PLATFORM, size: 5 } },
  osType: { terms: { field: OTEL_OS_TYPE, size: 5 } },
  osName: { terms: { field: OTEL_OS_NAME, size: 5 } },
};

const environmentSubAggs = {
  environments: { terms: { field: OTEL_SERVICE_ENVIRONMENT, size: 10 } },
  classicEnvironments: { terms: { field: SERVICE_ENVIRONMENT, size: 10 } },
};

const vitalP75 = (name: keyof typeof VITAL_RANK_THRESHOLDS) => {
  const { good, ni } = VITAL_RANK_THRESHOLDS[name];
  return {
    filter: {
      bool: {
        filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
      },
    },
    aggs: {
      p75: { percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] } },
      ranks: {
        percentile_ranks: {
          field: 'attributes.browser.web_vital.value',
          values: [good, ni],
        },
      },
    },
  };
};

const vitalAggs = {
  lcp: vitalP75('lcp'),
  inp: vitalP75('inp'),
  cls: vitalP75('cls'),
  fcp: vitalP75('fcp'),
  ttfb: vitalP75('ttfb'),
};

const trafficAggs = {
  sessions: sessionCardinality,
  page_views: { filter: PAGE_VIEW_FILTER },
  error_sessions: {
    filter: EXCEPTION_FILTER,
    aggs: { sessions: sessionCardinality },
  },
  ...vitalAggs,
  ...platformSubAggs,
};

const currentAppAggs = {
  ...trafficAggs,
  ...environmentSubAggs,
  trend: {
    auto_date_histogram: { field: '@timestamp', buckets: 12 },
    aggs: {
      sessions: sessionCardinality,
      error_sessions: {
        filter: EXCEPTION_FILTER,
        aggs: { sessions: sessionCardinality },
      },
      ...vitalAggs,
    },
  },
};

const currentPeriodAggs = {
  otelApps: {
    terms: {
      field: OTEL_SERVICE_NAME,
      size: 50,
      order: { sessions: 'desc' as const },
    },
    aggs: currentAppAggs,
  },
  apps: {
    terms: { field: SERVICE_NAME, size: 50, order: { sessions: 'desc' as const } },
    aggs: currentAppAggs,
  },
  sessionTraffic: {
    auto_date_histogram: { field: '@timestamp', buckets: 72 },
    aggs: {
      sessions: sessionCardinality,
    },
  },
};

const keysOf = (agg: unknown): string[] =>
  termsBuckets(agg)
    .map((bucket) => String(bucket.key))
    .filter((key) => key.length > 0);

const pageViewsOf = (bucket: { page_views?: unknown; [name: string]: unknown }): number => {
  const pageViews = bucket.page_views as { value?: number; doc_count?: number } | undefined;
  if (typeof pageViews?.value === 'number' && Number.isFinite(pageViews.value)) {
    return pageViews.value;
  }
  const count = pageViews?.doc_count;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
};

const p75Of = (agg: unknown): number | null =>
  percentileValue((agg as { p75?: unknown } | undefined)?.p75) ?? percentileValue(agg);

const ranksOf = (agg: unknown): ReturnType<typeof ranksFromPercentileRanks> =>
  ranksFromPercentileRanks(
    (agg as { ranks?: { values?: Record<string, number | null> } } | undefined)?.ranks?.values
  );

const performanceRanksOf = (bucket: Record<string, unknown>): RumPerformanceVitals['ranks'] => ({
  lcp: ranksOf(bucket.lcp),
  inp: ranksOf(bucket.inp),
  cls: ranksOf(bucket.cls),
  fcp: ranksOf(bucket.fcp),
  ttfb: ranksOf(bucket.ttfb),
});

const sessionsOf = (bucket: { sessions?: unknown; doc_count?: number }): number => {
  if (bucket.sessions != null) {
    return cardValue(bucket.sessions);
  }
  return typeof bucket.doc_count === 'number' && Number.isFinite(bucket.doc_count)
    ? bucket.doc_count
    : 0;
};

const errorSessionsOf = (bucket: { error_sessions?: unknown; [name: string]: unknown }): number => {
  const nested = bucket.error_sessions as { sessions?: unknown; doc_count?: number } | undefined;
  if (nested?.sessions != null) {
    return cardValue(nested.sessions);
  }
  return typeof nested?.doc_count === 'number' && Number.isFinite(nested.doc_count)
    ? nested.doc_count
    : 0;
};

const scoreTrendOf = (agg: unknown): number[] =>
  termsBuckets(agg)
    .map((bucket) => {
      const sessions = sessionsOf(bucket);
      const errorSessions = errorSessionsOf(bucket);
      return rumPerformanceScore({
        lcp: p75Of(bucket.lcp),
        inp: p75Of(bucket.inp),
        cls: p75Of(bucket.cls),
        fcp: p75Of(bucket.fcp),
        ttfb: p75Of(bucket.ttfb),
        errorRate: sessions > 0 ? errorSessions / sessions : null,
        ranks: performanceRanksOf(bucket),
      });
    })
    .filter((score): score is number => score != null);

export const parseAppTerms = (agg: unknown): RumAppInventoryRow[] =>
  termsBuckets(agg).map((bucket) => {
    const p75Lcp = p75Of(bucket.lcp);
    const p75Inp = p75Of(bucket.inp);
    const p75Cls = p75Of(bucket.cls);
    const p75Fcp = p75Of(bucket.fcp);
    const p75Ttfb = p75Of(bucket.ttfb);
    return rumAppFromBucket({
      name: String(bucket.key),
      sessions: sessionsOf(bucket),
      pageViews: pageViewsOf(bucket),
      errorSessions: errorSessionsOf(bucket),
      p75Lcp,
      p75Inp,
      p75Cls,
      p75Fcp,
      p75Ttfb,
      ranks: performanceRanksOf(bucket),
      trend: termsBuckets(bucket.trend).map((item) => item.doc_count),
      scoreTrend: scoreTrendOf(bucket.trend),
      environments: [
        ...new Set([...keysOf(bucket.environments), ...keysOf(bucket.classicEnvironments)]),
      ],
      platformKeys: platformKeysForInventory({
        rumPlatform: keysOf(bucket.rumPlatform),
        attrPlatform: keysOf(bucket.attrPlatform),
        osType: keysOf(bucket.osType),
        osName: keysOf(bucket.osName),
        hasWebVitals: [p75Lcp, p75Inp, p75Cls, p75Fcp].some((value) => value != null),
      }),
    });
  });

const sessionVitalP75 = (field: 'lcp_p75' | 'inp_p75' | 'cls_p75' | 'fcp_p75' | 'ttfb_p75') => ({
  percentiles: { field, percents: [75] },
});

const sessionTrafficAggs = {
  page_views: { sum: { field: 'page_view_count' } },
  error_sessions: { filter: { range: { error_count: { gt: 0 } } } },
  lcp: sessionVitalP75('lcp_p75'),
  inp: sessionVitalP75('inp_p75'),
  cls: sessionVitalP75('cls_p75'),
  fcp: sessionVitalP75('fcp_p75'),
  ttfb: sessionVitalP75('ttfb_p75'),
  osName: { terms: { field: 'os.name', size: 5 } },
};

const sessionCurrentAppAggs = {
  ...sessionTrafficAggs,
  trend: {
    auto_date_histogram: { field: 'start_time', buckets: 12 },
    aggs: {
      error_sessions: { filter: { range: { error_count: { gt: 0 } } } },
      lcp: sessionVitalP75('lcp_p75'),
      inp: sessionVitalP75('inp_p75'),
      cls: sessionVitalP75('cls_p75'),
      fcp: sessionVitalP75('fcp_p75'),
      ttfb: sessionVitalP75('ttfb_p75'),
    },
  },
};

const sessionCurrentPeriodAggs = {
  apps: {
    terms: { field: 'service.name', size: 50, order: { _count: 'desc' as const } },
    aggs: sessionCurrentAppAggs,
  },
  sessionTraffic: {
    auto_date_histogram: { field: 'start_time', buckets: 72 },
  },
};

const periodApps = (
  aggs: { otelApps?: unknown; apps?: unknown } | undefined
): RumAppInventoryRow[] =>
  mergeRumAppRows(parseAppTerms(aggs?.otelApps), parseAppTerms(aggs?.apps));

interface AppsAggs {
  current?: { otelApps?: unknown; apps?: unknown; sessionTraffic?: unknown };
  previous?: { otelApps?: unknown; apps?: unknown };
  otelApps?: unknown;
  apps?: unknown;
  sessionTraffic?: unknown;
}

const emptyAppsResponse = (source: RumAppsResponse['source']): RumAppsResponse => ({
  apps: [],
  sessionTraffic: [],
  source,
  remainder: false,
});

const inspectSearch = ({
  request,
  searchRequest,
  result,
  startTime,
  operationName,
}: {
  request?: KibanaRequest;
  searchRequest: object;
  result: object;
  startTime: number;
  operationName: string;
}): InspectResponse | undefined =>
  request
    ? [
        getInspectResponse({
          esError: null,
          esRequestParams: searchRequest,
          esRequestStatus: RequestStatus.OK,
          esResponse: result,
          kibanaRequest: request,
          operationName,
          startTime,
        }),
      ]
    : undefined;

const toAppsResponse = ({
  aggs,
  period,
  source,
  remainder,
}: {
  aggs: AppsAggs;
  period: ReturnType<typeof previousEqualPeriod>;
  source: RumAppsResponse['source'];
  remainder: boolean;
}): RumAppsResponse => {
  const current = period ? periodApps(aggs.current) : periodApps(aggs);
  const previous = period ? periodApps(aggs.previous) : [];
  return {
    apps: enrichRumAppInventory(current, previous),
    sessionTraffic: parseRumSessionTraffic(
      period ? aggs.current?.sessionTraffic : aggs.sessionTraffic
    ),
    source,
    remainder,
  };
};

const searchRawApps = async ({
  client,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
  compare,
  request,
  operationName,
  extraFilters,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  includeBots?: string;
  botUa?: string;
  compare: boolean;
  request?: KibanaRequest;
  operationName: string;
  extraFilters?: object[];
}): Promise<RumAppsResponse & { _inspect?: InspectResponse }> => {
  const period = compare ? previousEqualPeriod(rangeFrom, rangeTo) : null;
  const wideFrom = period?.compareFrom ?? rangeFrom;
  const wideTo = period?.currentTo ?? rangeTo;
  const searchRequest = {
    index: RUM_SESSION_SOURCE_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rumBaseFilters({ rangeFrom: wideFrom, rangeTo: wideTo, includeBots, botUa }),
          ...(extraFilters ?? []),
          {
            bool: {
              should: [PAGE_VIEW_FILTER, { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } }],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
    aggs: period
      ? {
          current: {
            filter: {
              range: { '@timestamp': { gte: period.currentFrom, lte: period.currentTo } },
            },
            aggs: currentPeriodAggs,
          },
          previous: {
            filter: {
              range: { '@timestamp': { gte: period.compareFrom, lt: period.compareTo } },
            },
            aggs: {
              otelApps: {
                terms: {
                  field: OTEL_SERVICE_NAME,
                  size: 50,
                  order: { sessions: 'desc' as const },
                },
                aggs: trafficAggs,
              },
              apps: {
                terms: { field: SERVICE_NAME, size: 50, order: { sessions: 'desc' as const } },
                aggs: trafficAggs,
              },
            },
          },
        }
      : currentPeriodAggs,
  };
  const startTime = Date.now();
  const result = await client.search(searchRequest, rumEsSearchOptions);
  return {
    ...toAppsResponse({
      aggs: (result.aggregations ?? {}) as AppsAggs,
      period,
      source: 'raw',
      remainder: false,
    }),
    ...(request
      ? {
          _inspect: inspectSearch({
            request,
            searchRequest,
            result,
            startTime,
            operationName,
          }),
        }
      : {}),
  };
};

const searchSessionApps = async ({
  client,
  rangeFrom,
  rangeTo,
  watermark,
  request,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  watermark: string;
  request?: KibanaRequest;
}): Promise<RumAppsResponse & { _inspect?: InspectResponse }> => {
  const period = previousEqualPeriod(rangeFrom, rangeTo);
  const wideFrom = period?.compareFrom ?? rangeFrom;
  const wideTo = period?.currentTo ?? rangeTo;
  const searchRequest = {
    index: RUM_SESSIONS_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: {
      bool: {
        filter: [sessionIndexTimeFilter(wideFrom, wideTo, watermark)],
      },
    },
    aggs: period
      ? {
          current: {
            filter: {
              range: { start_time: { gte: period.currentFrom, lte: period.currentTo } },
            },
            aggs: sessionCurrentPeriodAggs,
          },
          previous: {
            filter: {
              range: { start_time: { gte: period.compareFrom, lt: period.compareTo } },
            },
            aggs: {
              apps: {
                terms: { field: 'service.name', size: 50, order: { _count: 'desc' as const } },
                aggs: sessionTrafficAggs,
              },
            },
          },
        }
      : sessionCurrentPeriodAggs,
  };
  const startTime = Date.now();
  const result = await client.search(searchRequest, rumEsSearchOptions);
  return {
    ...toAppsResponse({
      aggs: (result.aggregations ?? {}) as AppsAggs,
      period,
      source: 'sessions',
      remainder: false,
    }),
    ...(request
      ? {
          _inspect: inspectSearch({
            request,
            searchRequest,
            result,
            startTime,
            operationName: 'UxApplicationsIndex',
          }),
        }
      : {}),
  };
};

export const queryRumApps = async ({
  client,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
  request,
  stage,
  useIndex,
  mergeRaw,
  watermark,
}: {
  client: ElasticsearchClient;
  rangeFrom?: string;
  rangeTo?: string;
  includeBots?: string;
  botUa?: string;
  request?: KibanaRequest;
  stage?: RumAppsQueryStage;
  useIndex?: boolean;
  mergeRaw?: boolean;
  watermark?: string | null;
}): Promise<RumAppsResponse & { _inspect?: InspectResponse }> => {
  const currentFrom = rangeFrom || 'now-24h';
  const currentTo = rangeTo || 'now';
  const canIndex = Boolean(useIndex && watermark);
  const wantIndex = canIndex && stage !== 'remainder';
  const wantRemainder = Boolean(canIndex && mergeRaw && stage !== 'index');
  const wantRawFallback = !canIndex && stage !== 'remainder';

  if (stage === 'remainder' && !wantRemainder) {
    return emptyAppsResponse('raw');
  }

  if (wantIndex) {
    const [indexed, vitals] = await Promise.all([
      searchSessionApps({
        client,
        rangeFrom: currentFrom,
        rangeTo: currentTo,
        watermark: watermark as string,
        request,
      }),
      searchRawApps({
        client,
        rangeFrom: currentFrom,
        rangeTo: currentTo,
        includeBots,
        botUa,
        compare: false,
        request,
        operationName: 'UxApplicationsVitals',
      }),
    ]);
    const withVitals = {
      ...indexed,
      apps: overlayAppInventoryVitals(indexed.apps, vitals.apps),
    };
    if (stage === 'index') {
      return { ...withVitals, remainder: Boolean(mergeRaw) };
    }
    if (!wantRemainder) {
      return withVitals;
    }
    const newIds = await resolveNewTailSessionIds({
      client,
      rangeFrom: watermark as string,
      rangeTo: currentTo,
    });
    if (newIds.length === 0) {
      const inspect = [...(withVitals._inspect ?? []), ...(vitals._inspect ?? [])];
      return inspect.length > 0 ? { ...withVitals, _inspect: inspect } : withVitals;
    }
    const live = await searchRawApps({
      client,
      rangeFrom: watermark as string,
      rangeTo: currentTo,
      includeBots,
      botUa,
      compare: false,
      request,
      operationName: 'UxApplicationsRemainder',
      extraFilters: [
        {
          bool: {
            should: SESSION_ID_FIELDS.map((field) => ({ terms: { [field]: newIds } })),
            minimum_should_match: 1,
          },
        },
      ],
    });
    const merged = mergeRumAppsResponses(withVitals, live);
    const inspect = [
      ...(withVitals._inspect ?? []),
      ...(vitals._inspect ?? []),
      ...(live._inspect ?? []),
    ];
    return inspect.length > 0 ? { ...merged, _inspect: inspect } : merged;
  }

  if (wantRawFallback) {
    return searchRawApps({
      client,
      rangeFrom: currentFrom,
      rangeTo: currentTo,
      includeBots,
      botUa,
      compare: true,
      request,
      operationName: 'UxApplications',
    });
  }

  return searchRawApps({
    client,
    rangeFrom: watermark || currentFrom,
    rangeTo: currentTo,
    includeBots,
    botUa,
    compare: false,
    request,
    operationName: 'UxApplicationsRemainder',
  });
};
