/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalResult } from '../../../../../types';
import { UseHistoricalResultsFetch } from '../../index_check_flyout/types';

export interface UseHistoricalResultsReturnValue {
  historicalResultsState: FetchHistoricalResultsReducerState;
  fetchHistoricalResults: UseHistoricalResultsFetch;
}

export interface FetchHistoricalResultsReducerState {
  results: HistoricalResult[];
  total: number;
  isLoading: boolean;
  error: Error | null;
}
