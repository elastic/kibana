/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistoricalResult } from '../../../../../../mock/historical_results/mock_historical_results_response';
import { fetchHistoricalResultsReducer } from './fetch_historical_results_reducer';

const getInitialState = () => ({
  results: [],
  total: 0,
  isLoading: true,
  error: null,
});

describe('fetchHistoricalResultsReducer', () => {
  describe('on fetch start', () => {
    it('should return initial state', () => {
      expect(fetchHistoricalResultsReducer(getInitialState(), { type: 'FETCH_START' })).toEqual({
        results: [],
        total: 0,
        isLoading: true,
        error: null,
      });
    });
  });

  describe('on fetch success', () => {
    it('should update state with fetched results', () => {
      const results = [mockHistoricalResult];
      const total = 1;

      expect(
        fetchHistoricalResultsReducer(getInitialState(), {
          type: 'FETCH_SUCCESS',
          payload: { results, total },
        })
      ).toEqual({
        results,
        total,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('on fetch error', () => {
    it('should update state with error', () => {
      const error = new Error('An error occurred');

      expect(
        fetchHistoricalResultsReducer(getInitialState(), {
          type: 'FETCH_ERROR',
          payload: error,
        })
      ).toEqual({
        results: [],
        total: 0,
        isLoading: false,
        error,
      });
    });
  });
});
