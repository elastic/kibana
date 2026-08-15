/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RUM_SESSION_SOURCE_INDEX } from '../../common/session_replay';
import {
  RUM_CANONICAL_ERROR_GROUP_FIELD,
  RUM_CANONICAL_SESSION_ID_FIELD,
  RUM_HAS_REPLAY_FIELD,
  RUM_SESSIONS_INDEX,
  RUM_SESSIONS_INDEX_PATTERN,
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

const CLICK_FILTER = {
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

const sessionVitalAgg = (name: 'lcp' | 'inp' | 'cls') => ({
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

/** Keep the earliest tokens per shard so reduce can still take the first 30 globally. */
const SEQUENCE_MAP_CAP = 40;

const keywordFromDoc = (fields: string): string => `
  def value = null;
  for (field in ${fields}) {
    if (doc.containsKey(field) && doc[field].size() > 0) {
      value = doc[field].value;
      break;
    }
  }
`;

/** Collect ordered page/click tokens plus last-known client/user from doc values. */
const SEQUENCE_MAP_SCRIPT = `
  if (doc.containsKey('@timestamp') == false || doc['@timestamp'].size() == 0) { return; }
  def ts = doc['@timestamp'].value.millis;
  ${keywordFromDoc(
    "['attributes.url.path.grouped', 'attributes.page.url.path', 'attributes.url.full', 'attributes.page.url', 'attributes.http.url', 'resource.attributes.page.url.path', 'resource.attributes.url.full']"
  )}
  def page = value;
  def nameStr = '';
  if (doc.containsKey('event_name') && doc['event_name'].size() > 0) {
    nameStr = doc['event_name'].value.toString();
  } else if (doc.containsKey('name') && doc['name'].size() > 0) {
    nameStr = doc['name'].value.toString();
  }
  def isClick = nameStr.contains('click');
  def isRage = nameStr.contains('rage');
  def isDead = nameStr.contains('dead');
  def isPage = nameStr == 'documentLoad' || nameStr.contains('navigation');
  if (isPage && page != null) {
    def s = page.toString().trim().toLowerCase();
    if (s.startsWith('#/')) { s = s.substring(2); }
    else if (s.startsWith('#')) { s = s.substring(1); }
    else if (s.startsWith('/')) { s = s.substring(1); }
    s = s.replace(' ', '_');
    if (s.length() > 0) {
      if (state.pages.length < ${SEQUENCE_MAP_CAP}) {
        state.pages.add([ts, s]);
      } else {
        int latest = 0;
        for (int i = 1; i < state.pages.length; i++) {
          if (state.pages[i][0] > state.pages[latest][0]) { latest = i; }
        }
        if (ts < state.pages[latest][0]) { state.pages[latest] = [ts, s]; }
      }
    }
  }
  if (isClick) {
    def target = null;
    if (doc.containsKey('attributes.browser.css_selector') && doc['attributes.browser.css_selector'].size() > 0) {
      target = doc['attributes.browser.css_selector'].value;
    } else if (doc.containsKey('attributes.target_xpath') && doc['attributes.target_xpath'].size() > 0) {
      target = doc['attributes.target_xpath'].value;
    }
    if (target != null) {
      def s = target.toString().trim().toLowerCase().replace(' ', '_');
      if (s.length() > 0) {
        if (state.clicks.length < ${SEQUENCE_MAP_CAP}) {
          state.clicks.add([ts, s]);
        } else {
          int latest = 0;
          for (int i = 1; i < state.clicks.length; i++) {
            if (state.clicks[i][0] > state.clicks[latest][0]) { latest = i; }
          }
          if (ts < state.clicks[latest][0]) { state.clicks[latest] = [ts, s]; }
        }
      }
    }
    if (isRage) { state.rage += 1; }
    if (isDead) { state.dead += 1; }
  }
  if (doc.containsKey('attributes.user.id') && doc['attributes.user.id'].size() > 0) {
    state.user = doc['attributes.user.id'].value.toString();
  } else if (doc.containsKey('attributes.user.email') && doc['attributes.user.email'].size() > 0) {
    state.user = doc['attributes.user.email'].value.toString();
  } else if (doc.containsKey('attributes.user.name') && doc['attributes.user.name'].size() > 0) {
    state.user = doc['attributes.user.name'].value.toString();
  } else if (
    state.user == '' &&
    doc.containsKey('resource.attributes.user.id') &&
    doc['resource.attributes.user.id'].size() > 0
  ) {
    state.user = doc['resource.attributes.user.id'].value.toString();
  }
  if (doc.containsKey('attributes.browser.name') && doc['attributes.browser.name'].size() > 0) {
    state.browser = doc['attributes.browser.name'].value.toString();
  } else if (
    state.browser == '' &&
    doc.containsKey('resource.attributes.browser.name') &&
    doc['resource.attributes.browser.name'].size() > 0
  ) {
    state.browser = doc['resource.attributes.browser.name'].value.toString();
  }
  if (doc.containsKey('attributes.browser.platform') && doc['attributes.browser.platform'].size() > 0) {
    state.os = doc['attributes.browser.platform'].value.toString();
  } else if (doc.containsKey('attributes.os.name') && doc['attributes.os.name'].size() > 0) {
    state.os = doc['attributes.os.name'].value.toString();
  } else if (
    state.os == '' &&
    doc.containsKey('resource.attributes.browser.platform') &&
    doc['resource.attributes.browser.platform'].size() > 0
  ) {
    state.os = doc['resource.attributes.browser.platform'].value.toString();
  }
  if (
    doc.containsKey('attributes.client.geo.country_iso_code') &&
    doc['attributes.client.geo.country_iso_code'].size() > 0
  ) {
    state.country = doc['attributes.client.geo.country_iso_code'].value.toString();
  } else if (
    state.country == '' &&
    doc.containsKey('resource.attributes.client.geo.country_iso_code') &&
    doc['resource.attributes.client.geo.country_iso_code'].size() > 0
  ) {
    state.country = doc['resource.attributes.client.geo.country_iso_code'].value.toString();
  }
  if (doc.containsKey('attributes.browser.breakpoint') && doc['attributes.browser.breakpoint'].size() > 0) {
    state.breakpoint = doc['attributes.browser.breakpoint'].value.toString();
  }
  if (doc.containsKey('resource.attributes.service.name') && doc['resource.attributes.service.name'].size() > 0) {
    state.service = doc['resource.attributes.service.name'].value.toString();
  } else if (doc.containsKey('attributes.service.name') && doc['attributes.service.name'].size() > 0) {
    state.service = doc['attributes.service.name'].value.toString();
  }
  if (doc.containsKey('attributes.network.connection.type') && doc['attributes.network.connection.type'].size() > 0) {
    state.connection = doc['attributes.network.connection.type'].value.toString();
  }
  if (doc.containsKey('attributes.device.memory') && doc['attributes.device.memory'].size() > 0) {
    state.device = doc['attributes.device.memory'].value.toString();
  } else if (
    state.device == '' &&
    doc.containsKey('resource.attributes.device.memory') &&
    doc['resource.attributes.device.memory'].size() > 0
  ) {
    state.device = doc['resource.attributes.device.memory'].value.toString();
  }
`;

const SEQUENCE_REDUCE_SCRIPT = `
  def pages = [];
  def clicks = [];
  def rage = 0;
  def dead = 0;
  def user = '';
  def browser = '';
  def os = '';
  def country = '';
  def breakpoint = '';
  def service = '';
  def connection = '';
  def device = '';
  for (s in states) {
    if (s == null) { continue; }
    if (s.pages != null) { pages.addAll(s.pages); }
    if (s.clicks != null) { clicks.addAll(s.clicks); }
    if (s.rage != null) { rage += s.rage; }
    if (s.dead != null) { dead += s.dead; }
    if (s.user != null && s.user != '') { user = s.user; }
    if (s.browser != null && s.browser != '') { browser = s.browser; }
    if (s.os != null && s.os != '') { os = s.os; }
    if (s.country != null && s.country != '') { country = s.country; }
    if (s.breakpoint != null && s.breakpoint != '') { breakpoint = s.breakpoint; }
    if (s.service != null && s.service != '') { service = s.service; }
    if (s.connection != null && s.connection != '') { connection = s.connection; }
    if (s.device != null && s.device != '') { device = s.device; }
  }
  pages.sort((a, b) -> a[0].compareTo(b[0]));
  clicks.sort((a, b) -> a[0].compareTo(b[0]));
  def pageTokens = [];
  def lastPage = '';
  for (item in pages) {
    def token = item[1].toString();
    if (token != lastPage) {
      pageTokens.add(token);
      lastPage = token;
    }
    if (pageTokens.length >= 30) { break; }
  }
  def clickTokens = [];
  def lastClick = '';
  for (item in clicks) {
    def token = item[1].toString();
    if (token != lastClick) {
      clickTokens.add(token);
      lastClick = token;
    }
    if (clickTokens.length >= 30) { break; }
  }
  def events = [];
  def pi = 0;
  def ci = 0;
  while (pi < pages.length || ci < clicks.length) {
    def usePage = ci >= clicks.length || (pi < pages.length && pages[pi][0].compareTo(clicks[ci][0]) <= 0);
    if (usePage) {
      events.add('p:' + pages[pi][1].toString());
      pi += 1;
    } else {
      events.add('a:' + clicks[ci][1].toString());
      ci += 1;
    }
    if (events.length >= 40) { break; }
  }
  def pageSeq = '';
  def clickSeq = '';
  def eventSeq = '';
  def pathKey = '';
  def clickPathKey = '';
  for (int i = 0; i < pageTokens.length; i++) {
    if (i > 0) { pageSeq += ' '; pathKey += '>'; }
    pageSeq += pageTokens[i];
    pathKey += pageTokens[i];
  }
  for (int i = 0; i < clickTokens.length; i++) {
    if (i > 0) { clickSeq += ' '; clickPathKey += '>'; }
    clickSeq += clickTokens[i];
    clickPathKey += clickTokens[i];
  }
  for (int i = 0; i < events.length; i++) {
    if (i > 0) { eventSeq += ' '; }
    eventSeq += events[i];
  }
  return [
    'page_sequence': pageSeq,
    'click_sequence': clickSeq,
    'event_sequence': eventSeq,
    'path_key': pathKey,
    'click_path_key': clickPathKey,
    'pages': pageTokens,
    'clicks': clickTokens,
    'entry_page': pageTokens.length > 0 ? pageTokens[0] : '',
    'exit_page': pageTokens.length > 0 ? pageTokens[pageTokens.length - 1] : '',
    'rage': rage,
    'dead': dead,
    'user': user,
    'browser': browser,
    'os': os,
    'country': country,
    'breakpoint': breakpoint,
    'service': service,
    'connection': connection,
    'device': device
  ];
`;

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
            if (page != null) { a['url.path.grouped'] = page.toString(); }
          }
          if (a['user.key'] == null) {
            def user = a['user.id'];
            if (user == null) { user = r['user.id']; }
            if (user == null) { user = a['user.email']; }
            if (user == null) { user = a['user.name']; }
            if (user != null) { a['user.key'] = user.toString(); }
          }
          if (a['browser.name'] == null && r['browser.name'] != null) {
            a['browser.name'] = r['browser.name'].toString();
          }
          if (a['os.name'] == null) {
            def os = a['browser.platform'];
            if (os == null) { os = r['browser.platform']; }
            if (os != null) { a['os.name'] = os.toString(); }
          }
          if (a['error.group'] == null && a['exception.type'] != null) {
            a['error.group'] = a['exception.type'].toString();
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
          ctx.error_count = countOf(ctx.error_count);
          ctx.click_count = countOf(ctx.click_count);
          ctx.page_view_count = countOf(ctx.page_view_count);
          ctx.replay_event_count = countOf(ctx.replay_event_count);
          boolean replay = false;
          if (ctx.has_replay instanceof Map) {
            def n = ctx.has_replay.doc_count;
            replay = n != null && n > 0;
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
          def groups = ctx.error_groups;
          if (groups instanceof Map && groups.groups instanceof Map) {
            def keys = [];
            def buckets = groups.groups.buckets;
            if (buckets instanceof List) {
              for (b in buckets) {
                if (b.key != null && b.key.toString() != '') { keys.add(b.key.toString()); }
              }
            }
            ctx.error_groups = keys;
          }
          def seq = ctx.sequences;
          if (seq instanceof Map) {
            ctx.page_sequence = seq.page_sequence;
            ctx.click_sequence = seq.click_sequence;
            ctx.event_sequence = seq.event_sequence;
            ctx.path_key = seq.path_key;
            ctx.click_path_key = seq.click_path_key;
            ctx.pages = seq.pages;
            ctx.clicks = seq.clicks;
            ctx.entry_page = seq.entry_page;
            ctx.exit_page = seq.exit_page;
            ctx.rage_click_count = seq.rage;
            ctx.dead_click_count = seq.dead;
            if (ctx.user == null) { ctx.user = new HashMap(); }
            ctx.user.key = seq.user;
            if (ctx.browser == null) { ctx.browser = new HashMap(); }
            ctx.browser.name = seq.browser;
            ctx.browser.breakpoint = seq.breakpoint;
            if (ctx.os == null) { ctx.os = new HashMap(); }
            ctx.os.name = seq.os;
            ctx.country_iso = seq.country;
            ctx.connection = seq.connection;
            ctx.device = seq.device;
            if (seq.service != null && seq.service != '') {
              if (ctx.service == null) { ctx.service = new HashMap(); }
              ctx.service.name = seq.service;
            }
          }
          def pages = ctx.pages;
          ctx.page_count = pages instanceof List ? pages.size() : 0;
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
          ctx.remove('sequences');
          ctx.remove('lcp');
          ctx.remove('inp');
          ctx.remove('cls');
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
      number_of_shards: 1,
      number_of_replicas: 1,
      'index.default_pipeline': RUM_SESSIONS_PIPELINE_NAME,
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
          { exists: { field: RUM_CANONICAL_SESSION_ID_FIELD } },
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
        terms: { field: RUM_CANONICAL_SESSION_ID_FIELD },
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
      sequences: {
        scripted_metric: {
          init_script:
            "state.pages = []; state.clicks = []; state.rage = 0; state.dead = 0; state.user = ''; state.browser = ''; state.os = ''; state.country = ''; state.breakpoint = ''; state.service = ''; state.connection = ''; state.device = '';",
          map_script: SEQUENCE_MAP_SCRIPT,
          combine_script: 'return state;',
          reduce_script: SEQUENCE_REDUCE_SCRIPT,
        },
      },
    },
  },
});

export const rumSessionsTransformBody = buildRumSessionsTransformBody();

export { RUM_SESSIONS_TRANSFORM_ID };
