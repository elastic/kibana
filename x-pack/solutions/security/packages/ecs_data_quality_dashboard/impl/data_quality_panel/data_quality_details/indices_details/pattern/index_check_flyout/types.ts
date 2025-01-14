/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core-http-browser';
import { HISTORY_TAB_ID, LATEST_CHECK_TAB_ID } from '../constants';

export interface FetchHistoricalResultsOpts extends Partial<FetchHistoricalResultsQueryState> {
  indexName: string;
  httpFetch: HttpHandler;
  abortController: AbortController;
}

export type UseHistoricalResultsFetchOpts = Omit<FetchHistoricalResultsOpts, 'httpFetch'>;

export type UseHistoricalResultsFetch = (opts: UseHistoricalResultsFetchOpts) => Promise<void>;

export interface FetchHistoricalResultsQueryState {
  from: number;
  size: number;
  startDate: string;
  endDate: string;
  outcome?: 'pass' | 'fail';
}

export type IndexCheckFlyoutTabId = typeof HISTORY_TAB_ID | typeof LATEST_CHECK_TAB_ID;
