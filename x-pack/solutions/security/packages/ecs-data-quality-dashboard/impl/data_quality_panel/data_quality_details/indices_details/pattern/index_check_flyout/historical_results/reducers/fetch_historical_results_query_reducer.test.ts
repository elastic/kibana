/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialFetchHistoricalResultsQueryState } from '..';
import { fetchHistoricalResultsQueryReducer } from './fetch_historical_results_query_reducer';

describe('fetchHistoricalResultsQueryReducer', () => {
  describe('on SET_DATE', () => {
    it('should set startDate and endDate and reset from to 0', () => {
      const state = {
        ...initialFetchHistoricalResultsQueryState,
      } as const;
      const action = {
        type: 'SET_DATE',
        payload: { startDate: '2021-02-01', endDate: '2021-02-28' },
      } as const;
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual({
        ...initialFetchHistoricalResultsQueryState,
        startDate: '2021-02-01',
        endDate: '2021-02-28',
        from: 0,
      });
    });
  });

  describe('on SET_OUTCOME', () => {
    it('should set outcome and reset from to 0', () => {
      const state = {
        ...initialFetchHistoricalResultsQueryState,
        outcome: 'pass',
        from: 10,
      } as const;
      const action = { type: 'SET_OUTCOME', payload: 'fail' } as const;
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual({
        ...initialFetchHistoricalResultsQueryState,
        outcome: 'fail',
        from: 0,
      });
    });

    it('should omit outcome from the query', () => {
      const state = {
        ...initialFetchHistoricalResultsQueryState,
        outcome: 'pass',
        from: 10,
      } as const;
      const action = { type: 'SET_OUTCOME' as const, payload: undefined } as const;
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual({ ...initialFetchHistoricalResultsQueryState, from: 0 });
    });
  });

  describe('on SET_FROM', () => {
    it('should set from', () => {
      const state = { ...initialFetchHistoricalResultsQueryState, from: 10 } as const;
      const action = { type: 'SET_FROM' as const, payload: 20 } as const;
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual({ ...initialFetchHistoricalResultsQueryState, from: 20 });
    });
  });

  describe('on SET_SIZE', () => {
    it('should set size and reset from to 0', () => {
      const state = { ...initialFetchHistoricalResultsQueryState, size: 10, from: 10 } as const;
      const action = { type: 'SET_SIZE' as const, payload: 20 } as const;
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual({ ...initialFetchHistoricalResultsQueryState, size: 20, from: 0 });
    });
  });

  describe('on unknown action', () => {
    it('should return the state', () => {
      const state = { ...initialFetchHistoricalResultsQueryState, size: 10, from: 10 } as const;
      const action = { type: 'UNKNOWN_ACTION' };
      // @ts-expect-error
      const newState = fetchHistoricalResultsQueryReducer(state, action);
      expect(newState).toEqual(state);
    });
  });
});
