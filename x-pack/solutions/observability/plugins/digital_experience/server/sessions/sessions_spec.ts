/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPutPipelineRequest,
  IndicesPutIndexTemplateRequest,
  QueryDslQueryContainer,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { BROWSER_SDK_LANGUAGE } from '../../common/otel_data';
import {
  SESSIONS_DEFAULT_FREQUENCY,
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_JOURNEY_SIZE,
  SESSIONS_JOURNEY_URL_CANDIDATES,
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_MAX_PAGE_SEARCH_SIZE,
  SESSIONS_MANAGED_BY,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_SYNC_DELAY,
  SESSIONS_VERSION,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  WEB_VITAL_NAMES,
  sessionsTransformId,
  type WebVitalName,
} from '../../common/sessions';
import { partitionFilters, type SessionsPartition } from './partitions';

// `managed` makes the Transforms and Index Management UIs warn before editing or deleting these.
const SESSIONS_META = { managed: true, managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION };

const anyOf = (...clauses: QueryDslQueryContainer[]): QueryDslQueryContainer => ({
  bool: { should: clauses, minimum_should_match: 1 },
});

const eventNamed = (...names: string[]): QueryDslQueryContainer =>
  anyOf(...names.flatMap((name) => [{ term: { event_name: name } }, { term: { name } }]));

export const PAGE_VIEW_FILTER = eventNamed('documentLoad', 'browser.navigation');
export const CLICK_FILTER = eventNamed('click', 'browser.user_action.click');
export const ERROR_FILTER = anyOf(eventNamed('exception'), {
  term: { 'attributes.event.outcome': 'failure' },
});
export const WEB_VITAL_FILTER = eventNamed('browser.web_vital');

export const WEB_VITAL_NAME_FIELD = 'attributes.browser.web_vital.name';
export const WEB_VITAL_VALUE_FIELD = 'attributes.browser.web_vital.value';

/**
 * Candidate source fields per summarized attribute, in priority order. The dest
 * pipeline keeps the first non-empty value, so the same attribute can come from
 * the event or resource scope.
 */
export const SESSION_ATTRIBUTE_FIELDS = {
  user: [
    'attributes.user.email',
    'resource.attributes.user.email',
    'attributes.user.id',
    'resource.attributes.user.id',
    'attributes.user.name',
    'resource.attributes.user.name',
  ],
  browser: [
    'resource.attributes.browser.name',
    'attributes.browser.name',
    'resource.attributes.user_agent.name',
    'attributes.user_agent.name',
  ],
  browserVersion: [
    'resource.attributes.browser.version',
    'attributes.browser.version',
    'resource.attributes.user_agent.version',
    'attributes.user_agent.version',
  ],
  os: [
    'resource.attributes.os.name',
    'attributes.os.name',
    'resource.attributes.browser.platform',
    'attributes.browser.platform',
  ],
  device: [
    'resource.attributes.device.model.name',
    'attributes.device.model.name',
    'resource.attributes.device.type',
  ],
  countryIso: [
    'attributes.client.geo.country_iso_code',
    'resource.attributes.client.geo.country_iso_code',
  ],
  region: ['attributes.client.geo.region_name', 'resource.attributes.client.geo.region_name'],
  city: ['attributes.client.geo.city_name', 'resource.attributes.client.geo.city_name'],
} as const;

type SessionAttribute = keyof typeof SESSION_ATTRIBUTE_FIELDS;

const fieldsOf = (...attributes: SessionAttribute[]): readonly string[] =>
  attributes.flatMap((attribute) => SESSION_ATTRIBUTE_FIELDS[attribute]);

/**
 * Attributes read from the same event. Each group takes its latest event that has any of its
 * fields, so user agent and geo still resolve when different events carry them.
 */
export const SESSION_ATTRIBUTE_GROUPS = {
  user_seen: fieldsOf('user'),
  user_agent_seen: fieldsOf('browser', 'browserVersion', 'os', 'device'),
  geo_seen: fieldsOf('countryIso', 'region', 'city'),
} as const;

const existsAny = (fields: readonly string[]): QueryDslQueryContainer =>
  anyOf(...fields.map((field) => ({ exists: { field } })));

/** Latest values of `fields` among events that carry at least one of them. */
const latestOf = (fields: readonly string[]) => ({
  filter: existsAny(fields),
  aggs: {
    latest: {
      top_metrics: {
        metrics: fields.map((field) => ({ field })),
        sort: { '@timestamp': 'desc' as const },
        size: 1,
      },
    },
  },
});

/**
 * Distinct page-view URLs with their first and last view time. `url.full` is mapped as
 * `wildcard` in the OTel templates, which `top_metrics` cannot collect, and `scripted_metric`
 * is not available on serverless, so the journey is built from `terms` buckets instead.
 */
const pageUrls = (size: number, order: { first: 'asc' } | { last: 'desc' }) => ({
  filter: PAGE_VIEW_FILTER,
  aggs: {
    urls: {
      terms: { field: SOURCE_URL_FIELD, size, order },
      aggs: {
        first: { min: { field: '@timestamp' } },
        last: { max: { field: '@timestamp' } },
      },
    },
  },
});

// Names match in any case: semconv writes `cls`, the web-vitals library `CLS`.
const webVitalAgg = (name: WebVitalName) => ({
  filter: {
    bool: {
      filter: [
        WEB_VITAL_FILTER,
        { term: { [WEB_VITAL_NAME_FIELD]: { value: name, case_insensitive: true } } },
      ],
    },
  },
  aggs: {
    p75: { percentiles: { field: WEB_VITAL_VALUE_FIELD, percents: [75] } },
  },
});

export const sessionsIndexMappings = {
  dynamic: false,
  properties: {
    session: { properties: { id: { type: 'keyword' } } },
    service: { properties: { name: { type: 'keyword' } } },
    start_time: { type: 'date' },
    end_time: { type: 'date' },
    duration_ms: { type: 'long' },
    event_count: { type: 'long' },
    page_view_count: { type: 'long' },
    click_count: { type: 'long' },
    error_count: { type: 'long' },
    bounced: { type: 'boolean' },
    has_error: { type: 'boolean' },
    entry_page: { type: 'keyword' },
    exit_page: { type: 'keyword' },
    journey: { type: 'keyword' },
    error: { properties: { message: { type: 'keyword', ignore_above: 1024 } } },
    user: { properties: { key: { type: 'keyword' } } },
    user_agent: {
      properties: {
        browser: { type: 'keyword' },
        browser_version: { type: 'keyword' },
        os: { type: 'keyword' },
        device: { type: 'keyword' },
      },
    },
    geo: {
      properties: {
        country_iso: { type: 'keyword' },
        region: { type: 'keyword' },
        city: { type: 'keyword' },
      },
    },
    web_vitals: {
      properties: Object.fromEntries(
        WEB_VITAL_NAMES.map((name) => [name, { type: 'double' as const }])
      ),
    },
  },
} as const;

export const sessionsIndexTemplate: IndicesPutIndexTemplateRequest = {
  name: SESSIONS_INDEX_TEMPLATE_NAME,
  index_patterns: [SESSIONS_INDEX_PATTERN],
  priority: 200,
  _meta: SESSIONS_META,
  template: {
    settings: {
      'index.sort.field': ['start_time', 'session.id'],
      'index.sort.order': ['desc', 'asc'],
    },
    mappings: sessionsIndexMappings,
  },
};

/** Flattens the pivot output into the session document stored in the dest index. */
export const sessionsDestPipeline: IngestPutPipelineRequest = {
  id: SESSIONS_PIPELINE_NAME,
  description: 'Flattens Digital Experience session transform output.',
  _meta: SESSIONS_META,
  processors: [
    {
      script: {
        lang: 'painless',
        params: {
          fields: SESSION_ATTRIBUTE_FIELDS,
          vitals: [...WEB_VITAL_NAMES],
          journeySize: SESSIONS_JOURNEY_SIZE,
        },
        source: `
          long countOf(def v) {
            if (v instanceof Map) { v = v.doc_count; }
            return v instanceof Number ? ((Number) v).longValue() : 0L;
          }
          long millisOf(def v) {
            if (v instanceof Number) { return ((Number) v).longValue(); }
            if (v instanceof String) { return ZonedDateTime.parse(v).toInstant().toEpochMilli(); }
            return -1L;
          }
          String clean(def v) {
            if (v == null) { return null; }
            String s = v.toString().trim();
            return s == '' || s == 'null' ? null : s;
          }
          String firstOf(def bag, def fields) {
            if ((bag instanceof Map) == false) { return null; }
            for (field in fields) {
              String value = clean(bag[field]);
              if (value != null) { return value; }
            }
            return null;
          }
          def metricsOf(def agg) {
            def latest = agg instanceof Map ? agg.latest : null;
            if ((latest instanceof Map) == false) { return []; }
            def out = [];
            if (latest.top instanceof List) {
              for (hit in latest.top) {
                if (hit instanceof Map && hit.metrics instanceof Map) { out.add(hit.metrics); }
              }
            }
            if (out.isEmpty()) { out.add(latest); }
            return out;
          }
          def firstMetrics(def agg) {
            def all = metricsOf(agg);
            return all.isEmpty() ? null : all[0];
          }
          def p75Of(def agg) {
            def p75 = agg instanceof Map ? agg.p75 : null;
            if (p75 instanceof Number) { return p75; }
            if ((p75 instanceof Map) == false) { return null; }
            def values = p75.values instanceof Map ? p75.values : p75;
            def value = values['75.0'] != null ? values['75.0'] : values['75'];
            return value instanceof Number ? value : null;
          }
          String pathOf(def raw) {
            String s = clean(raw);
            if (s == null) { return null; }
            int hash = s.indexOf('#');
            if (hash >= 0) {
              String route = s.substring(hash + 1);
              if (route.startsWith('/')) {
                int routeQuery = route.indexOf('?');
                return routeQuery >= 0 ? route.substring(0, routeQuery) : route;
              }
              s = s.substring(0, hash);
            }
            int query = s.indexOf('?');
            if (query >= 0) { s = s.substring(0, query); }
            int scheme = s.indexOf('://');
            if (scheme >= 0) {
              int slash = s.indexOf('/', scheme + 3);
              s = slash >= 0 ? s.substring(slash) : '/';
            }
            return s == '' ? '/' : s;
          }

          def viewsOf(def agg) {
            def views = [];
            def urls = agg instanceof Map ? agg.urls : null;
            if (urls instanceof Map) {
              for (entry in urls.entrySet()) {
                def times = entry.getValue();
                if (times instanceof Map) {
                  views.add(['url': entry.getKey(), 'first': millisOf(times.first), 'last': millisOf(times.last)]);
                }
              }
            }
            return views;
          }

          def fields = params.fields;
          long start = millisOf(ctx.start_time);
          long end = millisOf(ctx.end_time);
          ctx.duration_ms = start >= 0 && end >= start ? end - start : 0L;
          ctx.page_view_count = countOf(ctx.page_view_count);
          ctx.click_count = countOf(ctx.click_count);
          ctx.error_count = countOf(ctx.error_count);
          ctx.has_error = ctx.error_count > 0;
          ctx.bounced = ctx.page_view_count <= 1;

          // Pages in first-view order, from the earliest page-view URLs only, so a page that
          // is missing from them is never skipped over by a later one.
          def views = viewsOf(ctx.pages);
          views.sort((a, b) -> Long.compare((long) a.first, (long) b.first));
          def journey = [];
          for (view in views) {
            String page = pathOf(view.url);
            if (page != null && journey.size() < params.journeySize && journey.contains(page) == false) {
              journey.add(page);
            }
          }
          // The exit page is the one viewed last, journey or not.
          String exitPage = null;
          for (view in viewsOf(ctx.exit)) {
            exitPage = pathOf(view.url);
          }
          ctx.journey = journey;
          ctx.entry_page = journey.isEmpty() ? exitPage : journey[0];
          ctx.exit_page = exitPage != null ? exitPage : (journey.isEmpty() ? null : journey[journey.size() - 1]);

          def userBag = firstMetrics(ctx.user_seen);
          def userAgentBag = firstMetrics(ctx.user_agent_seen);
          def geoBag = firstMetrics(ctx.geo_seen);
          ctx.user = ['key': firstOf(userBag, fields.user)];
          ctx.user_agent = [
            'browser': firstOf(userAgentBag, fields.browser),
            'browser_version': firstOf(userAgentBag, fields.browserVersion),
            'os': firstOf(userAgentBag, fields.os),
            'device': firstOf(userAgentBag, fields.device)
          ];
          ctx.geo = [
            'country_iso': firstOf(geoBag, fields.countryIso),
            'region': firstOf(geoBag, fields.region),
            'city': firstOf(geoBag, fields.city)
          ];

          def vitals = new HashMap();
          for (name in params.vitals) {
            vitals[name] = p75Of(ctx[name]);
            ctx.remove(name);
          }
          ctx.web_vitals = vitals;

          ctx.remove('pages');
          ctx.remove('exit');
          ctx.remove('user_seen');
          ctx.remove('user_agent_seen');
          ctx.remove('geo_seen');
        `,
      },
    },
  ],
  // Index the session with the failure instead of failing the transform's bulk request. The raw
  // aggregation objects are dropped, as the counts would not fit their `long` mappings.
  on_failure: [
    { set: { field: 'error.message', value: '{{{ _ingest.on_failure_message }}}' } },
    {
      remove: {
        field: [
          'page_view_count',
          'click_count',
          'error_count',
          'pages',
          'exit',
          ...Object.keys(SESSION_ATTRIBUTE_GROUPS),
          ...WEB_VITAL_NAMES,
        ],
        ignore_missing: true,
      },
    },
  ],
};

export const buildSessionsTransform = ({
  frequency = SESSIONS_DEFAULT_FREQUENCY,
  partition = { index: 0, count: 1 },
}: { frequency?: string; partition?: SessionsPartition } = {}): TransformPutTransformRequest => ({
  transform_id: sessionsTransformId(partition.index, partition.count),
  description:
    partition.count > 1
      ? `Summarizes Digital Experience sessions by service.name and session.id (partition ${
          partition.index + 1
        } of ${partition.count}).`
      : 'Summarizes Digital Experience sessions by service.name and session.id.',
  source: {
    index: [...SESSIONS_SOURCE_INDICES],
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: `now-${SESSIONS_LOOKBACK_DAYS}d/d` } } },
          // Browser SDKs only, like the applications list: backends can propagate `session.id`.
          { term: { [TELEMETRY_SDK_LANGUAGE]: BROWSER_SDK_LANGUAGE } },
          { exists: { field: SOURCE_SESSION_ID_FIELD } },
          { exists: { field: SOURCE_SERVICE_NAME_FIELD } },
          ...partitionFilters(partition),
        ],
        // `exists` matches empty strings, which would merge unrelated events into one session.
        must_not: [
          { term: { [SOURCE_SESSION_ID_FIELD]: '' } },
          { term: { [SOURCE_SERVICE_NAME_FIELD]: '' } },
        ],
      },
    },
  },
  dest: { index: SESSIONS_INDEX, pipeline: SESSIONS_PIPELINE_NAME },
  frequency,
  sync: { time: { field: '@timestamp', delay: SESSIONS_SYNC_DELAY } },
  // Every partition prunes the shared dest index, so cleanup doesn't depend on any one slice
  // getting traffic; deleting the same expired documents twice is harmless.
  retention_policy: {
    time: { field: 'end_time', max_age: `${SESSIONS_LOOKBACK_DAYS + 1}d` },
  },
  settings: { unattended: true, max_page_search_size: SESSIONS_MAX_PAGE_SEARCH_SIZE },
  _meta: { ...SESSIONS_META, partition: partition.index, partitions: partition.count },
  pivot: {
    group_by: {
      'service.name': { terms: { field: SOURCE_SERVICE_NAME_FIELD } },
      'session.id': { terms: { field: SOURCE_SESSION_ID_FIELD } },
    },
    aggregations: {
      start_time: { min: { field: '@timestamp' } },
      end_time: { max: { field: '@timestamp' } },
      event_count: { value_count: { field: '@timestamp' } },
      page_view_count: { filter: PAGE_VIEW_FILTER },
      click_count: { filter: CLICK_FILTER },
      error_count: { filter: ERROR_FILTER },
      pages: pageUrls(SESSIONS_JOURNEY_URL_CANDIDATES, { first: 'asc' }),
      exit: pageUrls(1, { last: 'desc' }),
      ...Object.fromEntries(
        Object.entries(SESSION_ATTRIBUTE_GROUPS).map(([name, fields]) => [name, latestOf(fields)])
      ),
      ...Object.fromEntries(WEB_VITAL_NAMES.map((name) => [name, webVitalAgg(name)])),
    },
  },
});
