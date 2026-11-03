/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { partitionFilterValues } from '../../../common/rum_filters';
import { SESSION_ID_SCRIPT } from '../session_replay/session_id_script';
import { botExclusionFilters } from './bots';
import { kueryFilters } from './kuery';

export const boundedString = (max: number) =>
  new t.Type<string, string, unknown>(
    `BoundedString(${max})`,
    (u): u is string => typeof u === 'string',
    (u, c) => (typeof u === 'string' && u.length <= max ? t.success(u) : t.failure(u, c)),
    t.identity
  );

export const rumListQueryCodec = t.partial({
  rangeFrom: boundedString(64),
  rangeTo: boundedString(64),
  serviceName: boundedString(256),
  browser: boundedString(512),
  os: boundedString(512),
  /** ISO-3166 alpha-2 country codes (`client.geo.country_iso_code`), comma-OR. */
  location: boundedString(128),
  pageUrl: boundedString(2048),
  frustration: boundedString(64),
  errorGroup: boundedString(256),
  sessionIds: boundedString(2048),
  user: boundedString(256),
  includeBots: boundedString(8),
  botUa: boundedString(512),
  kuery: boundedString(4096),
  breakpoint: boundedString(128),
  connection: boundedString(256),
  device: boundedString(256),
  analyticsMode: boundedString(16),
});

export const luceneEscape = (raw: string): string =>
  raw.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');

export const PAGE_VIEW_FILTER = {
  bool: {
    should: [
      { term: { name: 'documentLoad' } },
      { term: { event_name: 'browser.navigation' } },
      { term: { name: 'browser.navigation' } },
    ],
    minimum_should_match: 1,
  },
};

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

export const WEB_VITAL_FILTER = {
  bool: {
    should: [
      { term: { event_name: 'browser.web_vital' } },
      { term: { name: 'browser.web_vital' } },
    ],
    minimum_should_match: 1,
  },
};

export const DOCUMENT_LOAD_FILTER = { term: { name: 'documentLoad' } };

/** Client fetch/XHR spans. Excludes resource-timing (`resourceFetch`). */
export const EXTERNAL_HTTP_FILTER = {
  bool: {
    should: [
      { term: { name: 'external.http' } },
      { term: { event_name: 'external.http' } },
      { exists: { field: 'attributes.http.request.method' } },
    ],
    must_not: [
      { term: { name: 'resourceFetch' } },
      { exists: { field: 'attributes.http.render_blocking_status' } },
    ],
    minimum_should_match: 1,
  },
};

export const HTTP_FAIL_FILTER = {
  range: { 'attributes.http.response.status_code': { gte: 400 } },
};

/** Scheme + host + port from `url.full` / `http.url`, else `server.address`. */
export const HTTP_ORIGIN_SCRIPT = `
  def u = '';
  if (doc.containsKey('attributes.url.full') && doc['attributes.url.full'].size() > 0) {
    u = doc['attributes.url.full'].value.toString();
  } else if (doc.containsKey('attributes.http.url') && doc['attributes.http.url'].size() > 0) {
    u = doc['attributes.http.url'].value.toString();
  } else if (doc.containsKey('attributes.server.address') && doc['attributes.server.address'].size() > 0) {
    return doc['attributes.server.address'].value.toString();
  }
  if (u.length() == 0) { return ''; }
  int scheme = u.indexOf('://');
  if (scheme < 0) { return u; }
  int path = u.indexOf('/', scheme + 3);
  return path < 0 ? u : u.substring(0, path);
`;

export const frustrationEventFilter = (kind: 'rage_click' | 'dead_click' | 'error_click') => ({
  bool: {
    should: [
      { term: { name: `browser.frustration.${kind}` } },
      { term: { event_name: `browser.frustration.${kind}` } },
    ],
    minimum_should_match: 1,
  },
});

export const PAGE_PATH_SCRIPT = `
  def grouped = null;
  if (doc.containsKey('attributes.url.path.grouped') && doc['attributes.url.path.grouped'].size() > 0) {
    grouped = doc['attributes.url.path.grouped'].value.toString();
  }
  if (grouped != null && grouped.length() > 0) { return grouped; }
  def p = null;
  if (doc.containsKey('attributes.page.url.path') && doc['attributes.page.url.path'].size() > 0) {
    p = doc['attributes.page.url.path'].value.toString();
  } else if (doc.containsKey('page.url.path') && doc['page.url.path'].size() > 0) {
    p = doc['page.url.path'].value.toString();
  }
  if (p != null) { return p; }
  def full = null;
  if (doc.containsKey('attributes.url.full') && doc['attributes.url.full'].size() > 0) {
    full = doc['attributes.url.full'].value.toString();
  } else if (doc.containsKey('attributes.page.url') && doc['attributes.page.url'].size() > 0) {
    full = doc['attributes.page.url'].value.toString();
  } else if (doc.containsKey('attributes.http.url') && doc['attributes.http.url'].size() > 0) {
    full = doc['attributes.http.url'].value.toString();
  } else if (doc.containsKey('url.full') && doc['url.full'].size() > 0) {
    full = doc['url.full'].value.toString();
  }
  if (full == null) { return ''; }
  int hash = full.indexOf('#');
  if (hash >= 0) {
    def frag = full.substring(hash + 1);
    if (frag.startsWith('/')) { return frag.splitOnToken('?')[0]; }
    if (frag.length() > 0) { return '#' + frag.splitOnToken('?')[0]; }
    full = full.substring(0, hash);
  }
  int q = full.indexOf('?');
  if (q >= 0) { full = full.substring(0, q); }
  int scheme = full.indexOf('://');
  if (scheme >= 0) {
    int slash = full.indexOf('/', scheme + 3);
    if (slash >= 0) { return full.substring(slash); }
    return '/';
  }
  return full;
`;

export const BROWSER_SCRIPT = `
  if (doc.containsKey('resource.attributes.browser.name') && doc['resource.attributes.browser.name'].size() > 0) {
    return doc['resource.attributes.browser.name'].value.toString();
  }
  if (doc.containsKey('attributes.browser.name') && doc['attributes.browser.name'].size() > 0) {
    return doc['attributes.browser.name'].value.toString();
  }
  return '';
`;

export const BREAKPOINT_SCRIPT = `
  if (doc.containsKey('attributes.browser.breakpoint') && doc['attributes.browser.breakpoint'].size() > 0) {
    return doc['attributes.browser.breakpoint'].value.toString();
  }
  return '';
`;

export const CONNECTION_SCRIPT = `
  if (doc.containsKey('attributes.network.connection.type') && doc['attributes.network.connection.type'].size() > 0) {
    return doc['attributes.network.connection.type'].value.toString();
  }
  return '';
`;

export const DEVICE_SCRIPT = `
  if (doc.containsKey('attributes.device.memory') && doc['attributes.device.memory'].size() > 0) {
    return doc['attributes.device.memory'].value.toString();
  }
  if (doc.containsKey('resource.attributes.device.memory') && doc['resource.attributes.device.memory'].size() > 0) {
    return doc['resource.attributes.device.memory'].value.toString();
  }
  return '';
`;

export const OS_SCRIPT = `
  if (doc.containsKey('resource.attributes.browser.platform') && doc['resource.attributes.browser.platform'].size() > 0) {
    return doc['resource.attributes.browser.platform'].value.toString();
  }
  if (doc.containsKey('attributes.browser.platform') && doc['attributes.browser.platform'].size() > 0) {
    return doc['attributes.browser.platform'].value.toString();
  }
  if (doc.containsKey('resource.attributes.os.name') && doc['resource.attributes.os.name'].size() > 0) {
    return doc['resource.attributes.os.name'].value.toString();
  }
  return '';
`;

export const COUNTRY_ISO_SCRIPT = `
  if (doc.containsKey('client.geo.country_iso_code') && doc['client.geo.country_iso_code'].size() > 0) {
    return doc['client.geo.country_iso_code'].value.toString();
  }
  if (doc.containsKey('resource.attributes.client.geo.country_iso_code') && doc['resource.attributes.client.geo.country_iso_code'].size() > 0) {
    return doc['resource.attributes.client.geo.country_iso_code'].value.toString();
  }
  return '';
`;

export const sessionCardinality = {
  cardinality: { script: { source: SESSION_ID_SCRIPT, lang: 'painless' } },
};

export const USER_FIELDS = [
  'attributes.user.id',
  'resource.attributes.user.id',
  'attributes.user.email',
  'resource.attributes.user.email',
  'attributes.user.name',
  'resource.attributes.user.name',
] as const;

/** Resolve a stable user key (id, else email, else name) from doc/resource attributes. */
export const USER_KEY_SCRIPT = `
  def fields = [
    'attributes.user.id', 'resource.attributes.user.id',
    'attributes.user.email', 'resource.attributes.user.email',
    'attributes.user.name', 'resource.attributes.user.name'
  ];
  for (f in fields) {
    if (doc.containsKey(f)) {
      def v = doc[f];
      if (v != null && v.size() > 0) { return v.value.toString(); }
    }
  }
  return '';
`;

/** Cardinality of identified users, guarded so anonymous docs don't count as one bucket. */
export const identifiedUsers = {
  filter: {
    bool: {
      should: USER_FIELDS.map((field) => ({ exists: { field } })),
      minimum_should_match: 1,
    },
  },
  aggs: {
    count: { cardinality: { script: { source: USER_KEY_SCRIPT, lang: 'painless' } } },
  },
};

export const pagePathTerms = (size: number) => ({
  terms: {
    script: { source: PAGE_PATH_SCRIPT, lang: 'painless' },
    size,
    exclude: '',
  },
});

export interface RumQueryParams {
  rangeFrom?: string;
  rangeTo?: string;
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  user?: string;
  includeBots?: string;
  botUa?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
}

export const CLIENT_GEO_COUNTRY_ISO_FIELDS = [
  'client.geo.country_iso_code',
  'resource.attributes.client.geo.country_iso_code',
] as const;

const termShould = (fields: string[], value: string) => ({
  bool: {
    should: fields.map((field) => ({ term: { [field]: value } })),
    minimum_should_match: 1,
  },
});

const termShouldAny = (fields: string[], values: string[]) => {
  if (values.length === 0) {
    return undefined;
  }
  if (values.length === 1) {
    return termShould(fields, values[0]);
  }
  return {
    bool: {
      should: values.map((value) => termShould(fields, value)),
      minimum_should_match: 1,
    },
  };
};

const mustNot = (clause: object) => ({ bool: { must_not: [clause] } });

const combineFacetClauses = (include?: object, exclude?: object) => {
  if (include && exclude) {
    return { bool: { filter: [include, mustNot(exclude)] } };
  }
  if (include) {
    return include;
  }
  if (exclude) {
    return mustNot(exclude);
  }
  return undefined;
};

const facetFilter = (fields: string[], raw?: string) => {
  const { include, exclude } = partitionFilterValues(raw);
  return combineFacetClauses(termShouldAny(fields, include), termShouldAny(fields, exclude));
};

const pageUrlNeedle = (value: string): string =>
  luceneEscape(value.replace(/[*?]/g, '')).slice(0, 200);

const pageUrlClause = (needles: string[]) => {
  const escaped = needles.map(pageUrlNeedle).filter(Boolean);
  if (escaped.length === 0) {
    return undefined;
  }
  const clause = (needle: string) => ({
    query_string: {
      query: `*${needle}*`,
      fields: [
        'attributes.url.path.grouped',
        'attributes.page.url.path',
        'attributes.page.url',
        'attributes.url.full',
        'attributes.http.url',
        'url.full',
        'page.url.path',
        'page.url',
        'http.url',
      ],
      lenient: true,
      analyze_wildcard: true,
    },
  });
  if (escaped.length === 1) {
    return clause(escaped[0]);
  }
  return {
    bool: {
      should: escaped.map(clause),
      minimum_should_match: 1,
    },
  };
};

const pageUrlFilter = (raw?: string) => {
  const { include, exclude } = partitionFilterValues(raw);
  return combineFacetClauses(pageUrlClause(include), pageUrlClause(exclude));
};

/** Shared time + service + OTel facet filters for RUM ES queries. */
export const rumBaseFilters = (params: RumQueryParams): object[] => {
  const rangeFrom = params.rangeFrom || 'now-24h';
  const rangeTo = params.rangeTo || 'now';
  const filters: object[] = [{ range: { '@timestamp': { gte: rangeFrom, lte: rangeTo } } }];

  if (params.serviceName) {
    filters.push(
      termShould(
        ['resource.attributes.service.name', 'attributes.service.name'],
        params.serviceName
      )
    );
  }
  const browser = facetFilter(
    ['resource.attributes.browser.name', 'attributes.browser.name'],
    params.browser
  );
  if (browser) {
    filters.push(browser);
  }
  const os = facetFilter(
    [
      'resource.attributes.browser.platform',
      'attributes.browser.platform',
      'resource.attributes.os.name',
    ],
    params.os
  );
  if (os) {
    filters.push(os);
  }
  const location = facetFilter([...CLIENT_GEO_COUNTRY_ISO_FIELDS], params.location);
  if (location) {
    filters.push(location);
  }
  const breakpoint = facetFilter(['attributes.browser.breakpoint'], params.breakpoint);
  if (breakpoint) {
    filters.push(breakpoint);
  }
  const connection = facetFilter(['attributes.network.connection.type'], params.connection);
  if (connection) {
    filters.push(connection);
  }
  const device = facetFilter(
    ['attributes.device.memory', 'resource.attributes.device.memory'],
    params.device
  );
  if (device) {
    filters.push(device);
  }
  if (params.user) {
    filters.push(termShould([...USER_FIELDS], params.user));
  }
  filters.push(...botExclusionFilters(params.includeBots, params.botUa));
  const pageUrl = pageUrlFilter(params.pageUrl);
  if (pageUrl) {
    filters.push(pageUrl);
  }

  filters.push(...kueryFilters(params.kuery));

  return filters;
};

export interface TermsBucket {
  key: string | number;
  doc_count: number;
  [name: string]: unknown;
}

export const termsBuckets = (agg: unknown): TermsBucket[] => {
  const buckets = (agg as { buckets?: TermsBucket[] } | undefined)?.buckets;
  return Array.isArray(buckets) ? buckets : [];
};

export const cardValue = (agg: unknown): number => {
  const value = (agg as { value?: number } | undefined)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const percentileValue = (agg: unknown, key = '75.0'): number | null => {
  const values = (agg as { values?: Record<string, number | null> } | undefined)?.values;
  const raw = values?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
};

export const facetFromScriptTerms = (agg: unknown): Array<{ key: string; count: number }> =>
  termsBuckets(agg)
    .map((bucket) => ({ key: String(bucket.key), count: bucket.doc_count }))
    .filter((bucket) => bucket.key.length > 0)
    .sort((a, b) => b.count - a.count);
