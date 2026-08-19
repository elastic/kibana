/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSessionIndexFilters,
  sessionIndexHasReplayQuery,
  sessionIndexParamsFromQuery,
  sessionTrendsAggregation,
  trendsFromSessionHistogram,
} from './rum_sessions_query';

describe('sessionIndexHasReplayQuery', () => {
  it('matches the SDK boolean or leftover replay_event_count', () => {
    expect(sessionIndexHasReplayQuery()).toEqual({
      bool: {
        should: [{ term: { has_replay: true } }, { range: { replay_event_count: { gt: 0 } } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildSessionIndexFilters', () => {
  it('applies service, browser, and frustration on session fields', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      serviceName: 'shop',
      browser: 'Chrome',
      frustration: 'rage',
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { 'service.name': 'shop' } },
        { term: { 'browser.name': 'Chrome' } },
        { range: { rage_click_count: { gt: 0 } } },
      ])
    );
  });

  it('filters connection, device, and error group on dest fields', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      connection: '4g',
      device: '8',
      errorGroup: 'TypeError',
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        { term: { connection: '4g' } },
        { term: { device: '8' } },
        { term: { error_groups: 'TypeError' } },
      ])
    );
  });

  it('ORs comma-separated facet values with terms', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      browser: 'Chrome,Firefox',
      location: 'US,DE',
      connection: '4g,3g',
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        { terms: { 'browser.name': ['Chrome', 'Firefox'] } },
        { terms: { country_iso: ['US', 'DE'] } },
        { terms: { connection: ['4g', '3g'] } },
      ])
    );
  });

  it('excludes bang-prefixed facet values', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      browser: '!Chrome',
      location: '!US,!DE',
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        { bool: { must_not: [{ term: { 'browser.name': 'Chrome' } }] } },
        { bool: { must_not: [{ terms: { country_iso: ['US', 'DE'] } }] } },
      ])
    );
  });

  it('ORs frustration kinds and does not double-apply hasErrors', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      frustration: 'error,rage',
      hasErrors: 'true',
    });
    const errorRanges = filters.filter(
      (clause) => JSON.stringify(clause) === JSON.stringify({ range: { error_count: { gt: 0 } } })
    );
    expect(errorRanges).toHaveLength(1);
    expect(filters).toEqual(expect.arrayContaining([{ range: { rage_click_count: { gt: 0 } } }]));
  });

  it('ORs comma-separated page paths', () => {
    const filters = buildSessionIndexFilters({
      rangeFrom: 'now-30d',
      rangeTo: 'now',
      pageUrl: '/checkout,/cart',
    });
    expect(filters).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    { wildcard: { pages: { value: '*/checkout*', case_insensitive: true } } },
                    {
                      wildcard: { entry_page: { value: '*/checkout*', case_insensitive: true } },
                    },
                    { wildcard: { exit_page: { value: '*/checkout*', case_insensitive: true } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { wildcard: { pages: { value: '*/cart*', case_insensitive: true } } },
                    { wildcard: { entry_page: { value: '*/cart*', case_insensitive: true } } },
                    { wildcard: { exit_page: { value: '*/cart*', case_insensitive: true } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ])
    );
  });
});

describe('sessionTrendsAggregation', () => {
  it('uses calendar days when aligning to daily dest', () => {
    expect(sessionTrendsAggregation('1d')).toEqual({
      date_histogram: { field: 'start_time', calendar_interval: '1d' },
      aggs: {
        page_views: { sum: { field: 'page_view_count' } },
        errors: { sum: { field: 'error_count' } },
      },
    });
  });
});

describe('sessionIndexParamsFromQuery', () => {
  it('copies the overview filters onto session dest fields', () => {
    expect(
      sessionIndexParamsFromQuery({ rangeFrom: 'now-7d/d', serviceName: 'shop' }, '2026-08-15')
    ).toMatchObject({
      rangeFrom: 'now-7d/d',
      serviceName: 'shop',
      watermark: '2026-08-15',
    });
  });
});

describe('trendsFromSessionHistogram', () => {
  it('maps session docs and summed page/error counts', () => {
    expect(
      trendsFromSessionHistogram({
        buckets: [
          {
            key_as_string: '2026-08-01T00:00:00.000Z',
            doc_count: 12,
            page_views: { value: 40 },
            errors: { value: 3 },
          },
        ],
      })
    ).toEqual([
      {
        timestamp: '2026-08-01T00:00:00.000Z',
        sessions: 12,
        pageViews: 40,
        errors: 3,
      },
    ]);
  });
});
