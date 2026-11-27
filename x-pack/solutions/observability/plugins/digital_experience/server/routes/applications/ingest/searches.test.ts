/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countsSearch, mobileCountsQuery, overTimeSearch } from './searches';

const documents = { index: ['logs-*.otel-*'], filter: [{ term: { 'service.name': 'x' } }] };

describe('ingest searches', () => {
  it('counts each application per index in the time range, missing indices allowed', () => {
    const request = countsSearch({ documents, start: 1, end: 2 });

    expect(request).toMatchObject({
      index: ['logs-*.otel-*'],
      size: 0,
      ignore_unavailable: true,
      allow_partial_search_results: false,
      aggs: {
        applications: {
          terms: { field: 'service.name' },
          aggs: { indices: { terms: { field: '_index' } } },
        },
      },
    });
    expect(request.query).toEqual({
      bool: { filter: expect.arrayContaining([{ term: { 'service.name': 'x' } }]) },
    });
  });

  it("buckets every document and the given applications' documents per index", () => {
    const request = overTimeSearch({
      documents,
      start: 0,
      end: 3600_000,
      histogram: { interval: { value: 60, unit: 's' }, timeZone: 'UTC' },
      serviceNames: ['shop', 'docs'],
    });

    expect(request.aggs.overTime).toMatchObject({
      date_histogram: { fixed_interval: '60s', time_zone: 'UTC' },
      aggs: {
        indices: { terms: { field: '_index' } },
        top: {
          filter: { bool: { filter: [{ terms: { 'service.name': ['shop', 'docs'] } }] } },
          aggs: { applications: { terms: { field: 'service.name', size: 2 } } },
        },
      },
    });
  });

  it('counts the mobile documents per application and index with ES|QL', () => {
    const { query } = mobileCountsQuery().toRequest();

    expect(query).toContain('METADATA _index');
    expect(query).toContain('STATS docs = COUNT(*) BY `service.name`, _index');
  });
});
