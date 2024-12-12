/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_VERSION } from '../../../../../../constants';
import {
  DEFAULT_HISTORICAL_RESULTS_END_DATE,
  DEFAULT_HISTORICAL_RESULTS_START_DATE,
} from '../../../index_check_flyout/constants';
import { fetchHistoricalResults } from './fetch_historical_results';

const indexName = 'test-index';

const path = `/internal/ecs_data_quality_dashboard/results/${indexName}`;
const opts = {
  method: 'GET',
  query: {
    endDate: DEFAULT_HISTORICAL_RESULTS_END_DATE,
    startDate: DEFAULT_HISTORICAL_RESULTS_START_DATE,
  },
  version: INTERNAL_API_VERSION,
};

describe('fetchHistoricalResults', () => {
  it('should call historical results api for given indexName, internal api version with last week query params and abortcontroller signal', async () => {
    const httpFetch = jest.fn().mockResolvedValue({ data: [], total: 0 });
    const abortController = new AbortController();
    await fetchHistoricalResults({
      indexName,
      httpFetch,
      abortController,
    });
    expect(httpFetch).toHaveBeenCalledWith(path, {
      ...opts,
      signal: abortController.signal,
    });
  });

  it('should return with historical results and total', async () => {
    const httpFetch = jest.fn().mockResolvedValue({ data: [], total: 0 });
    await expect(
      fetchHistoricalResults({
        indexName,
        httpFetch,
        abortController: new AbortController(),
      })
    ).resolves.toEqual({ results: [], total: 0 });
  });

  describe('given additional query params', () => {
    it('should include them in the query', async () => {
      const httpFetch = jest.fn().mockResolvedValue({ data: [], total: 0 });
      const abortController = new AbortController();
      await fetchHistoricalResults({
        indexName: 'test-index',
        httpFetch,
        abortController: new AbortController(),
        startDate: 'now-2d/d',
        endDate: 'now-1d/d',
        size: 10,
        from: 0,
        outcome: 'pass',
      });

      expect(httpFetch).toHaveBeenCalledWith(path, {
        ...opts,
        query: {
          ...opts.query,
          startDate: 'now-2d/d',
          endDate: 'now-1d/d',
          size: 10,
          from: 0,
          outcome: 'pass',
        },
        signal: abortController.signal,
      });
    });
  });
});
