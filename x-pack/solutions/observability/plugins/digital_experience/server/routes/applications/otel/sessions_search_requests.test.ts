/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { getBucketSizeSeconds } from '../../../lib/helpers/time_series';
import { MAX_APPLICATIONS_PER_SOURCE, MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';
import { sessionsSearch } from './sessions_search_requests';

const START = Date.parse('2021-01-18T12:00:00.000Z');
const END = Date.parse('2021-01-18T13:00:00.000Z');

// The part of an aggregation the tests read; the client types it too loosely to navigate.
interface Aggregation {
  filter?: unknown;
  terms?: unknown;
  date_histogram?: unknown;
  percentiles?: { field: string };
  aggs: Record<string, Aggregation>;
}

const aggregationsOf = (environment?: string) =>
  sessionsSearch({ start: START, end: END, environment }).aggs as unknown as Record<
    string,
    Aggregation
  >;

const inEnvironment = (environment?: string) => aggregationsOf(environment).inEnvironment;

describe('sessionsSearch', () => {
  it('reads the sessions index without hits, failing rather than returning partial results', () => {
    expect(sessionsSearch({ start: START, end: END })).toMatchObject({
      index: 'digital-experience-sessions-*',
      size: 0,
      track_total_hits: false,
      ignore_unavailable: true,
      allow_partial_search_results: false,
    });
  });

  it('matches the sessions that overlap the time range', () => {
    expect(sessionsSearch({ start: START, end: END }).query).toEqual({
      bool: {
        filter: [
          { range: { start_time: { lte: END, format: 'epoch_millis' } } },
          { range: { end_time: { gte: START, format: 'epoch_millis' } } },
        ],
      },
    });
  });

  it('adds up the counts the sessions transform keeps, per application', () => {
    const { applications } = inEnvironment().aggs;

    expect(applications.terms).toEqual({
      field: 'service.name',
      size: MAX_APPLICATIONS_PER_SOURCE,
      order: { pageLoads: 'desc' },
    });
    expect(applications.aggs).toMatchObject({
      environments: { terms: { field: 'environment', size: MAX_ENVIRONMENTS_PER_APPLICATION } },
      pageLoads: { sum: { field: 'page_load_count' } },
      jsErrors: { sum: { field: 'js_error_count' } },
      httpRequests: { sum: { field: 'http_request_count' } },
      failedHttpRequests: { sum: { field: 'http_failed_request_count' } },
      lastSeen: { max: { field: 'end_time' } },
    });
  });

  it('adds up the samples of each vital and takes the p75 of the sessions p75', () => {
    const { aggs } = inEnvironment().aggs.applications;

    expect(aggs.lcp.aggs).toEqual({
      samples: { sum: { field: 'web_vital_samples.lcp.count' } },
      good: { sum: { field: 'web_vital_samples.lcp.good' } },
      needsImprovement: { sum: { field: 'web_vital_samples.lcp.needs_improvement' } },
      p75: { percentiles: { field: 'web_vitals.lcp', percents: [75], keyed: false } },
    });
    for (const vital of ['inp', 'cls', 'fcp', 'ttfb']) {
      expect(aggs[vital].aggs.p75.percentiles?.field).toBe(`web_vitals.${vital}`);
    }
  });

  it('charts the page loads by session start, in the buckets of the time range only', () => {
    const { pageLoadsOverTime } = inEnvironment().aggs;

    expect(pageLoadsOverTime.date_histogram).toEqual({
      field: 'start_time',
      fixed_interval: `${getBucketSizeSeconds(START, END)}s`,
      min_doc_count: 0,
      extended_bounds: { min: START, max: END },
      hard_bounds: { min: START, max: END },
    });
    expect(pageLoadsOverTime.aggs).toEqual({ pageLoads: { sum: { field: 'page_load_count' } } });
  });

  describe('environment', () => {
    it('lists every environment for the picker, whatever the selected one', () => {
      const aggs = aggregationsOf('production');

      expect(aggs.environments.terms).toMatchObject({ field: 'environment', size: 100 });
      expect(aggs.environmentNotDefined.filter).toEqual({
        bool: {
          should: [
            { term: { 'service.environment': ENVIRONMENT_NOT_DEFINED_VALUE } },
            { bool: { must_not: [{ exists: { field: 'environment' } }] } },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('narrows the applications and the chart to the selected environment', () => {
      expect(inEnvironment('production').filter).toEqual({
        bool: { should: [{ term: { environment: 'production' } }], minimum_should_match: 1 },
      });
    });

    it('takes every environment without a selection', () => {
      expect(inEnvironment().filter).toEqual({ match_all: {} });
    });

    it('takes the sessions without an environment for "Not defined"', () => {
      expect(JSON.stringify(inEnvironment(ENVIRONMENT_NOT_DEFINED_VALUE).filter)).toContain(
        '"must_not":[{"exists":{"field":"environment"}}]'
      );
    });
  });
});
