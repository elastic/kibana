/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalResult } from '../../../../../../types';
import { FetchHistoricalResultsReducerState } from '../types';

type Action =
  | { type: 'FETCH_SUCCESS'; payload: { results: HistoricalResult[]; total: number } }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_ERROR'; payload: Error };

export const fetchHistoricalResultsReducer = (
  state: FetchHistoricalResultsReducerState,
  action: Action
) => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        results: action.payload.results,
        total: action.payload.total,
        isLoading: false,
        error: null,
      };
    case 'FETCH_START':
      return {
        results: [],
        total: 0,
        isLoading: true,
        error: null,
      };
    case 'FETCH_ERROR':
      return {
        results: [],
        total: 0,
        isLoading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};
