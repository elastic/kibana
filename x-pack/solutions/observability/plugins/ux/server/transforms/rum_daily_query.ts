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
  pagePathFromKey,
  pagesViewsKpi,
  ranksFromCounts,
  summarizePagesKpis,
  VITAL_RANK_THRESHOLDS,
  type RumCountryRow,
  type RumFacetBucket,
  type RumOverviewResponse,
  type RumPageRow,
  type RumPagesResponse,
  type RumVitalSummary,
} from '../../common/rum_app';
import {
  dailyIndexTimeRange,
  dailyRangeGte,
  RUM_BROWSER_DAILY_INDEX,
  RUM_PAGES_DAILY_INDEX,
  RUM_SERVICE_DAILY_INDEX,
} from '../../common/rum_daily';
import { rangeIncludesOpenTail } from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { rumEsSearchOptions } from '../routes/rum/es_retry';
import {
  BROWSER_SCRIPT,
  DOCUMENT_LOAD_FILTER,
  EXCEPTION_FILTER,
  OS_SCRIPT,
  PAGE_VIEW_FILTER,
  WEB_VITAL_FILTER,
  cardValue,
  facetFromScriptTerms,
  frustrationEventFilter,
  pagePathTerms,
  percentileValue,
  rumBaseFilters,
  sessionCardinality,
  termsBuckets,
} from '../routes/rum/query';

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

const dailyTimeFilter = (rangeFrom: string, rangeTo: string, watermark?: string | null) => ({
  range: { '@timestamp': dailyIndexTimeRange({ rangeFrom, rangeTo, watermark }) },
});

export interface RumOpenDayVitalTail {
  samples: number;
  good: number;
  ni: number;
  poor: number;
  p75: number | null;
}

/** Additive raw counts for the open UTC day. Session uniques are for the trend point only. */
export interface RumOpenDayTail {
  pageViews: number;
  errorCount: number;
  sessions: number;
  errorSessions: number;
  rageClicks: number;
  deadClicks: number;
  errorClicks: number;
  rageSessions: number;
  deadSessions: number;
  lcp: RumOpenDayVitalTail;
  inp: RumOpenDayVitalTail;
  cls: RumOpenDayVitalTail;
  fcp: RumOpenDayVitalTail;
  loadSamples: number;
  loadP75: number | null;
  pages: RumPageRow[];
}

export interface RumUniqueSessionKpis {
  sessions: number;
  errorSessions: number;
  rageSessions: number;
  deadSessions: number;
}

export interface RumRawOverviewSlice {
  unique: RumUniqueSessionKpis;
  browsers: RumFacetBucket[];
  os: RumFacetBucket[];
  countries: RumCountryRow[];
}

const filterDocCount = (agg: unknown): number => {
  const n = (agg as { doc_count?: number } | undefined)?.doc_count;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

const emptyVitalTail = (): RumOpenDayVitalTail => ({
  samples: 0,
  good: 0,
  ni: 0,
  poor: 0,
  p75: null,
});

export const emptyOpenDayTail = (): RumOpenDayTail => ({
  pageViews: 0,
  errorCount: 0,
  sessions: 0,
  errorSessions: 0,
  rageClicks: 0,
  deadClicks: 0,
  errorClicks: 0,
  rageSessions: 0,
  deadSessions: 0,
  lcp: emptyVitalTail(),
  inp: emptyVitalTail(),
  cls: emptyVitalTail(),
  fcp: emptyVitalTail(),
  loadSamples: 0,
  loadP75: null,
  pages: [],
});

const vitalTailFromAgg = (agg: unknown): RumOpenDayVitalTail => {
  if (!agg || typeof agg !== 'object') {
    return emptyVitalTail();
  }
  const bucket = agg as {
    samples?: unknown;
    good?: unknown;
    ni?: unknown;
    poor?: unknown;
    p75?: unknown;
  };
  return {
    samples: cardValue(bucket.samples),
    good: filterDocCount(bucket.good),
    ni: filterDocCount(bucket.ni),
    poor: filterDocCount(bucket.poor),
    p75: percentileValue(bucket.p75),
  };
};

const nestedSessionCount = (agg: unknown): number =>
  cardValue((agg as { sessions?: unknown } | undefined)?.sessions);

const rawOverviewFilters = ({
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  browser,
  includeBots,
  botUa,
}: {
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  browser?: string;
  includeBots?: string;
  botUa?: string;
}): object[] =>
  rumBaseFilters({
    rangeFrom,
    rangeTo,
    serviceName,
    pageUrl,
    browser,
    includeBots,
    botUa,
  });

const vitalFilter = (name: keyof typeof VITAL_RANK_THRESHOLDS) => ({
  bool: {
    filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
  },
});

const vitalTailAggs = (name: keyof typeof VITAL_RANK_THRESHOLDS) => {
  const { good, ni } = VITAL_RANK_THRESHOLDS[name];
  const field = 'attributes.browser.web_vital.value';
  return {
    filter: vitalFilter(name),
    aggs: {
      samples: { value_count: { field } },
      p75: { percentiles: { field, percents: [75] } },
      good: { filter: { range: { [field]: { lte: good } } } },
      ni: { filter: { range: { [field]: { gt: good, lte: ni } } } },
      poor: { filter: { range: { [field]: { gt: ni } } } },
    },
  };
};

const uniqueSessionAggs = {
  sessions: sessionCardinality,
  error_sessions: {
    filter: EXCEPTION_FILTER,
    aggs: { sessions: sessionCardinality },
  },
  rage_sessions: {
    filter: frustrationEventFilter('rage_click'),
    aggs: { sessions: sessionCardinality },
  },
  dead_sessions: {
    filter: frustrationEventFilter('dead_click'),
    aggs: { sessions: sessionCardinality },
  },
};

const uniqueKpisFromAggs = (aggs: Record<string, unknown>): RumUniqueSessionKpis => ({
  sessions: cardValue(aggs.sessions),
  errorSessions: nestedSessionCount(aggs.error_sessions),
  rageSessions: nestedSessionCount(aggs.rage_sessions),
  deadSessions: nestedSessionCount(aggs.dead_sessions),
});

export const hasOpenDayActivity = (tail: RumOpenDayTail): boolean =>
  tail.pageViews > 0 ||
  tail.errorCount > 0 ||
  tail.sessions > 0 ||
  tail.rageClicks > 0 ||
  tail.deadClicks > 0 ||
  tail.errorClicks > 0 ||
  tail.lcp.samples > 0 ||
  tail.inp.samples > 0 ||
  tail.cls.samples > 0 ||
  tail.fcp.samples > 0 ||
  tail.loadSamples > 0 ||
  tail.pages.length > 0;

/** Add today's event counts. Do not add session uniques — daily sums already overcount those. */
export const mergeOpenDayTailIntoAggs = (
  aggs: Record<string, unknown>,
  tail: RumOpenDayTail
): Record<string, unknown> => {
  const add = (name: string, n: number) => ({ value: sumValue(aggs[name]) + n });
  const mergeP75 = (p75Name: string, samplesName: string, p75: number | null, samples: number) => ({
    value: weightedAverage([
      { value: weightedValue(aggs[p75Name]), weight: sumValue(aggs[samplesName]) },
      { value: p75, weight: samples },
    ]),
  });
  return {
    ...aggs,
    page_views: add('page_views', tail.pageViews),
    error_count: add('error_count', tail.errorCount),
    rage_clicks: add('rage_clicks', tail.rageClicks),
    dead_clicks: add('dead_clicks', tail.deadClicks),
    error_clicks: add('error_clicks', tail.errorClicks),
    lcp_samples: add('lcp_samples', tail.lcp.samples),
    lcp_good: add('lcp_good', tail.lcp.good),
    lcp_ni: add('lcp_ni', tail.lcp.ni),
    lcp_poor: add('lcp_poor', tail.lcp.poor),
    lcp_p75: mergeP75('lcp_p75', 'lcp_samples', tail.lcp.p75, tail.lcp.samples),
    inp_samples: add('inp_samples', tail.inp.samples),
    inp_good: add('inp_good', tail.inp.good),
    inp_ni: add('inp_ni', tail.inp.ni),
    inp_poor: add('inp_poor', tail.inp.poor),
    inp_p75: mergeP75('inp_p75', 'inp_samples', tail.inp.p75, tail.inp.samples),
    cls_samples: add('cls_samples', tail.cls.samples),
    cls_good: add('cls_good', tail.cls.good),
    cls_ni: add('cls_ni', tail.cls.ni),
    cls_poor: add('cls_poor', tail.cls.poor),
    cls_p75: mergeP75('cls_p75', 'cls_samples', tail.cls.p75, tail.cls.samples),
    fcp_samples: add('fcp_samples', tail.fcp.samples),
    fcp_good: add('fcp_good', tail.fcp.good),
    fcp_ni: add('fcp_ni', tail.fcp.ni),
    fcp_poor: add('fcp_poor', tail.fcp.poor),
    fcp_p75: mergeP75('fcp_p75', 'fcp_samples', tail.fcp.p75, tail.fcp.samples),
    load_samples: add('load_samples', tail.loadSamples),
    load_p75: mergeP75('load_p75', 'load_samples', tail.loadP75, tail.loadSamples),
  };
};

export const applyUniqueSessionKpis = (
  overview: RumOverviewResponse,
  unique: RumUniqueSessionKpis
): RumOverviewResponse => ({
  ...overview,
  kpis: {
    ...overview.kpis,
    sessions: unique.sessions,
    errorSessions: unique.errorSessions,
    errorRate: unique.sessions > 0 ? unique.errorSessions / unique.sessions : 0,
  },
  frustration: {
    ...overview.frustration,
    rageSessions: unique.rageSessions,
    errorSessions: unique.errorSessions,
    deadClickSessions: unique.deadSessions,
  },
});

export const applyRawOverviewSlice = (
  overview: RumOverviewResponse,
  slice: RumRawOverviewSlice
): RumOverviewResponse => ({
  ...applyUniqueSessionKpis(overview, slice.unique),
  browsers: slice.browsers,
  os: slice.os,
  countries: slice.countries,
});

export const mergePageRowsByPath = (left: RumPageRow[], right: RumPageRow[]): RumPageRow[] => {
  const merged = new Map<string, RumPageRow>();
  for (const page of [...left, ...right]) {
    if (!page.path) {
      continue;
    }
    const existing = merged.get(page.path);
    if (!existing) {
      merged.set(page.path, page);
      continue;
    }
    merged.set(page.path, {
      ...existing,
      views: existing.views + page.views,
      errorCount: existing.errorCount + page.errorCount,
      sessionCount: existing.sessionCount + page.sessionCount,
      rageClicks: existing.rageClicks + page.rageClicks,
      deadClicks: existing.deadClicks + page.deadClicks,
      p75Lcp: existing.p75Lcp ?? page.p75Lcp,
      p75Inp: existing.p75Inp ?? page.p75Inp,
      p75Cls: existing.p75Cls ?? page.p75Cls,
      avgDurationMs: existing.avgDurationMs ?? page.avgDurationMs,
      attribution: existing.attribution.lcpElement ? existing.attribution : page.attribution,
    });
  }
  return [...merged.values()].sort((a, b) => b.views - a.views);
};

const pageVitalP75 = (name: 'lcp' | 'inp' | 'cls') => ({
  filter: {
    bool: {
      filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
    },
  },
  aggs: {
    p75: { percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] } },
  },
});

const openDayPageAggs = (size: number) => ({
  pages: {
    ...pagePathTerms(size),
    aggs: {
      views: { filter: PAGE_VIEW_FILTER },
      errors: { filter: EXCEPTION_FILTER },
      sessions: sessionCardinality,
      rage: { filter: frustrationEventFilter('rage_click') },
      dead: { filter: frustrationEventFilter('dead_click') },
      lcp: pageVitalP75('lcp'),
      inp: pageVitalP75('inp'),
      cls: pageVitalP75('cls'),
      load: {
        filter: DOCUMENT_LOAD_FILTER,
        aggs: {
          avg_ns: { avg: { field: 'duration' } },
          avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
        },
      },
      lcp_element: {
        terms: { field: 'attributes.browser.web_vital.lcp.element', size: 1, exclude: '' },
      },
      inp_target: {
        terms: { field: 'attributes.browser.web_vital.inp.target', size: 1, exclude: '' },
      },
      cls_source: {
        terms: { field: 'attributes.browser.web_vital.cls.source', size: 1, exclude: '' },
      },
    },
  },
});

const topKeyword = (agg: unknown): string | null => {
  const key = termsBuckets(agg)[0]?.key;
  return key != null && String(key).length > 0 ? String(key) : null;
};

const pageRowFromRawBucket = (bucket: {
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
  lcp_element?: unknown;
  inp_target?: unknown;
  cls_source?: unknown;
}): RumPageRow => {
  const load = bucket.load as
    | { avg_ns?: { value?: number | null }; avg_us?: { value?: number | null } }
    | undefined;
  return {
    path: String(bucket.key),
    views: filterDocCount(bucket.views),
    errorCount: filterDocCount(bucket.errors),
    p75Lcp: percentileValue((bucket.lcp as { p75?: unknown } | undefined)?.p75),
    p75Inp: percentileValue((bucket.inp as { p75?: unknown } | undefined)?.p75),
    p75Cls: percentileValue((bucket.cls as { p75?: unknown } | undefined)?.p75),
    avgDurationMs:
      durationToMs(load?.avg_ns?.value ?? undefined) ??
      durationToMs(load?.avg_us?.value ?? undefined),
    ...emptyPageImpact(),
    sessionCount: cardValue(bucket.sessions),
    rageClicks: filterDocCount(bucket.rage),
    deadClicks: filterDocCount(bucket.dead),
    attribution: {
      ...emptyVitalAttribution(),
      lcpElement: topKeyword(bucket.lcp_element),
      inpTarget: topKeyword(bucket.inp_target),
      clsSource: topKeyword(bucket.cls_source),
    },
    resources: [],
  };
};

const countriesFromAgg = (agg: unknown): RumCountryRow[] =>
  termsBuckets(agg)
    .filter((bucket) => String(bucket.key).length > 0)
    .map((bucket) => {
      const nameBucket = termsBuckets(bucket.country_name)[0];
      return {
        isoCode: String(bucket.key),
        name: nameBucket ? String(nameBucket.key) : String(bucket.key),
        pageViews: filterDocCount(bucket.views),
        sessions: cardValue(bucket.sessions),
        errorCount: filterDocCount(bucket.errors),
        p75Lcp: percentileValue((bucket.lcp as { p75?: unknown } | undefined)?.p75),
      };
    })
    .sort((a, b) => b.pageViews - a.pageViews || b.sessions - a.sessions);

const facetAggs = {
  browsers: {
    terms: { script: { source: BROWSER_SCRIPT, lang: 'painless' }, size: 8, exclude: '' },
  },
  os: {
    terms: { script: { source: OS_SCRIPT, lang: 'painless' }, size: 8, exclude: '' },
  },
  countries: {
    terms: { field: 'client.geo.country_iso_code', size: 12, missing: '' },
    aggs: {
      country_name: { terms: { field: 'client.geo.country_name', size: 1 } },
      views: { filter: PAGE_VIEW_FILTER },
      errors: { filter: EXCEPTION_FILTER },
      sessions: sessionCardinality,
      lcp: pageVitalP75('lcp'),
    },
  },
};

const sliceFromAggs = (aggs: Record<string, unknown>): RumRawOverviewSlice => ({
  unique: uniqueKpisFromAggs(aggs),
  browsers: facetFromScriptTerms(aggs.browsers),
  os: facetFromScriptTerms(aggs.os),
  countries: countriesFromAgg(aggs.countries),
});

const queryRawOpenDayTail = async ({
  client,
  rangeTo,
  serviceName,
  pageUrl,
  browser,
  includeBots,
  botUa,
  pageSize,
}: {
  client: ElasticsearchClient;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  browser?: string;
  includeBots?: string;
  botUa?: string;
  pageSize?: number;
}): Promise<RumOpenDayTail> => {
  const result = await client.search(
    {
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          filter: rawOverviewFilters({
            rangeFrom: dailyRangeGte('now'),
            rangeTo,
            serviceName,
            pageUrl,
            browser,
            includeBots,
            botUa,
          }),
        },
      },
      aggs: {
        page_views: { filter: PAGE_VIEW_FILTER },
        error_count: { filter: EXCEPTION_FILTER },
        rage_clicks: { filter: frustrationEventFilter('rage_click') },
        dead_clicks: { filter: frustrationEventFilter('dead_click') },
        error_clicks: { filter: frustrationEventFilter('error_click') },
        lcp: vitalTailAggs('lcp'),
        inp: vitalTailAggs('inp'),
        cls: vitalTailAggs('cls'),
        fcp: vitalTailAggs('fcp'),
        load: {
          filter: DOCUMENT_LOAD_FILTER,
          aggs: {
            samples: { value_count: { field: '@timestamp' } },
            p75_ns: { percentiles: { field: 'duration', percents: [75] } },
            p75_us: {
              percentiles: { field: 'attributes.transaction.duration.us', percents: [75] },
            },
          },
        },
        ...uniqueSessionAggs,
        ...(pageSize && pageSize > 0 ? openDayPageAggs(pageSize) : {}),
      },
    },
    rumEsSearchOptions
  );
  const aggs = (result.aggregations ?? {}) as Record<string, unknown>;
  const load = aggs.load as { samples?: unknown; p75_ns?: unknown; p75_us?: unknown } | undefined;
  const unique = uniqueKpisFromAggs(aggs);
  return {
    pageViews: filterDocCount(aggs.page_views),
    errorCount: filterDocCount(aggs.error_count),
    sessions: unique.sessions,
    errorSessions: unique.errorSessions,
    rageClicks: filterDocCount(aggs.rage_clicks),
    deadClicks: filterDocCount(aggs.dead_clicks),
    errorClicks: filterDocCount(aggs.error_clicks),
    rageSessions: unique.rageSessions,
    deadSessions: unique.deadSessions,
    lcp: vitalTailFromAgg(aggs.lcp),
    inp: vitalTailFromAgg(aggs.inp),
    cls: vitalTailFromAgg(aggs.cls),
    fcp: vitalTailFromAgg(aggs.fcp),
    loadSamples: cardValue(load?.samples),
    loadP75: percentileValue(load?.p75_ns) ?? percentileValue(load?.p75_us),
    pages: termsBuckets(aggs.pages)
      .filter((bucket) => String(bucket.key).length > 0)
      .map((bucket) => pageRowFromRawBucket(bucket)),
  };
};

const queryRawOverviewSlice = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  browser,
  includeBots,
  botUa,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  browser?: string;
  includeBots?: string;
  botUa?: string;
}): Promise<RumRawOverviewSlice> => {
  const result = await client.search(
    {
      index: RUM_SESSION_SOURCE_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: {
        bool: {
          filter: rawOverviewFilters({
            rangeFrom,
            rangeTo,
            serviceName,
            pageUrl,
            browser,
            includeBots,
            botUa,
          }),
        },
      },
      aggs: {
        ...uniqueSessionAggs,
        ...facetAggs,
      },
    },
    rumEsSearchOptions
  );
  return sliceFromAggs((result.aggregations ?? {}) as Record<string, unknown>);
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
  browser,
  watermark,
}: {
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  browser?: string;
  watermark?: string | null;
}): object[] => {
  const filters: object[] = [dailyTimeFilter(rangeFrom, rangeTo, watermark)];
  if (serviceName) {
    filters.push({ term: { 'service.name': serviceName } });
  }
  if (browser) {
    filters.push({ term: { 'browser.name': browser } });
  }
  filters.push(...dailyPageUrlFilter(pageUrl));
  return filters;
};

const vitalFromDaily = (
  p75: number | null,
  samples: number,
  good: number,
  ni: number,
  poor: number
): RumVitalSummary => ({
  p75,
  ranks: ranksFromCounts(good, ni, poor),
  samples,
});

const emptyOverview = (): RumOverviewResponse => ({
  kpis: {
    sessions: 0,
    pageViews: 0,
    errorSessions: 0,
    errorRate: 0,
    bounceRate: null,
    p75LoadMs: null,
    p75Inp: null,
  },
  vitals: {
    lcp: vitalFromDaily(null, 0, 0, 0, 0),
    inp: vitalFromDaily(null, 0, 0, 0, 0),
    cls: vitalFromDaily(null, 0, 0, 0, 0),
    fcp: vitalFromDaily(null, 0, 0, 0, 0),
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
  lcp_good: { sum: { field: 'lcp_good' } },
  lcp_ni: { sum: { field: 'lcp_ni' } },
  lcp_poor: { sum: { field: 'lcp_poor' } },
  inp_samples: { sum: { field: 'inp_samples' } },
  inp_good: { sum: { field: 'inp_good' } },
  inp_ni: { sum: { field: 'inp_ni' } },
  inp_poor: { sum: { field: 'inp_poor' } },
  cls_samples: { sum: { field: 'cls_samples' } },
  cls_good: { sum: { field: 'cls_good' } },
  cls_ni: { sum: { field: 'cls_ni' } },
  cls_poor: { sum: { field: 'cls_poor' } },
  fcp_samples: { sum: { field: 'fcp_samples' } },
  fcp_good: { sum: { field: 'fcp_good' } },
  fcp_ni: { sum: { field: 'fcp_ni' } },
  fcp_poor: { sum: { field: 'fcp_poor' } },
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
  lcp_element: { terms: { field: 'lcp_element', size: 1, exclude: '' } },
  inp_target: { terms: { field: 'inp_target', size: 1, exclude: '' } },
  cls_source: { terms: { field: 'cls_source', size: 1, exclude: '' } },
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
  lcp_element?: unknown;
  inp_target?: unknown;
  cls_source?: unknown;
}): RumPageRow => {
  const top = (agg: unknown): string | null => {
    const key = termsBuckets(agg)[0]?.key;
    return key != null && String(key).length > 0 ? String(key) : null;
  };
  return {
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
    attribution: {
      ...emptyVitalAttribution(),
      lcpElement: top(bucket.lcp_element),
      inpTarget: top(bucket.inp_target),
      clsSource: top(bucket.cls_source),
    },
    resources: [],
  };
};

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
      bounceRate: null,
      p75LoadMs: durationToMs(weightedValue(aggs.load_p75)),
      p75Inp: weightedValue(aggs.inp_p75),
    },
    vitals: {
      lcp: vitalFromDaily(
        weightedValue(aggs.lcp_p75),
        sumValue(aggs.lcp_samples),
        sumValue(aggs.lcp_good),
        sumValue(aggs.lcp_ni),
        sumValue(aggs.lcp_poor)
      ),
      inp: vitalFromDaily(
        weightedValue(aggs.inp_p75),
        sumValue(aggs.inp_samples),
        sumValue(aggs.inp_good),
        sumValue(aggs.inp_ni),
        sumValue(aggs.inp_poor)
      ),
      cls: vitalFromDaily(
        weightedValue(aggs.cls_p75),
        sumValue(aggs.cls_samples),
        sumValue(aggs.cls_good),
        sumValue(aggs.cls_ni),
        sumValue(aggs.cls_poor)
      ),
      fcp: vitalFromDaily(
        weightedValue(aggs.fcp_p75),
        sumValue(aggs.fcp_samples),
        sumValue(aggs.fcp_good),
        sumValue(aggs.fcp_ni),
        sumValue(aggs.fcp_poor)
      ),
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
  browser,
  usePages,
  useService,
  useBrowser,
  pagesWatermark,
  serviceWatermark,
  browserWatermark,
  uniqueFromRaw,
  includeBots,
  botUa,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  browser?: string;
  usePages: boolean;
  useService: boolean;
  useBrowser?: boolean;
  pagesWatermark?: string | null;
  serviceWatermark?: string | null;
  browserWatermark?: string | null;
  uniqueFromRaw?: boolean;
  includeBots?: string;
  botUa?: string;
}): Promise<RumOverviewResponse> => {
  const kpiFromBrowser = Boolean(useBrowser);
  const kpiFromPages = !kpiFromBrowser && (Boolean(pageUrl) || !useService);
  if (kpiFromPages && !usePages) {
    return emptyOverview();
  }
  if (kpiFromBrowser && !useBrowser) {
    return emptyOverview();
  }

  const kpiIndex = kpiFromBrowser
    ? RUM_BROWSER_DAILY_INDEX
    : kpiFromPages
    ? RUM_PAGES_DAILY_INDEX
    : RUM_SERVICE_DAILY_INDEX;
  const kpiWatermark = kpiFromBrowser
    ? browserWatermark
    : kpiFromPages
    ? pagesWatermark
    : serviceWatermark;
  const pageUrlForKpis = kpiFromPages ? pageUrl : undefined;
  const browserForKpis = kpiFromBrowser ? browser : undefined;
  const kpiFilters = dailyBaseFilters({
    rangeFrom,
    rangeTo,
    serviceName,
    pageUrl: pageUrlForKpis,
    browser: browserForKpis,
    watermark: kpiWatermark,
  });

  const fillTail = rangeIncludesOpenTail(rangeTo, kpiWatermark ?? '');
  const [kpiResult, pagesResult, tail, unique] = await Promise.all([
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
    fillTail
      ? queryRawOpenDayTail({
          client,
          rangeTo,
          serviceName,
          pageUrl: pageUrlForKpis,
          browser: browserForKpis,
          includeBots,
          botUa,
          pageSize: 8,
        })
      : Promise.resolve(emptyOpenDayTail()),
    uniqueFromRaw
      ? queryRawOverviewSlice({
          client,
          rangeFrom,
          rangeTo,
          serviceName,
          pageUrl: pageUrlForKpis,
          browser: browserForKpis,
          includeBots,
          botUa,
        })
      : Promise.resolve(null),
  ]);

  const topPages = pagesResult
    ? termsBuckets((pagesResult.aggregations as { pages?: unknown } | undefined)?.pages).map(
        (bucket) => pageRowFromBucket({ ...bucket, key: pagePathFromKey(bucket.key) })
      )
    : [];

  const dailyAggs = (kpiResult.aggregations ?? {}) as Record<string, unknown>;
  const mergedAggs = hasOpenDayActivity(tail)
    ? mergeOpenDayTailIntoAggs(dailyAggs, tail)
    : dailyAggs;
  const overview = overviewFromAggs(
    mergedAggs,
    mergePageRowsByPath(topPages, tail.pages).slice(0, 8)
  );
  const withTailTrend = hasOpenDayActivity(tail)
    ? {
        ...overview,
        trends: [
          ...overview.trends,
          {
            timestamp: dailyRangeGte('now'),
            sessions: tail.sessions,
            pageViews: tail.pageViews,
            errors: tail.errorCount,
          },
        ],
      }
    : overview;
  return unique ? applyRawOverviewSlice(withTailTrend, unique) : withTailTrend;
};

export const queryDailyPages = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  pageUrl,
  watermark,
  serviceWatermark,
  useService,
  includeBots,
  botUa,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  pageUrl?: string;
  watermark?: string | null;
  serviceWatermark?: string | null;
  useService?: boolean;
  includeBots?: string;
  botUa?: string;
}): Promise<RumPagesResponse> => {
  const fillTail = rangeIncludesOpenTail(rangeTo, watermark ?? '');
  const useServiceViews = Boolean(useService) && !pageUrl;
  const [result, tail, serviceResult, uniqueResult] = await Promise.all([
    client.search(
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
    ),
    fillTail
      ? queryRawOpenDayTail({
          client,
          rangeTo,
          serviceName,
          pageUrl,
          includeBots,
          botUa,
          pageSize: 80,
        })
      : Promise.resolve(emptyOpenDayTail()),
    useServiceViews
      ? client.search(
          {
            index: RUM_SERVICE_DAILY_INDEX,
            ignore_unavailable: true,
            allow_no_indices: true,
            size: 0,
            query: {
              bool: {
                filter: dailyBaseFilters({
                  rangeFrom,
                  rangeTo,
                  serviceName,
                  watermark: serviceWatermark,
                }),
              },
            },
            aggs: { page_views: { sum: { field: 'page_views' } } },
          },
          rumEsSearchOptions
        )
      : Promise.resolve(null),
    client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: {
          bool: {
            filter: rumBaseFilters({
              rangeFrom,
              rangeTo,
              serviceName,
              pageUrl,
              includeBots,
              botUa,
            }),
          },
        },
        aggs: { sessions: sessionCardinality },
      },
      rumEsSearchOptions
    ),
  ]);

  const pages = mergePageRowsByPath(
    termsBuckets((result.aggregations as { pages?: unknown } | undefined)?.pages).map((bucket) =>
      pageRowFromBucket({ ...bucket, key: pagePathFromKey(bucket.key) })
    ),
    tail.pages.map((page) => ({ ...page, path: pagePathFromKey(page.path) }))
  );
  const kpis = summarizePagesKpis(
    pages,
    cardValue((uniqueResult.aggregations as { sessions?: unknown } | undefined)?.sessions)
  );
  const servicePageViews = serviceResult
    ? sumValue((serviceResult.aggregations as { page_views?: unknown } | undefined)?.page_views)
    : 0;
  return {
    pages,
    kpis: {
      ...kpis,
      views: pagesViewsKpi({
        pageUrl,
        useService: Boolean(useService),
        servicePageViews,
        rowViews: kpis.views,
        tailPageViews: fillTail && hasOpenDayActivity(tail) ? tail.pageViews : 0,
      }),
    },
  };
};
