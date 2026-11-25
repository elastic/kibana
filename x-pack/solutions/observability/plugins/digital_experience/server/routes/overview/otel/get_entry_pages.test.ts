/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { buildEntryPagesRequest, getEntryPages } from './get_entry_pages';

const HOUR = 60 * 60 * 1000;
const PARAMS = { serviceName: 'storefront-web', start: 2 * HOUR, end: 3 * HOUR };

describe('buildEntryPagesRequest', () => {
  it('reads the sessions of the application that overlap the time range, with an entry page', () => {
    const { query } = buildEntryPagesRequest(PARAMS);

    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { 'service.name': 'storefront-web' } },
        { range: { start_time: { lte: new Date(3 * HOUR).toISOString() } } },
        { range: { end_time: { gte: new Date(2 * HOUR).toISOString() } } },
        { exists: { field: 'entry_page' } },
      ])
    );
  });

  it('keeps the sessions of the environment', () => {
    const { query } = buildEntryPagesRequest({ ...PARAMS, environment: 'production' });

    expect(JSON.stringify(query)).toContain('production');
  });

  it('applies the filters the summaries have, included and excluded', () => {
    const { query } = buildEntryPagesRequest({
      ...PARAMS,
      filters: {
        browser: [
          { value: 'Chrome', exclude: false },
          { value: 'Firefox', exclude: true },
        ],
        country: [{ value: 'DE', exclude: false }],
        appVersion: [{ value: '1.2.0', exclude: false }],
      },
    });

    expect(query.bool.filter).toEqual(
      expect.arrayContaining([
        { terms: { 'user_agent.browser': ['Chrome'] } },
        { bool: { must_not: [{ terms: { 'user_agent.browser': ['Firefox'] } }] } },
        { terms: { 'geo.country_iso': ['DE'] } },
        { terms: { 'service.version': ['1.2.0'] } },
      ])
    );
  });

  it('leaves out the filters that read single events', () => {
    const { query } = buildEntryPagesRequest({
      ...PARAMS,
      filters: {
        pageUrl: [{ value: '/cart', exclude: false }],
        pageContains: [{ value: 'checkout', exclude: false }],
      },
    });

    expect(JSON.stringify(query)).not.toContain('/cart');
    expect(JSON.stringify(query)).not.toContain('checkout');
  });
});

describe('getEntryPages', () => {
  it('lists the pages with their sessions and bounce rate, and the total of the sessions', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 50, relation: 'eq' }, hits: [] },
      aggregations: {
        entry_pages: {
          buckets: [
            { key: '/', doc_count: 30, bounced: { doc_count: 12 } },
            { key: '/products', doc_count: 15, bounced: { doc_count: 0 } },
          ],
        },
      },
    });

    await expect(getEntryPages(client, PARAMS)).resolves.toEqual({
      entryPages: [
        { page: '/', sessions: 30, bounceRate: 0.4 },
        { page: '/products', sessions: 15, bounceRate: 0 },
      ],
      totalSessions: 50,
    });
  });

  it('is empty without summaries', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });

    await expect(getEntryPages(client, PARAMS)).resolves.toEqual({
      entryPages: [],
      totalSessions: 0,
    });
  });
});
