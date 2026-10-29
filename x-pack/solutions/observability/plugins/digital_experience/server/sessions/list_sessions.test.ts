/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { omit } from 'lodash';
import { SESSIONS_INDEX_PATTERN } from '../../common/sessions';
import {
  buildListSessionsRequest,
  parseListSessionsResponse,
  toSessionSummary,
  type ListSessionsAggs,
  type ListSessionsParams,
  type SessionDocument,
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

const sessionDoc: SessionDocument = {
  session: { id: 'abc' },
  service: { name: 'checkout-web' },
  start_time: '2026-10-20T10:00:00.000Z',
  end_time: '2026-10-20T10:05:00.000Z',
  duration_ms: 300_000,
  event_count: 42,
  page_view_count: 3,
  click_count: 7,
  error_count: 1,
  bounced: false,
  entry_page: '/',
  exit_page: '/cart',
  journey: ['/', '/products', '/cart'],
  user: { key: 'jane@example.com' },
  user_agent: { browser: 'Chrome', browser_version: '130', os: 'macOS', device: null },
  geo: { country_iso: 'NL', region: 'North Holland', city: 'Amsterdam' },
  web_vitals: { lcp: 1800, cls: 0.05 },
};

describe('buildListSessionsRequest', () => {
  it('scopes to the application and sessions overlapping the range', () => {
    const request = buildListSessionsRequest(baseParams);
    expect(request.index).toBe(SESSIONS_INDEX_PATTERN);
    expect(request.query?.bool?.filter).toEqual([
      { term: { 'service.name': 'checkout-web' } },
      { range: { start_time: { lte: baseParams.end } } },
      { range: { end_time: { gte: baseParams.start } } },
    ]);
  });

  it('sorts with a session.id tiebreaker and paginates', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      sortField: 'duration_ms',
      sortDirection: 'asc',
      page: 2,
      perPage: 10,
    });
    expect(request.sort).toEqual([{ duration_ms: 'asc' }, { 'session.id': 'asc' }]);
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

  it('searches session id exactly and other fields with escaped wildcards', () => {
    const request = buildListSessionsRequest({ ...baseParams, query: ' ch*ckout ' });
    const filters = request.query?.bool?.filter as Array<Record<string, unknown>>;
    const search = filters[3] as { bool: { should: Array<Record<string, unknown>> } };
    expect(search.bool.should[0]).toEqual({ term: { 'session.id': 'ch*ckout' } });
    expect(search.bool.should[1]).toEqual({
      wildcard: { 'user.key': { value: '*ch\\*ckout*', case_insensitive: true } },
    });
  });

  it('applies facet selections as a post filter and excludes each facet from its own counts', () => {
    const request = buildListSessionsRequest({
      ...baseParams,
      facets: { browsers: 'Chrome', countries: 'NL' },
    });
    const failed = { exists: { field: 'error.message' } };
    expect(request.post_filter).toEqual({
      bool: {
        filter: [
          { term: { 'user_agent.browser': 'Chrome' } },
          { term: { 'geo.country_iso': 'NL' } },
        ],
        must_not: [failed],
      },
    });
    expect(request.aggs?.browsers.filter).toEqual({
      bool: { filter: [{ term: { 'geo.country_iso': 'NL' } }], must_not: [failed] },
    });
    expect(request.aggs?.os.filter).toEqual(request.post_filter);
    expect(request.aggs?.kpis.filter).toEqual(request.post_filter);
  });

  it('leaves summaries the pipeline failed on out of the list and KPIs, and counts them', () => {
    const request = buildListSessionsRequest(baseParams);
    const failed = { exists: { field: 'error.message' } };
    expect(request.post_filter).toEqual({ bool: { filter: [], must_not: [failed] } });
    expect(request.aggs?.kpis.filter).toEqual(request.post_filter);
    expect(request.aggs?.failed_summaries.filter).toEqual({ bool: { filter: [failed] } });
  });

  it('computes the bounce rate over sessions with a page view', () => {
    const request = buildListSessionsRequest(baseParams);
    expect(request.aggs?.kpis.aggs?.with_page_views).toEqual({
      filter: { range: { page_view_count: { gte: 1 } } },
    });
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
      clickCount: 7,
      errorCount: 1,
      bounced: false,
      entryPage: '/',
      exitPage: '/cart',
      journey: ['/', '/products', '/cart'],
      user: 'jane@example.com',
      userAgent: { browser: 'Chrome', browserVersion: '130', os: 'macOS', device: null },
      geo: { countryIso: 'NL', region: 'North Holland', city: 'Amsterdam' },
      webVitals: { lcp: 1800, inp: null, cls: 0.05, fcp: null, ttfb: null },
    });
  });

  it('derives bounced from exactly one page view when the document lacks it', () => {
    const withoutBounced = omit(sessionDoc, 'bounced');
    expect(toSessionSummary({ ...withoutBounced, page_view_count: 1 }).bounced).toBe(true);
    expect(toSessionSummary({ ...withoutBounced, page_view_count: 0 }).bounced).toBe(false);
  });

  it('normalizes a single-page journey stored as a string', () => {
    expect(toSessionSummary({ ...sessionDoc, journey: '/' }).journey).toEqual(['/']);
  });
});

describe('parseListSessionsResponse', () => {
  it('returns sessions, facets and KPIs', () => {
    const response = {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { total: { value: 120, relation: 'eq' }, hits: [{ _index: 'x', _source: sessionDoc }] },
      aggregations: {
        browsers: {
          doc_count: 120,
          values: { buckets: [{ key: 'Chrome', doc_count: 80 }] },
        },
        os: { doc_count: 120, values: { buckets: [] } },
        countries: { doc_count: 120, values: { buckets: [{ key: 'NL', doc_count: 12 }] } },
        entryPages: { doc_count: 120, values: { buckets: [] } },
        kpis: {
          doc_count: 100,
          median_duration: { values: { '50.0': 60_000 } },
          avg_page_views: { value: 2.5 },
          with_page_views: { doc_count: 80 },
          bounced: { doc_count: 40 },
          with_errors: { doc_count: 5 },
          vital_lcp: { values: { '75.0': 2100 } },
        },
        failed_summaries: { doc_count: 3 },
      },
    } as unknown as SearchResponse<SessionDocument, ListSessionsAggs>;

    const parsed = parseListSessionsResponse(response, { page: 0, perPage: 25 });

    expect(parsed.total).toBe(120);
    expect(parsed.failedSummaries).toBe(3);
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.facets.browsers).toEqual([{ key: 'Chrome', count: 80 }]);
    expect(parsed.facets.countries).toEqual([{ key: 'NL', count: 12 }]);
    expect(parsed.kpis).toEqual({
      totalSessions: 100,
      medianDurationMs: 60_000,
      avgPageViews: 2.5,
      // 40 bounced of the 80 sessions with a page view.
      bounceRate: 0.5,
      sessionsWithErrors: 5,
      webVitals: { lcp: 2100, inp: null, cls: null, fcp: null, ttfb: null },
    });
  });

  it('leaves out summaries without a session id or service name, which cannot be opened', () => {
    const response = {
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: [
          { _index: 'x', _source: sessionDoc },
          { _index: 'x', _source: { ...sessionDoc, session: { id: '' } } },
          { _index: 'x', _source: { ...sessionDoc, service: {} } },
        ],
      },
    } as unknown as SearchResponse<SessionDocument, ListSessionsAggs>;

    const { sessions } = parseListSessionsResponse(response, { page: 0, perPage: 25 });
    expect(sessions.map(({ sessionId }) => sessionId)).toEqual([sessionDoc.session?.id]);
  });

  it('handles an empty or missing sessions index', () => {
    const response = {
      took: 1,
      timed_out: false,
      _shards: { total: 0, successful: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    } as unknown as SearchResponse<SessionDocument, ListSessionsAggs>;

    expect(parseListSessionsResponse(response, { page: 0, perPage: 25 })).toEqual(
      expect.objectContaining({
        sessions: [],
        total: 0,
        failedSummaries: 0,
        kpis: expect.objectContaining({ totalSessions: 0, bounceRate: null }),
      })
    );
  });
});
