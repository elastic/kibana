/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import {
  RUM_CANONICAL_BROWSER_NAME_FIELD,
  RUM_CANONICAL_ERROR_GROUP_FIELD,
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_URL_PATH_GROUPED_FIELD,
  RUM_CLICK_TARGET_FIELD,
  RUM_HAS_REPLAY_FIELD,
  RUM_LAST_SEEN_TOP_SIZE,
  RUM_SEQUENCE_TOP_SIZE,
  RUM_SESSION_GROUP_FIELD,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_INDEX_PATTERN,
  RUM_SESSIONS_INDEX_SORT_FIELD,
  RUM_SESSIONS_INDEX_SORT_ORDER,
  RUM_SESSIONS_LOOKBACK_DAYS,
  RUM_SESSIONS_MANAGED_BY,
  RUM_SESSIONS_PIPELINE_NAME,
  RUM_SESSIONS_SPEC,
  RUM_SESSIONS_SYNC_DELAY,
  RUM_SESSIONS_TRANSFORM_ID,
  RUM_SESSIONS_VERSION,
  sessionsRetentionMaxAge,
  sessionsSourceLookback,
} from '../../common/rum_sessions';

export const SERVICE_NAME_SCRIPT = `
  if (doc.containsKey('resource.attributes.service.name') && doc['resource.attributes.service.name'].size() > 0) {
    return doc['resource.attributes.service.name'].value.toString();
  }
  if (doc.containsKey('attributes.service.name') && doc['attributes.service.name'].size() > 0) {
    return doc['attributes.service.name'].value.toString();
  }
  return '';
`;

export const EXCEPTION_FILTER = {
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

export const CLICK_FILTER = {
  bool: {
    should: [
      { term: { name: 'click' } },
      { term: { event_name: 'click' } },
      { term: { event_name: 'browser.frustration.rage_click' } },
      { term: { event_name: 'browser.frustration.dead_click' } },
      { term: { event_name: 'browser.frustration.error_click' } },
    ],
    minimum_should_match: 1,
  },
};

const HAS_REPLAY_FILTER = {
  term: { [RUM_HAS_REPLAY_FIELD]: true },
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

const WEB_VITAL_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'browser.web_vital' } },
      { term: { name: 'browser.web_vital' } },
    ],
    minimum_should_match: 1,
  },
};

const vitalValue = 'attributes.browser.web_vital.value';

const sessionVitalAgg = (name: 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb') => ({
  filter: {
    bool: {
      filter: [WEB_VITAL_FILTER, { term: { 'attributes.browser.web_vital.name': name } }],
    },
  },
  aggs: {
    p75: { percentiles: { field: vitalValue, percents: [75] } },
    samples: { value_count: { field: vitalValue } },
  },
});

const RAGE_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'browser.frustration.rage_click' } },
      { term: { name: 'browser.frustration.rage_click' } },
    ],
    minimum_should_match: 1,
  },
};

const DEAD_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'browser.frustration.dead_click' } },
      { term: { name: 'browser.frustration.dead_click' } },
    ],
    minimum_should_match: 1,
  },
};

const lastSeen = (field: string) => ({
  top_metrics: {
    metrics: { field },
    sort: { '@timestamp': 'desc' as const },
    size: RUM_LAST_SEEN_TOP_SIZE,
  },
});

const sequenceSeen = (field: string) => ({
  top_metrics: {
    metrics: { field },
    sort: { '@timestamp': 'asc' as const },
    size: RUM_SEQUENCE_TOP_SIZE,
  },
});

/** size>1 top_metrics AIOOBEs on shards where the metric field is unmapped. */
const withMetricField = (eventFilter: object, field: string) => ({
  bool: {
    filter: [eventFilter, { exists: { field } }],
  },
});

const LAST_SEEN_FIELDS = [
  'attributes.user.key',
  RUM_CANONICAL_BROWSER_NAME_FIELD,
  'attributes.os.name',
  'attributes.client.geo.country_iso_code',
  'resource.attributes.client.geo.country_iso_code',
  'attributes.browser.breakpoint',
  RUM_CANONICAL_SERVICE_NAME_FIELD,
  RUM_CANONICAL_URL_PATH_GROUPED_FIELD,
  'attributes.network.connection.type',
  'attributes.device.memory',
] as const;

/** Email first so the table matches session detail when setUser stamped an address. */
const USER_IDENTITY_FIELDS = [
  'attributes.user.email',
  'resource.attributes.user.email',
  'attributes.user.id',
  'resource.attributes.user.id',
  'attributes.user.name',
  'resource.attributes.user.name',
  'attributes.user.key',
] as const;

const USER_IDENTITY_FILTER = {
  bool: {
    should: USER_IDENTITY_FIELDS.map((field) => ({ exists: { field } })),
    minimum_should_match: 1,
  },
};

const lastSeenMany = {
  top_metrics: {
    metrics: LAST_SEEN_FIELDS.map((field) => ({ field })),
    sort: { '@timestamp': 'desc' as const },
    size: RUM_LAST_SEEN_TOP_SIZE,
  },
};

export const rumSessionsIndexMappings = {
  dynamic: false,
  properties: {
    session: {
      properties: {
        id: { type: 'keyword' },
        partition: { type: 'integer' },
      },
    },
    service: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    start_time: { type: 'date' },
    end_time: { type: 'date' },
    duration_ms: { type: 'long' },
    event_count: { type: 'long' },
    error_count: { type: 'long' },
    click_count: { type: 'long' },
    page_view_count: { type: 'long' },
    replay_event_count: { type: 'long' },
    has_replay: { type: 'boolean' },
    has_error: { type: 'boolean' },
    bounced: { type: 'boolean' },
    rage_click_count: { type: 'long' },
    dead_click_count: { type: 'long' },
    page_count: { type: 'integer' },
    error_groups: { type: 'keyword' },
    connection: { type: 'keyword' },
    device: { type: 'keyword' },
    lcp_p75: { type: 'double' },
    lcp_samples: { type: 'long' },
    inp_p75: { type: 'double' },
    inp_samples: { type: 'long' },
    cls_p75: { type: 'double' },
    cls_samples: { type: 'long' },
    fcp_p75: { type: 'double' },
    fcp_samples: { type: 'long' },
    ttfb_p75: { type: 'double' },
    ttfb_samples: { type: 'long' },
    entry_page: { type: 'keyword' },
    exit_page: { type: 'keyword' },
    path_key: { type: 'keyword' },
    click_path_key: { type: 'keyword' },
    pages: { type: 'keyword' },
    clicks: { type: 'keyword' },
    page_sequence: { type: 'text', analyzer: 'whitespace' },
    click_sequence: { type: 'text', analyzer: 'whitespace' },
    event_sequence: { type: 'text', analyzer: 'whitespace' },
    user: {
      properties: {
        key: { type: 'keyword' },
      },
    },
    browser: {
      properties: {
        name: { type: 'keyword' },
        breakpoint: { type: 'keyword' },
      },
    },
    os: {
      properties: {
        name: { type: 'keyword' },
      },
    },
    country_iso: { type: 'keyword' },
  },
} as const;

/** Backfill-only pipeline: stamps missing canonical fields, never overwrites. */
export const rumNormalizePipeline = {
  description: 'Stamp missing canonical RUM fields. Never overwrites existing values.',
  _meta: { managed_by: RUM_SESSIONS_MANAGED_BY, version: RUM_SESSIONS_VERSION },
  processors: [
    {
      script: {
        lang: 'painless',
        source: `
          if (ctx.resource == null) { ctx.resource = new HashMap(); }
          if (ctx.resource.attributes == null) { ctx.resource.attributes = new HashMap(); }
          if (ctx.attributes == null) { ctx.attributes = new HashMap(); }
          def r = ctx.resource.attributes;
          def a = ctx.attributes;
          def sid = r['session.id'];
          if (sid == null) { sid = r['rum.sessionId']; }
          if (sid == null) { sid = a['session.id']; }
          if (sid == null) { sid = a['rum.sessionId']; }
          if (sid != null && r['session.id'] == null) { r['session.id'] = sid.toString(); }
          def svc = r['service.name'];
          if (svc == null) { svc = a['service.name']; }
          if (svc != null && r['service.name'] == null) { r['service.name'] = svc.toString(); }
          if (r['session.id'] != null && r['session.partition'] == null) {
            int hash = r['session.id'].toString().hashCode();
            int partition = hash % 16;
            if (partition < 0) { partition += 16; }
            r['session.partition'] = partition;
          }
          if (a['url.path.grouped'] == null) {
            def page = a['page.url.path'];
            if (page == null) { page = a['url.path']; }
            if (page == null) { page = a['page.url']; }
            if (page == null) { page = a['screen.name']; }
            if (page == null) { page = a['activity.name']; }
            if (page != null) { a['url.path.grouped'] = page.toString(); }
          }
          if (a['user.key'] == null) {
            def user = a['user.id'];
            if (user == null) { user = r['user.id']; }
            if (user == null) { user = a['user.email']; }
            if (user == null) { user = r['user.email']; }
            if (user == null) { user = a['user.name']; }
            if (user == null) { user = r['user.name']; }
            if (user != null) { a['user.key'] = user.toString(); }
          }
          if (a['browser.name'] == null && r['browser.name'] != null) {
            a['browser.name'] = r['browser.name'].toString();
          }
          if (a['os.name'] == null) {
            def os = r['os.name'];
            if (os == null) { os = a['browser.platform']; }
            if (os == null) { os = r['browser.platform']; }
            if (os != null) { a['os.name'] = os.toString(); }
          }
          if (r['rum.platform'] == null) {
            def osName = r['os.name'] != null ? r['os.name'].toString() : '';
            def osType = r['os.type'] != null ? r['os.type'].toString() : '';
            if (osName == 'Android' || osType == 'android') {
              r['rum.platform'] = 'android';
            } else if (osName == 'iOS' || osName == 'iPadOS' || osType == 'ios') {
              r['rum.platform'] = 'ios';
            } else if (r['browser.name'] != null) {
              r['rum.platform'] = 'web';
            }
          }
          if (a['rum.platform'] == null && r['rum.platform'] != null) {
            a['rum.platform'] = r['rum.platform'].toString();
          }
          if (a['error.group'] == null && a['exception.type'] != null) {
            a['error.group'] = a['exception.type'].toString();
          }
          if (a['event.outcome'] == null) {
            def ev = ctx.event_name;
            if (ev == null && ctx.event instanceof Map) { ev = ctx.event.name; }
            if (ev == null) { ev = a['event.name']; }
            if (ev == 'app.crash' || ev == 'crash') { a['event.outcome'] = 'failure'; }
          }
          if (a['rum.has_replay'] == null && r['rum.has_replay'] != null) {
            a['rum.has_replay'] = r['rum.has_replay'];
          }
        `,
      },
    },
  ],
};

export const rumSessionsDestPipeline = {
  description: 'Flatten ux-rum-sessions transform output and stamp session.partition.',
  _meta: {
    managed_by: RUM_SESSIONS_MANAGED_BY,
    version: RUM_SESSIONS_VERSION,
    spec: RUM_SESSIONS_SPEC,
  },
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
          def samplesOf(def bucket) {
            if ((bucket instanceof Map) == false) { return null; }
            def samples = valueOf(bucket.samples);
            if (samples != null) { return samples; }
            return bucket.doc_count;
          }
          def millisOf(def v) {
            v = valueOf(v);
            if (v instanceof Number) { return ((Number) v).longValue(); }
            if (v instanceof String) {
              return ZonedDateTime.parse(v.toString()).toInstant().toEpochMilli();
            }
            return null;
          }
          def normalize(def raw) {
            if (raw == null) { return ''; }
            def s = raw.toString().trim().toLowerCase();
            if (s == 'null') { return ''; }
            while (s.startsWith('#') || s.startsWith('/')) {
              s = s.substring(1);
            }
            s = s.replace(' ', '_');
            if (s.length() > 80) { s = s.substring(0, 80); }
            return s;
          }
          def fieldOf(def bag, def field) {
            if ((bag instanceof Map) == false) { return ''; }
            return normalize(bag[field]);
          }
          def identityOf(def bag, def field) {
            if ((bag instanceof Map) == false) { return ''; }
            def raw = bag[field];
            if (raw == null) { return ''; }
            def s = raw.toString().trim();
            if (s == '' || s == 'null') { return ''; }
            return s;
          }
          def firstIdentity(def bag) {
            def email = identityOf(bag, 'attributes.user.email');
            if (email == '') { email = identityOf(bag, 'resource.attributes.user.email'); }
            if (email != '') { return email; }
            def id = identityOf(bag, 'attributes.user.id');
            if (id == '') { id = identityOf(bag, 'resource.attributes.user.id'); }
            if (id != '') { return id; }
            def name = identityOf(bag, 'attributes.user.name');
            if (name == '') { name = identityOf(bag, 'resource.attributes.user.name'); }
            if (name != '') { return name; }
            return identityOf(bag, 'attributes.user.key');
          }
          def tokenFrom(def bucket, def field) {
            if ((bucket instanceof Map) == false) { return ''; }
            def token = fieldOf(bucket.token, field);
            if (token != '') { return token; }
            def top = bucket.token instanceof Map ? bucket.token.top : null;
            if (top instanceof List && top.length > 0) {
              def hit = top[top.length - 1];
              def metrics = hit instanceof Map ? hit.metrics : null;
              token = fieldOf(metrics, field);
              if (token != '') { return token; }
            }
            return fieldOf(bucket.first, field);
          }
          def addToken(def tokens, def token) {
            if (token == '') { return tokens; }
            if (tokens.length > 0 && tokens[tokens.length - 1] == token) { return tokens; }
            tokens.add(token);
            return tokens;
          }
          def tokensFrom(def bucket, def field) {
            def out = [];
            if ((bucket instanceof Map) == false) { return out; }
            def token = bucket.token;
            // Prefer token.top[]; flattened hit[0] is a fallback (ES size>1 still emits it).
            def top = token instanceof Map ? token.top : null;
            if (top instanceof List && top.length > 0) {
              for (hit in top) {
                def metrics = hit instanceof Map ? hit.metrics : null;
                addToken(out, fieldOf(metrics, field));
              }
              if (out.length > 0) { return out; }
            }
            def one = fieldOf(token, field);
            if (one != '') { addToken(out, one); }
            return out;
          }
          def joinTokens(def tokens, def sep) {
            def out = '';
            for (int i = 0; i < tokens.length; i++) {
              if (i > 0) { out += sep; }
              out += tokens[i];
            }
            return out;
          }
          ctx.error_count = countOf(ctx.error_count);
          ctx.click_count = countOf(ctx.click_count);
          ctx.page_view_count = countOf(ctx.page_view_count);
          ctx.replay_event_count = countOf(ctx.replay_event_count);
          boolean replay = false;
          if (ctx.has_replay instanceof Map) {
            def n = ctx.has_replay.doc_count;
            replay = n != null && n > 0;
            if (n instanceof Number) { ctx.replay_event_count = ((Number) n).longValue(); }
          } else if (ctx.has_replay instanceof Boolean) {
            replay = ctx.has_replay;
          } else if (ctx.has_replay instanceof Number) {
            replay = ((Number) ctx.has_replay).doubleValue() > 0;
          }
          ctx.has_replay = replay;
          def errors = ctx.error_count;
          ctx.has_error = errors instanceof Number && ((Number) errors).intValue() > 0;
          def views = ctx.page_view_count;
          ctx.bounced = views instanceof Number && ((Number) views).intValue() <= 1;
          def startMs = millisOf(ctx.start_time);
          def endMs = millisOf(ctx.end_time);
          if (startMs != null && endMs != null) {
            ctx.duration_ms = endMs - startMs;
          }
          if (ctx.lcp instanceof Map) {
            ctx.lcp_p75 = p75Of(ctx.lcp.p75);
            ctx.lcp_samples = samplesOf(ctx.lcp);
          }
          if (ctx.inp instanceof Map) {
            ctx.inp_p75 = p75Of(ctx.inp.p75);
            ctx.inp_samples = samplesOf(ctx.inp);
          }
          if (ctx.cls instanceof Map) {
            ctx.cls_p75 = p75Of(ctx.cls.p75);
            ctx.cls_samples = samplesOf(ctx.cls);
          }
          if (ctx.fcp instanceof Map) {
            ctx.fcp_p75 = p75Of(ctx.fcp.p75);
            ctx.fcp_samples = samplesOf(ctx.fcp);
          }
          if (ctx.ttfb instanceof Map) {
            ctx.ttfb_p75 = p75Of(ctx.ttfb.p75);
            ctx.ttfb_samples = samplesOf(ctx.ttfb);
          }
          def groups = ctx.error_groups;
          if (groups instanceof Map && groups.groups instanceof Map) {
            def keys = [];
            def inner = groups.groups;
            def buckets = inner.buckets;
            if (buckets instanceof List) {
              for (b in buckets) {
                if (b.key != null && b.key.toString() != '') { keys.add(b.key.toString()); }
              }
            } else {
              for (entry in inner.entrySet()) {
                def k = entry.getKey();
                if (k != null && k.toString() != '') { keys.add(k.toString()); }
              }
            }
            ctx.error_groups = keys;
          }
          def last = ctx.last_seen;
          def pageTokens = tokensFrom(ctx.pages, 'attributes.url.path.grouped');
          if (pageTokens.length == 0) {
            addToken(pageTokens, tokenFrom(ctx.page_first, 'attributes.url.path.grouped'));
          }
          addToken(pageTokens, tokenFrom(ctx.page_last, 'attributes.url.path.grouped'));
          if (pageTokens.length == 0) {
            addToken(pageTokens, fieldOf(last, 'attributes.url.path.grouped'));
          }
          def clickTokens = tokensFrom(ctx.clicks, 'attributes.browser.css_selector');
          if (clickTokens.length == 0) {
            addToken(clickTokens, tokenFrom(ctx.click_first, 'attributes.browser.css_selector'));
          }
          addToken(clickTokens, tokenFrom(ctx.click_last, 'attributes.browser.css_selector'));
          ctx.pages = pageTokens;
          ctx.clicks = clickTokens;
          ctx.page_sequence = joinTokens(pageTokens, ' ');
          ctx.click_sequence = joinTokens(clickTokens, ' ');
          ctx.path_key = joinTokens(pageTokens, '>');
          ctx.click_path_key = joinTokens(clickTokens, '>');
          ctx.entry_page = pageTokens.length > 0 ? pageTokens[0] : '';
          ctx.exit_page = pageTokens.length > 0 ? pageTokens[pageTokens.length - 1] : '';
          def events = [];
          for (token in pageTokens) { events.add('p:' + token); }
          for (token in clickTokens) { events.add('a:' + token); }
          ctx.event_sequence = joinTokens(events, ' ');
          ctx.rage_click_count = countOf(ctx.rage_clicks);
          ctx.dead_click_count = countOf(ctx.dead_clicks);
          if (ctx.user == null) { ctx.user = new HashMap(); }
          def identified = ctx.user_seen;
          def key = firstIdentity(identified instanceof Map ? identified.token : identified);
          if (key == '') { key = firstIdentity(last); }
          if (key == '') { key = fieldOf(last, 'attributes.user.key'); }
          ctx.user.key = key;
          if (ctx.browser == null) { ctx.browser = new HashMap(); }
          ctx.browser.name = fieldOf(last, 'attributes.browser.name');
          ctx.browser.breakpoint = fieldOf(last, 'attributes.browser.breakpoint');
          if (ctx.os == null) { ctx.os = new HashMap(); }
          ctx.os.name = fieldOf(last, 'attributes.os.name');
          def iso = fieldOf(last, 'attributes.client.geo.country_iso_code');
          if (iso == '') { iso = fieldOf(last, 'resource.attributes.client.geo.country_iso_code'); }
          if (iso == '') { iso = fieldOf(last, 'client.geo.country_iso_code'); }
          ctx.country_iso = iso;
          ctx.connection = fieldOf(last, 'attributes.network.connection.type');
          ctx.device = fieldOf(last, 'attributes.device.memory');
          def service = fieldOf(last, 'resource.attributes.service.name');
          if (service != '') {
            if (ctx.service == null) { ctx.service = new HashMap(); }
            ctx.service.name = service;
          }
          // Prefer page_view_count (full filter agg). Sequence list is capped at top_metrics size.
          ctx.page_count = countOf(ctx.page_view_count);
          def sid = ctx['session.id'];
          if (sid == null && ctx.session instanceof Map) { sid = ctx.session.id; }
          if (sid != null) {
            if (ctx.session == null) { ctx.session = new HashMap(); }
            ctx.session.id = sid.toString();
            int hash = sid.toString().hashCode();
            int partition = hash % 16;
            if (partition < 0) { partition += 16; }
            ctx.session.partition = partition;
          }
          ctx.remove('page_first');
          ctx.remove('page_last');
          ctx.remove('click_first');
          ctx.remove('click_last');
          ctx.remove('rage_clicks');
          ctx.remove('dead_clicks');
          ctx.remove('last_seen');
          ctx.remove('user_seen');
          ctx.remove('lcp');
          ctx.remove('inp');
          ctx.remove('cls');
          ctx.remove('fcp');
          ctx.remove('ttfb');
        `,
      },
    },
  ],
};

export const rumSessionsIndexTemplate = {
  index_patterns: [RUM_SESSIONS_INDEX_PATTERN],
  _meta: { managed_by: RUM_SESSIONS_MANAGED_BY, version: RUM_SESSIONS_VERSION },
  template: {
    settings: {
      'index.default_pipeline': RUM_SESSIONS_PIPELINE_NAME,
      'index.sort.field': [...RUM_SESSIONS_INDEX_SORT_FIELD],
      'index.sort.order': [...RUM_SESSIONS_INDEX_SORT_ORDER],
    },
    mappings: rumSessionsIndexMappings,
  },
};

export const buildRumSessionsTransformBody = (
  syncDelay = RUM_SESSIONS_SYNC_DELAY,
  lookbackDays = RUM_SESSIONS_LOOKBACK_DAYS
) => ({
  source: {
    index: [RUM_SESSION_SOURCE_INDEX],
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: sessionsSourceLookback(lookbackDays) } } },
          { exists: { field: RUM_SESSION_GROUP_FIELD } },
        ],
      },
    },
  },
  dest: {
    index: RUM_SESSIONS_INDEX,
    pipeline: RUM_SESSIONS_PIPELINE_NAME,
  },
  frequency: '1m',
  sync: {
    time: {
      field: '@timestamp',
      delay: syncDelay,
    },
  },
  retention_policy: {
    time: {
      field: 'end_time',
      max_age: sessionsRetentionMaxAge(lookbackDays),
    },
  },
  settings: {
    unattended: true,
    max_page_search_size: 1000,
  },
  _meta: {
    managed_by: RUM_SESSIONS_MANAGED_BY,
    version: RUM_SESSIONS_VERSION,
    spec: RUM_SESSIONS_SPEC,
  },
  pivot: {
    group_by: {
      'session.id': {
        terms: { field: RUM_SESSION_GROUP_FIELD },
      },
    },
    aggregations: {
      start_time: { min: { field: '@timestamp' } },
      end_time: { max: { field: '@timestamp' } },
      event_count: { value_count: { field: '@timestamp' } },
      error_count: { filter: EXCEPTION_FILTER },
      click_count: { filter: CLICK_FILTER },
      page_view_count: { filter: PAGE_VIEW_FILTER },
      has_replay: { filter: HAS_REPLAY_FILTER },
      error_groups: {
        filter: EXCEPTION_FILTER,
        aggs: {
          groups: { terms: { field: RUM_CANONICAL_ERROR_GROUP_FIELD, size: 5, exclude: '' } },
        },
      },
      lcp: sessionVitalAgg('lcp'),
      inp: sessionVitalAgg('inp'),
      cls: sessionVitalAgg('cls'),
      fcp: sessionVitalAgg('fcp'),
      ttfb: sessionVitalAgg('ttfb'),
      page_last: {
        filter: withMetricField(PAGE_VIEW_FILTER, RUM_CANONICAL_URL_PATH_GROUPED_FIELD),
        aggs: { token: lastSeen(RUM_CANONICAL_URL_PATH_GROUPED_FIELD) },
      },
      pages: {
        filter: withMetricField(PAGE_VIEW_FILTER, RUM_CANONICAL_URL_PATH_GROUPED_FIELD),
        aggs: { token: sequenceSeen(RUM_CANONICAL_URL_PATH_GROUPED_FIELD) },
      },
      click_last: {
        filter: withMetricField(CLICK_FILTER, RUM_CLICK_TARGET_FIELD),
        aggs: { token: lastSeen(RUM_CLICK_TARGET_FIELD) },
      },
      clicks: {
        filter: withMetricField(CLICK_FILTER, RUM_CLICK_TARGET_FIELD),
        aggs: { token: sequenceSeen(RUM_CLICK_TARGET_FIELD) },
      },
      rage_clicks: { filter: RAGE_FILTER },
      dead_clicks: { filter: DEAD_FILTER },
      last_seen: lastSeenMany,
      user_seen: {
        filter: USER_IDENTITY_FILTER,
        aggs: {
          token: {
            top_metrics: {
              metrics: USER_IDENTITY_FIELDS.map((field) => ({ field })),
              sort: { '@timestamp': 'desc' as const },
              size: RUM_LAST_SEEN_TOP_SIZE,
            },
          },
        },
      },
    },
  },
});

export const rumSessionsTransformBody = buildRumSessionsTransformBody();

export { RUM_SESSIONS_TRANSFORM_ID };
