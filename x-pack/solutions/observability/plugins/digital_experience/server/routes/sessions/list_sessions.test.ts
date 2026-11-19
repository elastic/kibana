/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ENVIRONMENT_ALL_VALUE, ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { omit } from 'lodash';
import { SESSIONS_INDEX_PATTERN, SESSIONS_LOOKBACK_DAYS } from '../../../common/sessions';
import {
  buildListSessionsRequest,
  listSessions,
  parseListSessionsResponse,
  toSessionSummary,
  type ListSessionsAggs,
  type ListSessionsParams,
  type StoredSessionDocument,
} from './list_sessions';

const baseParams: ListSessionsParams = {
  serviceName: 'checkout-web',
  start: '2026-10-20T00:00:00.000Z',
  end: '2026-10-21T00:00:00.000Z',
  sortField: 'start_time',
  sortDirection: 'desc',
  page: 0,
  perPage: 25,
};

const scopeFilters = [
  { term: { 'service.name': 'checkout-web' } },
  { range: { start_time: { lte: baseParams.end } } },
  { range: { end_time: { gte: baseParams.start } } },
];

const sessionDoc: StoredSessionDocument = {
  session: { id: 'abc' },
  service: { name: 'checkout-web' },
  start_time: '2026-10-20T10:00:00.000Z',
  end_time: '2026-10-20T10:05:00.000Z',
  duration_ms: 300_000,
  event_count: 42,
  page_view_count: 3,
  page_load_count: 1,
  click_count: 7,
  js_error_count: 2,
  http_request_count: 12,
  http_failed_request_count: 1,
  bounced: false,
  entry_page: '/',
  exit_page: '/cart',
  journey: ['/', '/products', '/cart'],
  environment: 'production',
  user: { key: 'jane@example.com' },
  user_agent: { browser: 'Chrome', browser_version: '130', os: 'macOS', device: null },
  geo: { country_iso: 'NL', region: 'North Holland', city: 'Amsterdam' },
  web_vitals: { lcp: 1800, inp: null, cls: 0.05, fcp: null, ttfb: null },
  search: ['abc', 'jane@example.com', 'chrome', 'macos', 'nl', '/', '/products', '/cart'],
};

const searchResponse = (
  overrides: Partial<SearchResponse<StoredSessionDocument, ListSessionsAggs>> = {}
): SearchResponse<StoredSessionDocument, ListSessionsAggs> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
  ...overrides,
});

const percentile = (value: number | null) => ({ values: [{ key: 50, value }] });

describe('buildListSessionsRequest', () => {
  it('scopes to the application, all its environments and sessions overlapping the range', () => {
    const request = buildListSessionsRequest(baseParams);
    expect(request).toEqual(
      expect.objectContaining({
        index: SESSIONS_INDEX_PATTERN,
        ignore_unavailable: true,
        allow_no_indices: true,
        track_total_hits: true,
      })
    );
    expect(request.query?.bool?.filter).toEqual([...scopeFilters, { match_all: {} }]);
  });

  it.each([undefined, ENVIRONMENT_ALL_VALUE])('reads every environment for %s', (environment) => {
    expect(buildListSessionsRequest({ ...baseParams, environment }).query?.bool?.filter).toEqual([
      ...scopeFilters,
      { match_all: {} },
    ]);
  });

  it('filters on the summarized environment', () => {
    expect(
      buildListSessionsRequest({ ...baseParams, environment: 'production' }).query?.bool?.filter
    ).toEqual([
      ...scopeFilters,
      { bool: { should: [{ term: { environment: 'production' } }], minimum_should_match: 1 } },
    ]);
  });

  it('reads the sessions without an environment for "Not defined"', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      environment: ENVIRONMENT_NOT_DEFINED_VALUE,
    });

    expect(request.query?.bool?.filter).toEqual([
      ...scopeFilters,
      {
        bool: {
          should: [
            { term: { 'service.environment': ENVIRONMENT_NOT_DEFINED_VALUE } },
            { bool: { must_not: [{ exists: { field: 'environment' } }] } },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('sorts with a session.id tiebreaker and paginates', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      sortField: 'js_error_count',
      sortDirection: 'asc',
      page: 2,
      perPage: 10,
    });
    expect(request.sort).toEqual([{ js_error_count: 'asc' }, { 'session.id': 'asc' }]);
    expect(request.from).toBe(20);
    expect(request.size).toBe(10);
  });

  it('never requests past the max result window', () => {
    const request = buildListSessionsRequest({ ...baseParams, page: 1000, perPage: 100 });
    // Elasticsearch rejects `from + size` past the window, so `from` is capped too.
    expect(request.from).toBe(10_000);
    expect(request.size).toBe(0);
    const lastPage = buildListSessionsRequest({ ...baseParams, page: 99, perPage: 101 });
    expect((lastPage.from ?? 0) + (lastPage.size ?? 0)).toBe(10_000);
  });

  it('searches the lowercased term anywhere in the search values, with wildcards escaped', () => {
    const request = buildListSessionsRequest({ ...baseParams, query: ' Ch*ck?ut\\ ' });
    expect(request.query?.bool?.filter).toEqual([
      ...scopeFilters,
      { match_all: {} },
      { wildcard: { search: { value: '*ch\\*ck\\?ut\\\\*' } } },
    ]);
  });

  it.each(['', '   '])('does not search for %j', (query) => {
    expect(buildListSessionsRequest({ ...baseParams, query }).query?.bool?.filter).toHaveLength(4);
  });

  it('applies facet selections as a post filter and excludes each facet from its own counts', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      facets: { browsers: 'Chrome', countries: 'NL' },
    });
    expect(request.post_filter).toEqual({
      bool: {
        filter: [
          { term: { 'user_agent.browser': 'Chrome' } },
          { term: { 'geo.country_iso': 'NL' } },
        ],
      },
    });
    expect(request.aggs?.browsers.filter).toEqual({
      bool: { filter: [{ term: { 'geo.country_iso': 'NL' } }] },
    });
    expect(request.aggs?.browsers.aggs).toEqual({
      values: { terms: { field: 'user_agent.browser', size: 10 } },
    });
    expect(request.aggs?.os.filter).toEqual(request.post_filter);
    expect(request.aggs?.kpis.filter).toEqual(request.post_filter);
  });

  it('narrows the list, KPIs and every facet to sessions with JS errors, failed requests and in the duration range', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      facets: { browsers: 'Chrome' },
      filters: {
        withJsErrors: true,
        withFailedRequests: true,
        minDurationMs: 10_000,
        maxDurationMs: 60_000,
      },
    });
    const filters = [
      { range: { js_error_count: { gte: 1 } } },
      { range: { http_failed_request_count: { gte: 1 } } },
      { range: { duration_ms: { gte: 10_000, lt: 60_000 } } },
    ];
    expect(request.post_filter).toEqual({
      bool: { filter: [...filters, { term: { 'user_agent.browser': 'Chrome' } }] },
    });
    expect(request.aggs?.kpis.filter).toEqual(request.post_filter);
    expect(request.aggs?.browsers.filter).toEqual({ bool: { filter: filters } });
  });

  it('applies each error filter on its own, and only when set', () => {
    expect(
      buildListSessionsRequest({
        ...baseParams,
        filters: { withJsErrors: false, withFailedRequests: true },
      }).post_filter
    ).toEqual({ bool: { filter: [{ range: { http_failed_request_count: { gte: 1 } } }] } });
  });

  it('applies an open-ended duration range', () => {
    const request = buildListSessionsRequest({ ...baseParams, filters: { minDurationMs: 0 } });
    expect(request.post_filter).toEqual({
      bool: { filter: [{ range: { duration_ms: { gte: 0 } } }] },
    });
  });

  it('computes the KPIs, with the bounce rate over sessions with a page view', () => {
    const kpis = buildListSessionsRequest(baseParams).aggs?.kpis.aggs;
    expect(kpis).toEqual(
      expect.objectContaining({
        median_duration: { percentiles: { field: 'duration_ms', percents: [50], keyed: false } },
        avg_page_views: { avg: { field: 'page_view_count' } },
        with_page_views: { filter: { range: { page_view_count: { gte: 1 } } } },
        bounced: { filter: { term: { bounced: true } } },
        with_js_errors: { filter: { range: { js_error_count: { gte: 1 } } } },
        with_failed_requests: { filter: { range: { http_failed_request_count: { gte: 1 } } } },
        vital_lcp: { percentiles: { field: 'web_vitals.lcp', percents: [75], keyed: false } },
      })
    );
    expect(Object.keys(kpis ?? {})).toEqual(
      expect.arrayContaining(['vital_inp', 'vital_cls', 'vital_fcp', 'vital_ttfb'])
    );
  });
});

describe('toSessionSummary', () => {
  it('maps a session document to the API shape', () => {
    expect(toSessionSummary(sessionDoc)).toEqual({
      sessionId: 'abc',
      serviceName: 'checkout-web',
      startTime: '2026-10-20T10:00:00.000Z',
      endTime: '2026-10-20T10:05:00.000Z',
      durationMs: 300_000,
      eventCount: 42,
      pageViewCount: 3,
      pageLoadCount: 1,
      clickCount: 7,
      jsErrorCount: 2,
      httpRequestCount: 12,
      failedRequestCount: 1,
      bounced: false,
      entryPage: '/',
      exitPage: '/cart',
      journey: ['/', '/products', '/cart'],
      environment: 'production',
      user: 'jane@example.com',
      userAgent: { browser: 'Chrome', browserVersion: '130', os: 'macOS', device: null },
      geo: { countryIso: 'NL', region: 'North Holland', city: 'Amsterdam' },
      webVitals: { lcp: 1800, inp: null, cls: 0.05, fcp: null, ttfb: null },
    });
  });

  it('defaults the fields a document lacks', () => {
    expect(toSessionSummary({ session: { id: 'abc' }, service: { name: 'web' } })).toEqual({
      sessionId: 'abc',
      serviceName: 'web',
      startTime: '',
      endTime: '',
      durationMs: 0,
      eventCount: 0,
      pageViewCount: 0,
      pageLoadCount: 0,
      clickCount: 0,
      jsErrorCount: 0,
      httpRequestCount: 0,
      failedRequestCount: 0,
      bounced: false,
      entryPage: null,
      exitPage: null,
      journey: [],
      environment: null,
      user: null,
      userAgent: { browser: null, browserVersion: null, os: null, device: null },
      geo: { countryIso: null, region: null, city: null },
      webVitals: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
    });
  });

  it('derives bounced from exactly one page view when the document lacks it', () => {
    const withoutBounced = omit(sessionDoc, 'bounced');
    expect(toSessionSummary({ ...withoutBounced, page_view_count: 1 }).bounced).toBe(true);
    expect(toSessionSummary({ ...withoutBounced, page_view_count: 0 }).bounced).toBe(false);
  });

  it('treats empty strings as missing', () => {
    const summary = toSessionSummary({ ...sessionDoc, environment: '', entry_page: '' });
    expect(summary.environment).toBeNull();
    expect(summary.entryPage).toBeNull();
  });
});

describe('parseListSessionsResponse', () => {
  it('returns sessions, facets, KPIs and how long sessions are kept', () => {
    const response = searchResponse({
      hits: {
        total: { value: 120, relation: 'eq' },
        hits: [{ _index: 'digital-experience-sessions-1', _source: sessionDoc }],
      },
      aggregations: {
        browsers: { values: { buckets: [{ key: 'Chrome', doc_count: 80 }] } },
        os: { values: { buckets: [] } },
        countries: { values: { buckets: [{ key: 'NL', doc_count: 12 }] } },
        entryPages: { values: { buckets: [] } },
        kpis: {
          doc_count: 100,
          median_duration: percentile(60_000),
          avg_page_views: { value: 2.5 },
          with_page_views: { doc_count: 80 },
          bounced: { doc_count: 40 },
          with_js_errors: { doc_count: 5 },
          with_failed_requests: { doc_count: 7 },
          vital_lcp: { values: [{ key: 75, value: 2100 }] },
          vital_inp: { values: [{ key: 75, value: null }] },
          vital_cls: { values: [] },
          vital_fcp: { values: [] },
          vital_ttfb: { values: [] },
        },
      },
    });

    const parsed = parseListSessionsResponse(response, { page: 2, perPage: 25 });

    expect(parsed).toEqual({
      sessions: [toSessionSummary(sessionDoc)],
      total: 120,
      page: 2,
      perPage: 25,
      retentionDays: SESSIONS_LOOKBACK_DAYS,
      facets: {
        browsers: [{ key: 'Chrome', count: 80 }],
        os: [],
        countries: [{ key: 'NL', count: 12 }],
        entryPages: [],
      },
      kpis: {
        totalSessions: 100,
        medianDurationMs: 60_000,
        avgPageViews: 2.5,
        // 40 bounced of the 80 sessions with a page view.
        bounceRate: 0.5,
        sessionsWithJsErrors: 5,
        sessionsWithFailedRequests: 7,
        webVitals: { lcp: 2100, inp: null, cls: null, fcp: null, ttfb: null },
      },
    });
  });

  it('has no bounce rate without a session with a page view', () => {
    const response = searchResponse({
      aggregations: {
        browsers: { values: { buckets: [] } },
        os: { values: { buckets: [] } },
        countries: { values: { buckets: [] } },
        entryPages: { values: { buckets: [] } },
        kpis: {
          doc_count: 3,
          median_duration: percentile(1_000),
          avg_page_views: { value: 0 },
          with_page_views: { doc_count: 0 },
          bounced: { doc_count: 0 },
          with_js_errors: { doc_count: 0 },
          with_failed_requests: { doc_count: 0 },
          vital_lcp: { values: [] },
          vital_inp: { values: [] },
          vital_cls: { values: [] },
          vital_fcp: { values: [] },
          vital_ttfb: { values: [] },
        },
      },
    });

    expect(
      parseListSessionsResponse(response, { page: 0, perPage: 25 }).kpis.bounceRate
    ).toBeNull();
  });

  it('leaves out summaries without a session id or service name, which cannot be opened', () => {
    const response = searchResponse({
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: [
          { _index: 'x', _source: sessionDoc },
          { _index: 'x', _source: { ...sessionDoc, session: { id: '' } } },
          { _index: 'x', _source: omit(sessionDoc, 'service') },
        ],
      },
    });

    const { sessions } = parseListSessionsResponse(response, { page: 0, perPage: 25 });
    expect(sessions.map(({ sessionId }) => sessionId)).toEqual(['abc']);
  });

  it('handles an empty or missing sessions index', () => {
    const response = searchResponse({ _shards: { total: 0, successful: 0, failed: 0 } });

    expect(parseListSessionsResponse(response, { page: 0, perPage: 25 })).toEqual({
      sessions: [],
      total: 0,
      page: 0,
      perPage: 25,
      retentionDays: SESSIONS_LOOKBACK_DAYS,
      facets: { browsers: [], os: [], countries: [], entryPages: [] },
      kpis: {
        totalSessions: 0,
        medianDurationMs: null,
        avgPageViews: null,
        bounceRate: null,
        sessionsWithJsErrors: 0,
        sessionsWithFailedRequests: 0,
        webVitals: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
      },
    });
  });

  it('reads a total that is a plain number', () => {
    const response = searchResponse({ hits: { total: 7, hits: [] } });
    expect(parseListSessionsResponse(response, { page: 0, perPage: 25 }).total).toBe(7);
  });
});

describe('listSessions', () => {
  it('searches the sessions as the given client', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.search.mockResolvedValue(
      searchResponse({ hits: { total: { value: 1, relation: 'eq' }, hits: [] } })
    );

    const response = await listSessions(client, baseParams);

    expect(client.search).toHaveBeenCalledWith(buildListSessionsRequest(baseParams));
    expect(response.total).toBe(1);
  });
});
