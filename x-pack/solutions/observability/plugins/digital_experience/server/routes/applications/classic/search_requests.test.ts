/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classicSearch } from './search_requests';

const applicationAggsOf = (request: ReturnType<typeof classicSearch>) =>
  (
    request.aggs?.inEnvironment as {
      aggs: { applications: { aggs: Record<string, unknown> } };
    }
  ).aggs.applications.aggs;

describe('classicSearch', () => {
  it('fails instead of returning partial results', () => {
    expect(classicSearch({ start: 10, end: 20 }).allow_partial_search_results).toBe(false);
  });

  it('counts page loads from the page-load transactions only', () => {
    expect(applicationAggsOf(classicSearch({ start: 10, end: 20 })).pageLoads).toEqual({
      filter: {
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            { term: { 'transaction.type': 'page-load' } },
          ],
        },
      },
    });
  });

  it('counts JS errors from the error documents', () => {
    expect(applicationAggsOf(classicSearch({ start: 10, end: 20 })).jsErrors).toEqual({
      filter: { bool: { filter: [{ term: { 'processor.event': 'error' } }] } },
    });
  });

  it('counts successful HTTP requests from the external spans', () => {
    expect(applicationAggsOf(classicSearch({ start: 10, end: 20 })).httpSuccess).toEqual({
      filter: {
        bool: {
          filter: [
            { term: { 'processor.event': 'span' } },
            { term: { 'span.type': 'external' } },
            { term: { 'event.outcome': 'success' } },
          ],
        },
      },
    });
  });

  it('lists up to 10 environments per application', () => {
    expect(applicationAggsOf(classicSearch({ start: 10, end: 20 })).environments).toEqual({
      terms: { field: 'service.environment', size: 10 },
    });
  });

  it('counts the page loads over time in the selected environment', () => {
    const { aggs } = classicSearch({ start: 0, end: 60 * 60 * 1000 }).aggs?.inEnvironment as {
      aggs: Record<string, unknown>;
    };

    expect(aggs.pageLoadsOverTime).toEqual({
      filter: {
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            { term: { 'transaction.type': 'page-load' } },
          ],
        },
      },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '60s',
            min_doc_count: 0,
            extended_bounds: { min: 0, max: 60 * 60 * 1000 },
          },
        },
      },
    });
  });
});
