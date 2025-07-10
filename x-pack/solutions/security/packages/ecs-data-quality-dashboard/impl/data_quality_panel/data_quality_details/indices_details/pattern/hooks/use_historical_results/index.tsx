/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback } from 'react';

import { GET_RESULTS_ERROR_TITLE } from '../../../../../translations';
import { useDataQualityContext } from '../../../../../data_quality_context';
import { useIsMountedRef } from '../../../../../hooks/use_is_mounted_ref';
import { fetchHistoricalResults } from './utils/fetch_historical_results';
import { FetchHistoricalResultsReducerState, UseHistoricalResultsReturnValue } from './types';
import { UseHistoricalResultsFetchOpts } from '../../index_check_flyout/types';
import { fetchHistoricalResultsReducer } from './reducers/fetch_historical_results_reducer';

export const initialFetchHistoricalResultsReducerState: FetchHistoricalResultsReducerState = {
  results: [],
  total: 0,
  isLoading: true,
  error: null,
};

export const useHistoricalResults = (): UseHistoricalResultsReturnValue => {
  const [state, dispatch] = useReducer(
    fetchHistoricalResultsReducer,
    initialFetchHistoricalResultsReducerState
  );
  const { httpFetch, toasts } = useDataQualityContext();
  const { isMountedRef } = useIsMountedRef();

  const fetchResults = useCallback(
    async ({
      abortController,
      indexName,
      size,
      from,
      startDate,
      endDate,
      outcome,
    }: UseHistoricalResultsFetchOpts) => {
      dispatch({ type: 'FETCH_START' });

      try {
        const { results, total } = await fetchHistoricalResults({
          indexName,
          httpFetch,
          abortController,
          size,
          from,
          startDate,
          endDate,
          outcome,
        });

        if (isMountedRef.current) {
          dispatch({
            type: 'FETCH_SUCCESS',
            payload: {
              results,
              total,
            },
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          toasts.addError(error, { title: GET_RESULTS_ERROR_TITLE });
          dispatch({ type: 'FETCH_ERROR', payload: error });
        }
      }
    },
    [dispatch, httpFetch, toasts, isMountedRef]
  );

  return {
    historicalResultsState: {
      results: state.results,
      total: state.total,
      isLoading: state.isLoading,
      error: state.error,
    },
    fetchHistoricalResults: fetchResults,
  };
};
