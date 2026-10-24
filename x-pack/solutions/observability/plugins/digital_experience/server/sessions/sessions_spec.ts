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
import {
  SESSIONS_FREQUENCY,
  SESSIONS_INDEX,
  SESSIONS_INDEX_PATTERN,
  SESSIONS_INDEX_TEMPLATE_NAME,
  SESSIONS_JOURNEY_SIZE,
  SESSIONS_LOOKBACK_DAYS,
  SESSIONS_MANAGED_BY,
  SESSIONS_PIPELINE_NAME,
  SESSIONS_SOURCE_INDICES,
  SESSIONS_SYNC_DELAY,
  SESSIONS_TRANSFORM_ID,
  SESSIONS_VERSION,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  WEB_VITAL_NAMES,
  type WebVitalName,
} from '../../common/sessions';

const SESSIONS_META = { managed_by: SESSIONS_MANAGED_BY, version: SESSIONS_VERSION };

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

const USER_FIELDS: readonly string[] = SESSION_ATTRIBUTE_FIELDS.user;
const CLIENT_FIELDS: readonly string[] = (
  Object.keys(SESSION_ATTRIBUTE_FIELDS) as SessionAttribute[]
)
  .filter((attribute) => attribute !== 'user')
  .flatMap((attribute) => SESSION_ATTRIBUTE_FIELDS[attribute]);

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

/** First `size` page URLs in time order. The exists filter avoids unmapped-field shard errors. */
const pageUrls = (order: 'asc' | 'desc', size: number) => ({
  filter: { bool: { filter: [PAGE_VIEW_FILTER, { exists: { field: SOURCE_URL_FIELD } }] } },
  aggs: {
    latest: {
      top_metrics: {
        metrics: { field: SOURCE_URL_FIELD },
        sort: { '@timestamp': order },
        size,
      },
    },
  },
});

const webVitalAgg = (name: WebVitalName) => ({
  filter: { bool: { filter: [WEB_VITAL_FILTER, { term: { [WEB_VITAL_NAME_FIELD]: name } }] } },
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
        params: { fields: SESSION_ATTRIBUTE_FIELDS, vitals: [...WEB_VITAL_NAMES] },
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

          def fields = params.fields;
          long start = millisOf(ctx.start_time);
          long end = millisOf(ctx.end_time);
          ctx.duration_ms = start >= 0 && end >= start ? end - start : 0L;
          ctx.page_view_count = countOf(ctx.page_view_count);
          ctx.click_count = countOf(ctx.click_count);
          ctx.error_count = countOf(ctx.error_count);
          ctx.has_error = ctx.error_count > 0;
          ctx.bounced = ctx.page_view_count <= 1;

          def journey = [];
          for (metrics in metricsOf(ctx.pages)) {
            String page = pathOf(metrics['${SOURCE_URL_FIELD}']);
            if (page != null && (journey.isEmpty() || journey[journey.size() - 1] != page)) {
              journey.add(page);
            }
          }
          String exitPage = null;
          for (metrics in metricsOf(ctx.exit)) {
            exitPage = pathOf(metrics['${SOURCE_URL_FIELD}']);
          }
          ctx.journey = journey;
          ctx.entry_page = journey.isEmpty() ? exitPage : journey[0];
          ctx.exit_page = exitPage != null ? exitPage : (journey.isEmpty() ? null : journey[journey.size() - 1]);

          def userBag = firstMetrics(ctx.user_seen);
          def clientBag = firstMetrics(ctx.client_seen);
          ctx.user = ['key': firstOf(userBag, fields.user)];
          ctx.user_agent = [
            'browser': firstOf(clientBag, fields.browser),
            'browser_version': firstOf(clientBag, fields.browserVersion),
            'os': firstOf(clientBag, fields.os),
            'device': firstOf(clientBag, fields.device)
          ];
          ctx.geo = [
            'country_iso': firstOf(clientBag, fields.countryIso),
            'region': firstOf(clientBag, fields.region),
            'city': firstOf(clientBag, fields.city)
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
          ctx.remove('client_seen');
        `,
      },
    },
  ],
};

export const buildSessionsTransform = (): TransformPutTransformRequest => ({
  transform_id: SESSIONS_TRANSFORM_ID,
  description: 'Summarizes Digital Experience sessions by service.name and session.id.',
  source: {
    index: [...SESSIONS_SOURCE_INDICES],
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: `now-${SESSIONS_LOOKBACK_DAYS}d/d` } } },
          { exists: { field: SOURCE_SESSION_ID_FIELD } },
          { exists: { field: SOURCE_SERVICE_NAME_FIELD } },
        ],
      },
    },
  },
  dest: { index: SESSIONS_INDEX, pipeline: SESSIONS_PIPELINE_NAME },
  frequency: SESSIONS_FREQUENCY,
  sync: { time: { field: '@timestamp', delay: SESSIONS_SYNC_DELAY } },
  retention_policy: {
    time: { field: 'end_time', max_age: `${SESSIONS_LOOKBACK_DAYS + 1}d` },
  },
  settings: { unattended: true, max_page_search_size: 1000 },
  _meta: SESSIONS_META,
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
      pages: pageUrls('asc', SESSIONS_JOURNEY_SIZE),
      exit: pageUrls('desc', 1),
      user_seen: latestOf(USER_FIELDS),
      client_seen: latestOf(CLIENT_FIELDS),
      ...Object.fromEntries(WEB_VITAL_NAMES.map((name) => [name, webVitalAgg(name)])),
    },
  },
});
