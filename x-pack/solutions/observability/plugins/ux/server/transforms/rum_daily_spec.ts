/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RUM_DAILY_MANAGED_BY,
  RUM_DAILY_RETENTION,
  RUM_DAILY_SOURCE_LOOKBACK,
  RUM_DAILY_SYNC_DELAY,
  RUM_DAILY_VERSION,
  RUM_PAGES_DAILY_INDEX,
  RUM_PAGES_DAILY_INDEX_PATTERN,
  RUM_PAGES_DAILY_PIPELINE_NAME,
  RUM_SERVICE_DAILY_INDEX,
  RUM_SERVICE_DAILY_INDEX_PATTERN,
  RUM_SERVICE_DAILY_PIPELINE_NAME,
} from '../../common/rum_daily';
import {
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_SESSION_ID_FIELD,
  RUM_CANONICAL_URL_PATH_GROUPED_FIELD,
} from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';

const EXCEPTION_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'exception' } },
      { term: { name: 'exception' } },
      { term: { 'attributes.event.outcome': 'failure' } },
      { term: { 'attributes.log.level': 'ERROR' } },
    ],
    minimum_should_match: 1,
  },
};

const PAGE_VIEW_FILTER = {
  bool: {
    should: [
      { term: { name: 'documentLoad' } },
      { term: { event_name: 'browser.navigation' } },
      { term: { name: 'browser.navigation' } },
    ],
    minimum_should_match: 1,
  },
};

const DOCUMENT_LOAD_FILTER = { term: { name: 'documentLoad' } };

const WEB_VITAL_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'browser.web_vital' } },
      { term: { name: 'browser.web_vital' } },
    ],
    minimum_should_match: 1,
  },
};

const vitalFilter = (name: 'lcp' | 'inp' | 'cls' | 'fcp') => ({
  bool: {
    filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
  },
});

const frustrationFilter = (kind: 'rage_click' | 'dead_click' | 'error_click') => ({
  bool: {
    should: [
      { term: { event_name: `browser.frustration.${kind}` } },
      { term: { name: `browser.frustration.${kind}` } },
    ],
    minimum_should_match: 1,
  },
});

const sessionCardinality = {
  cardinality: { field: RUM_CANONICAL_SESSION_ID_FIELD },
};

const vitalAgg = (name: 'lcp' | 'inp' | 'cls' | 'fcp') => ({
  filter: vitalFilter(name),
  aggs: {
    p75: { percentiles: { field: 'attributes.browser.web_vital.value', percents: [75] } },
    samples: { value_count: { field: 'attributes.browser.web_vital.value' } },
  },
});

const dailyAggregations = {
  page_views: { filter: PAGE_VIEW_FILTER },
  sessions: sessionCardinality,
  error_count: { filter: EXCEPTION_FILTER },
  error_sessions: {
    filter: EXCEPTION_FILTER,
    aggs: { sessions: sessionCardinality },
  },
  lcp: vitalAgg('lcp'),
  inp: vitalAgg('inp'),
  cls: vitalAgg('cls'),
  fcp: vitalAgg('fcp'),
  load: {
    filter: DOCUMENT_LOAD_FILTER,
    aggs: {
      p75_ns: { percentiles: { field: 'duration', percents: [75] } },
      p75_us: { percentiles: { field: 'attributes.transaction.duration.us', percents: [75] } },
      avg_ns: { avg: { field: 'duration' } },
      avg_us: { avg: { field: 'attributes.transaction.duration.us' } },
    },
  },
  rage_clicks: { filter: frustrationFilter('rage_click') },
  dead_clicks: { filter: frustrationFilter('dead_click') },
  error_clicks: { filter: frustrationFilter('error_click') },
  rage_sessions: {
    filter: frustrationFilter('rage_click'),
    aggs: { sessions: sessionCardinality },
  },
  dead_sessions: {
    filter: frustrationFilter('dead_click'),
    aggs: { sessions: sessionCardinality },
  },
};

const dailyMetricMappings = {
  page_views: { type: 'long' },
  sessions: { type: 'long' },
  error_count: { type: 'long' },
  error_sessions: { type: 'long' },
  lcp_p75: { type: 'double' },
  lcp_samples: { type: 'long' },
  inp_p75: { type: 'double' },
  inp_samples: { type: 'long' },
  cls_p75: { type: 'double' },
  cls_samples: { type: 'long' },
  fcp_p75: { type: 'double' },
  fcp_samples: { type: 'long' },
  load_p75: { type: 'double' },
  load_avg: { type: 'double' },
  load_samples: { type: 'long' },
  rage_clicks: { type: 'long' },
  dead_clicks: { type: 'long' },
  error_clicks: { type: 'long' },
  rage_sessions: { type: 'long' },
  dead_sessions: { type: 'long' },
} as const;

export const rumDailyIndexMappings = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    service: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    url: {
      properties: {
        path: {
          properties: {
            grouped: { type: 'keyword' },
          },
        },
      },
    },
    ...dailyMetricMappings,
  },
} as const;

/** Flatten filter / cardinality / percentile maps into numeric dest fields. */
export const rumDailyDestPipeline = {
  description: 'Flatten ux-rum daily transform output.',
  _meta: { managed_by: RUM_DAILY_MANAGED_BY, version: RUM_DAILY_VERSION },
  processors: [
    {
      script: {
        lang: 'painless',
        source: `
          def countOf(def v) {
            if (v instanceof Map && v.doc_count != null) { return v.doc_count; }
            return v;
          }
          def valueOf(def v) {
            if (v instanceof Map && v.value != null) { return v.value; }
            return v;
          }
          def p75Of(def v) {
            if (v instanceof Map) {
              def values = v.values;
              if (values instanceof Map && values['75.0'] != null) { return values['75.0']; }
              if (v['75.0'] != null) { return v['75.0']; }
            }
            return v;
          }
          def sessionsOf(def v) {
            if (v instanceof Map) {
              def inner = v.sessions;
              if (inner instanceof Map && inner.value != null) { return inner.value; }
              if (v.doc_count != null) { return v.doc_count; }
            }
            return v;
          }
          ctx.page_views = countOf(ctx.page_views);
          ctx.sessions = valueOf(ctx.sessions);
          ctx.error_count = countOf(ctx.error_count);
          ctx.error_sessions = sessionsOf(ctx.error_sessions);
          if (ctx.lcp instanceof Map) {
            ctx.lcp_p75 = p75Of(ctx.lcp.p75);
            def lcpSamples = ctx.lcp.samples;
            ctx.lcp_samples = lcpSamples instanceof Map && lcpSamples.value != null ? lcpSamples.value : ctx.lcp.doc_count;
          }
          if (ctx.inp instanceof Map) {
            ctx.inp_p75 = p75Of(ctx.inp.p75);
            def inpSamples = ctx.inp.samples;
            ctx.inp_samples = inpSamples instanceof Map && inpSamples.value != null ? inpSamples.value : ctx.inp.doc_count;
          }
          if (ctx.cls instanceof Map) {
            ctx.cls_p75 = p75Of(ctx.cls.p75);
            def clsSamples = ctx.cls.samples;
            ctx.cls_samples = clsSamples instanceof Map && clsSamples.value != null ? clsSamples.value : ctx.cls.doc_count;
          }
          if (ctx.fcp instanceof Map) {
            ctx.fcp_p75 = p75Of(ctx.fcp.p75);
            def fcpSamples = ctx.fcp.samples;
            ctx.fcp_samples = fcpSamples instanceof Map && fcpSamples.value != null ? fcpSamples.value : ctx.fcp.doc_count;
          }
          def load = ctx.load;
          if (load instanceof Map) {
            def p75 = p75Of(load.p75_ns);
            if (p75 == null) { p75 = p75Of(load.p75_us); }
            ctx.load_p75 = p75;
            def avg = valueOf(load.avg_ns);
            if (avg == null) { avg = valueOf(load.avg_us); }
            ctx.load_avg = avg;
            ctx.load_samples = load.doc_count;
          }
          ctx.rage_clicks = countOf(ctx.rage_clicks);
          ctx.dead_clicks = countOf(ctx.dead_clicks);
          ctx.error_clicks = countOf(ctx.error_clicks);
          ctx.rage_sessions = sessionsOf(ctx.rage_sessions);
          ctx.dead_sessions = sessionsOf(ctx.dead_sessions);
          ctx.remove('lcp');
          ctx.remove('inp');
          ctx.remove('cls');
          ctx.remove('fcp');
          ctx.remove('load');
        `,
      },
    },
  ],
};

const dailyIndexTemplate = (indexPattern: string, pipeline: string) => ({
  index_patterns: [indexPattern],
  _meta: { managed_by: RUM_DAILY_MANAGED_BY, version: RUM_DAILY_VERSION },
  template: {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 1,
      'index.default_pipeline': pipeline,
    },
    mappings: rumDailyIndexMappings,
  },
});

export const rumPagesDailyIndexTemplate = dailyIndexTemplate(
  RUM_PAGES_DAILY_INDEX_PATTERN,
  RUM_PAGES_DAILY_PIPELINE_NAME
);

export const rumServiceDailyIndexTemplate = dailyIndexTemplate(
  RUM_SERVICE_DAILY_INDEX_PATTERN,
  RUM_SERVICE_DAILY_PIPELINE_NAME
);

const sourceQuery = (extraFilters: object[] = []) => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: RUM_DAILY_SOURCE_LOOKBACK } } },
      { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } },
      ...extraFilters,
    ],
  },
});

const dateHistogramGroup = {
  date_histogram: {
    field: '@timestamp',
    calendar_interval: '1d' as const,
  },
};

const serviceNameGroup = {
  terms: { field: RUM_CANONICAL_SERVICE_NAME_FIELD },
};

export const buildRumPagesDailyTransformBody = (syncDelay = RUM_DAILY_SYNC_DELAY) => ({
  source: {
    index: [RUM_SESSION_SOURCE_INDEX],
    query: sourceQuery([{ exists: { field: RUM_CANONICAL_URL_PATH_GROUPED_FIELD } }]),
  },
  dest: {
    index: RUM_PAGES_DAILY_INDEX,
    pipeline: RUM_PAGES_DAILY_PIPELINE_NAME,
  },
  frequency: '1h',
  sync: {
    time: {
      field: '@timestamp',
      delay: syncDelay,
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: RUM_DAILY_RETENTION,
    },
  },
  settings: {
    unattended: true,
    max_page_search_size: 1000,
  },
  _meta: {
    managed_by: RUM_DAILY_MANAGED_BY,
    version: RUM_DAILY_VERSION,
  },
  pivot: {
    group_by: {
      '@timestamp': dateHistogramGroup,
      'service.name': serviceNameGroup,
      'url.path.grouped': {
        terms: { field: RUM_CANONICAL_URL_PATH_GROUPED_FIELD },
      },
    },
    aggregations: dailyAggregations,
  },
});

export const buildRumServiceDailyTransformBody = (syncDelay = RUM_DAILY_SYNC_DELAY) => ({
  source: {
    index: [RUM_SESSION_SOURCE_INDEX],
    query: sourceQuery(),
  },
  dest: {
    index: RUM_SERVICE_DAILY_INDEX,
    pipeline: RUM_SERVICE_DAILY_PIPELINE_NAME,
  },
  frequency: '1h',
  sync: {
    time: {
      field: '@timestamp',
      delay: syncDelay,
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: RUM_DAILY_RETENTION,
    },
  },
  settings: {
    unattended: true,
    max_page_search_size: 1000,
  },
  _meta: {
    managed_by: RUM_DAILY_MANAGED_BY,
    version: RUM_DAILY_VERSION,
  },
  pivot: {
    group_by: {
      '@timestamp': dateHistogramGroup,
      'service.name': serviceNameGroup,
    },
    aggregations: dailyAggregations,
  },
});

export const rumPagesDailyTransformBody = buildRumPagesDailyTransformBody();
export const rumServiceDailyTransformBody = buildRumServiceDailyTransformBody();
