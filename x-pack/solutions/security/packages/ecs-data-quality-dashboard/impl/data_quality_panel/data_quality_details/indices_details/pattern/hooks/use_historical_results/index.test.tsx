/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { mockHistoricalResult } from '../../../../../mock/historical_results/mock_historical_results_response';
import { TestDataQualityProviders } from '../../../../../mock/test_providers/test_providers';
import * as fetchHistoricalResults from './utils/fetch_historical_results';
import { useHistoricalResults } from '.';

describe('useHistoricalResults', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should return initial historical results state and fetch historical results function', () => {
    const { result } = renderHook(() => useHistoricalResults(), {
      wrapper: TestDataQualityProviders,
    });

    expect(result.current.historicalResultsState).toEqual({
      results: [],
      total: 0,
      isLoading: true,
      error: null,
    });

    expect(result.current.fetchHistoricalResults).toBeInstanceOf(Function);
  });

  describe('when fetchHistoricalResults is called', () => {
    it('should fetch historical results and update historical results state', async () => {
      const fetchResultsSpy = jest
        .spyOn(fetchHistoricalResults, 'fetchHistoricalResults')
        .mockResolvedValue({
          results: [mockHistoricalResult],
          total: 1,
        });

      const { result } = renderHook(() => useHistoricalResults(), {
        wrapper: TestDataQualityProviders,
      });

      const abortController = new AbortController();

      await act(() =>
        result.current.fetchHistoricalResults({
          abortController,
          indexName: 'indexName',
          size: 10,
          from: 0,
          startDate: 'now-7d',
          endDate: 'now',
          outcome: 'pass',
        })
      );

      expect(fetchResultsSpy).toHaveBeenCalledWith({
        indexName: 'indexName',
        httpFetch: expect.any(Function),
        abortController,
        size: 10,
        from: 0,
        startDate: 'now-7d',
        endDate: 'now',
        outcome: 'pass',
      });

      expect(result.current.historicalResultsState).toEqual({
        results: [mockHistoricalResult],
        total: 1,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('when fetchHistoricalResults fails', () => {
    it('should update historical results state with error', async () => {
      const fetchResultsSpy = jest
        .spyOn(fetchHistoricalResults, 'fetchHistoricalResults')
        .mockRejectedValue(new Error('An error occurred'));

      const { result } = renderHook(() => useHistoricalResults(), {
        wrapper: TestDataQualityProviders,
      });

      const abortController = new AbortController();

      await act(() =>
        result.current.fetchHistoricalResults({
          abortController,
          indexName: 'indexName',
          size: 10,
          from: 0,
          startDate: 'now-7d',
          endDate: 'now',
          outcome: 'pass',
        })
      );

      expect(fetchResultsSpy).toHaveBeenCalledWith({
        indexName: 'indexName',
        httpFetch: expect.any(Function),
        abortController,
        size: 10,
        from: 0,
        startDate: 'now-7d',
        endDate: 'now',
        outcome: 'pass',
      });

      expect(result.current.historicalResultsState).toEqual({
        results: [],
        total: 0,
        isLoading: false,
        error: new Error('An error occurred'),
      });
    });
  });

  describe('during fetchHistoricalResults call', () => {
    it('should set isLoading to true', async () => {
      jest.spyOn(fetchHistoricalResults, 'fetchHistoricalResults').mockImplementation(() => {
        return new Promise(() => {});
      });

      const { result } = renderHook(() => useHistoricalResults(), {
        wrapper: TestDataQualityProviders,
      });

      const abortController = new AbortController();

      act(() => {
        result.current.fetchHistoricalResults({
          abortController,
          indexName: 'indexName',
          size: 10,
          from: 0,
          startDate: 'now-7d',
          endDate: 'now',
          outcome: 'pass',
        });
      });

      expect(result.current.historicalResultsState).toEqual({
        results: [],
        total: 0,
        isLoading: true,
        error: null,
      });
    });
  });
});
