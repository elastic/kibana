/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VITAL_RANK_THRESHOLDS } from '../../common/rum_app';
import {
  RUM_BROWSER_DAILY_INDEX,
  RUM_BROWSER_DAILY_INDEX_PATTERN,
  RUM_BROWSER_DAILY_PIPELINE_NAME,
  RUM_DAILY_MANAGED_BY,
  RUM_DAILY_RETENTION,
  RUM_DAILY_SOURCE_LOOKBACK,
  RUM_DAILY_SPEC,
  RUM_DAILY_SYNC_DELAY,
  RUM_DAILY_VERSION,
  RUM_PAGES_DAILY_INDEX,
  RUM_PAGES_DAILY_INDEX_PATTERN,
  RUM_PAGES_DAILY_PIPELINE_NAME,
  RUM_PAGES_DAILY_SPEC,
  RUM_SERVICE_DAILY_INDEX,
  RUM_SERVICE_DAILY_INDEX_PATTERN,
  RUM_SERVICE_DAILY_PIPELINE_NAME,
} from '../../common/rum_daily';
import {
  RUM_CANONICAL_BROWSER_NAME_FIELD,
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_SESSION_ID_FIELD,
  RUM_CANONICAL_URL_PATH_GROUPED_FIELD,
} from '../../common/rum_sessions';
import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import { PAGE_PATH_SCRIPT } from '../routes/rum/query';

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

const vitalFilter = (name: keyof typeof VITAL_RANK_THRESHOLDS) => ({
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

const vitalValue = 'attributes.browser.web_vital.value';

const vitalRankFilters = (name: keyof typeof VITAL_RANK_THRESHOLDS) => {
  const { good, ni } = VITAL_RANK_THRESHOLDS[name];
  return {
    good: { filter: { range: { [vitalValue]: { lte: good } } } },
    ni: { filter: { range: { [vitalValue]: { gt: good, lte: ni } } } },
    poor: { filter: { range: { [vitalValue]: { gt: ni } } } },
  };
};

const vitalElementField: Partial<Record<keyof typeof VITAL_RANK_THRESHOLDS, string>> = {
  lcp: 'attributes.browser.web_vital.lcp.element',
  inp: 'attributes.browser.web_vital.inp.target',
  cls: 'attributes.browser.web_vital.cls.source',
};

const vitalAgg = (name: keyof typeof VITAL_RANK_THRESHOLDS) => {
  const elementField = vitalElementField[name];
  return {
    filter: vitalFilter(name),
    aggs: {
      p75: { percentiles: { field: vitalValue, percents: [75] } },
      samples: { value_count: { field: vitalValue } },
      ...vitalRankFilters(name),
      ...(elementField
        ? { element: { terms: { field: elementField, size: 1, exclude: '' } } }
        : {}),
    },
  };
};

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
      samples: { value_count: { field: '@timestamp' } },
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
  lcp_good: { type: 'long' },
  lcp_ni: { type: 'long' },
  lcp_poor: { type: 'long' },
  lcp_element: { type: 'keyword' },
  inp_target: { type: 'keyword' },
  cls_source: { type: 'keyword' },
  inp_p75: { type: 'double' },
  inp_samples: { type: 'long' },
  inp_good: { type: 'long' },
  inp_ni: { type: 'long' },
  inp_poor: { type: 'long' },
  cls_p75: { type: 'double' },
  cls_samples: { type: 'long' },
  cls_good: { type: 'long' },
  cls_ni: { type: 'long' },
  cls_poor: { type: 'long' },
  fcp_p75: { type: 'double' },
  fcp_samples: { type: 'long' },
  fcp_good: { type: 'long' },
  fcp_ni: { type: 'long' },
  fcp_poor: { type: 'long' },
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
    browser: {
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
  _meta: { managed_by: RUM_DAILY_MANAGED_BY, version: RUM_DAILY_VERSION, spec: RUM_DAILY_SPEC },
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
            if (v == null || v instanceof Number) { return v; }
            if (v instanceof Map) {
              def values = v.values;
              if (values instanceof Map) {
                if (values['75.0'] != null) { return values['75.0']; }
                if (values['75'] != null) { return values['75']; }
              }
              if (v['75.0'] != null) { return v['75.0']; }
              if (v['75'] != null) { return v['75']; }
              return null;
            }
            return null;
          }
          def sessionsOf(def v) {
            if (v instanceof Number) { return v; }
            if (v instanceof Map) {
              def inner = v.sessions;
              if (inner instanceof Number) { return inner; }
              if (inner instanceof Map && inner.value != null) { return inner.value; }
              if (v.value != null) { return v.value; }
              if (v.doc_count != null) { return v.doc_count; }
              return null;
            }
            return null;
          }
          // Transform filter+sub-aggs: { p75, samples: N }, no doc_count.
          def samplesOf(def bucket) {
            if ((bucket instanceof Map) == false) { return null; }
            def samples = valueOf(bucket.samples);
            if (samples != null) { return samples; }
            return bucket.doc_count;
          }
          def topKey(def v) {
            if ((v instanceof Map) == false) { return null; }
            if (v.buckets instanceof List && v.buckets.length > 0) {
              def k = v.buckets[0].key;
              return k == null || k.toString() == '' ? null : k.toString();
            }
            // Transform dest writes terms as { "key": count }, not { buckets: [...] }.
            def best = null;
            def bestN = -1;
            for (e in v.entrySet()) {
              def key = e.getKey();
              if (key == 'buckets' || key == 'doc_count_error_upper_bound' || key == 'sum_other_doc_count') {
                continue;
              }
              def n = e.getValue();
              def count = n instanceof Number ? ((Number) n).longValue() : -1;
              if (count > bestN && key != null && key.toString() != '') {
                bestN = count;
                best = key.toString();
              }
            }
            return best;
          }
          ctx.page_views = countOf(ctx.page_views);
          ctx.sessions = valueOf(ctx.sessions);
          ctx.error_count = countOf(ctx.error_count);
          ctx.error_sessions = sessionsOf(ctx.error_sessions);
          if (ctx.lcp instanceof Map) {
            ctx.lcp_p75 = p75Of(ctx.lcp.p75);
            ctx.lcp_samples = samplesOf(ctx.lcp);
            ctx.lcp_good = countOf(ctx.lcp.good);
            ctx.lcp_ni = countOf(ctx.lcp.ni);
            ctx.lcp_poor = countOf(ctx.lcp.poor);
            ctx.lcp_element = topKey(ctx.lcp.element);
          }
          if (ctx.inp instanceof Map) {
            ctx.inp_p75 = p75Of(ctx.inp.p75);
            ctx.inp_samples = samplesOf(ctx.inp);
            ctx.inp_good = countOf(ctx.inp.good);
            ctx.inp_ni = countOf(ctx.inp.ni);
            ctx.inp_poor = countOf(ctx.inp.poor);
            ctx.inp_target = topKey(ctx.inp.element);
          }
          if (ctx.cls instanceof Map) {
            ctx.cls_p75 = p75Of(ctx.cls.p75);
            ctx.cls_samples = samplesOf(ctx.cls);
            ctx.cls_good = countOf(ctx.cls.good);
            ctx.cls_ni = countOf(ctx.cls.ni);
            ctx.cls_poor = countOf(ctx.cls.poor);
            ctx.cls_source = topKey(ctx.cls.element);
          }
          if (ctx.fcp instanceof Map) {
            ctx.fcp_p75 = p75Of(ctx.fcp.p75);
            ctx.fcp_samples = samplesOf(ctx.fcp);
            ctx.fcp_good = countOf(ctx.fcp.good);
            ctx.fcp_ni = countOf(ctx.fcp.ni);
            ctx.fcp_poor = countOf(ctx.fcp.poor);
          }
          def load = ctx.load;
          if (load instanceof Map) {
            def p75 = p75Of(load.p75_ns);
            if (p75 == null) { p75 = p75Of(load.p75_us); }
            ctx.load_p75 = p75;
            def avg = valueOf(load.avg_ns);
            if (avg == null) { avg = valueOf(load.avg_us); }
            ctx.load_avg = avg;
            ctx.load_samples = samplesOf(load);
          }
          ctx.rage_clicks = countOf(ctx.rage_clicks);
          ctx.dead_clicks = countOf(ctx.dead_clicks);
          ctx.error_clicks = countOf(ctx.error_clicks);
          ctx.rage_sessions = sessionsOf(ctx.rage_sessions);
          ctx.dead_sessions = sessionsOf(ctx.dead_sessions);
          ctx.lcp_p75 = p75Of(ctx.lcp_p75);
          ctx.inp_p75 = p75Of(ctx.inp_p75);
          ctx.cls_p75 = p75Of(ctx.cls_p75);
          ctx.fcp_p75 = p75Of(ctx.fcp_p75);
          ctx.load_p75 = p75Of(ctx.load_p75);
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
  _meta: { managed_by: RUM_DAILY_MANAGED_BY, version: RUM_DAILY_VERSION, spec: RUM_DAILY_SPEC },
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

export const rumBrowserDailyIndexTemplate = dailyIndexTemplate(
  RUM_BROWSER_DAILY_INDEX_PATTERN,
  RUM_BROWSER_DAILY_PIPELINE_NAME
);

/** Page-shaped events only — do not pull resource spans that merely have url.full. */
const PAGE_EVENT_FILTER = {
  bool: {
    should: [
      PAGE_VIEW_FILTER,
      WEB_VITAL_FILTER,
      {
        bool: {
          filter: [
            EXCEPTION_FILTER,
            {
              bool: {
                should: [
                  { exists: { field: RUM_CANONICAL_URL_PATH_GROUPED_FIELD } },
                  { exists: { field: 'attributes.url.full' } },
                  { exists: { field: 'attributes.page.url' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      frustrationFilter('rage_click'),
      frustrationFilter('dead_click'),
      frustrationFilter('error_click'),
    ],
    minimum_should_match: 1,
  },
};

const sourceQuery = (extraFilters: object[] = []) => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: RUM_DAILY_SOURCE_LOOKBACK } } },
      { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } },
      ...extraFilters,
    ],
  },
});

// Disables the match-all composite skip on logsdb index sort (order is not a transform field).
const dateHistogramGroup = {
  date_histogram: {
    field: '@timestamp',
    calendar_interval: '1d' as const,
    missing_bucket: true,
  },
};

const serviceNameGroup = {
  terms: { field: RUM_CANONICAL_SERVICE_NAME_FIELD },
};

export const buildRumPagesDailyTransformBody = (syncDelay = RUM_DAILY_SYNC_DELAY) => ({
  source: {
    index: [RUM_SESSION_SOURCE_INDEX],
    query: sourceQuery([PAGE_EVENT_FILTER]),
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
    spec: RUM_PAGES_DAILY_SPEC,
  },
  pivot: {
    group_by: {
      '@timestamp': dateHistogramGroup,
      'service.name': serviceNameGroup,
      'url.path.grouped': {
        terms: {
          script: { source: PAGE_PATH_SCRIPT, lang: 'painless' },
          missing_bucket: true,
        },
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
    spec: RUM_DAILY_SPEC,
  },
  pivot: {
    group_by: {
      '@timestamp': dateHistogramGroup,
      'service.name': serviceNameGroup,
    },
    aggregations: dailyAggregations,
  },
});

export const buildRumBrowserDailyTransformBody = (syncDelay = RUM_DAILY_SYNC_DELAY) => ({
  source: {
    index: [RUM_SESSION_SOURCE_INDEX],
    query: sourceQuery([{ exists: { field: RUM_CANONICAL_BROWSER_NAME_FIELD } }]),
  },
  dest: {
    index: RUM_BROWSER_DAILY_INDEX,
    pipeline: RUM_BROWSER_DAILY_PIPELINE_NAME,
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
    spec: RUM_DAILY_SPEC,
  },
  pivot: {
    group_by: {
      '@timestamp': dateHistogramGroup,
      'service.name': serviceNameGroup,
      'browser.name': {
        terms: { field: RUM_CANONICAL_BROWSER_NAME_FIELD },
      },
    },
    aggregations: dailyAggregations,
  },
});

export const rumPagesDailyTransformBody = buildRumPagesDailyTransformBody();
export const rumServiceDailyTransformBody = buildRumServiceDailyTransformBody();
export const rumBrowserDailyTransformBody = buildRumBrowserDailyTransformBody();
