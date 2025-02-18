/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FetchHistoricalResultsQueryAction =
  | { type: 'SET_DATE'; payload: { startDate: string; endDate: string } }
  | { type: 'SET_OUTCOME'; payload: 'pass' | 'fail' | undefined }
  | { type: 'SET_FROM'; payload: number }
  | { type: 'SET_SIZE'; payload: number };

export type PaginationReducerAction =
  | { type: 'SET_ROW_SIZE'; payload: { rowSize: number; totalResults: number } }
  | { type: 'SET_ACTIVE_PAGE'; payload: number };

export interface PaginationReducerState {
  rowSize: number;
  pageCount: number;
  activePage: number;
}
