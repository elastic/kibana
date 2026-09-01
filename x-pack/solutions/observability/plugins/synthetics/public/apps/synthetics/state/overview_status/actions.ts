/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createAction } from 'redux-toolkit-v1';
import type { MonitorOverviewPageState } from '..';
import { createAsyncAction } from '../utils/actions';

import type {
  OverviewStaleStatus,
  PaginatedOverviewStatus,
} from '../../../../../common/runtime_types';

export const fetchOverviewStatusAction = createAsyncAction<
  { pageState: MonitorOverviewPageState; scopeStatusByLocation?: boolean; statusFilter?: string },
  PaginatedOverviewStatus
>('fetchOverviewStatusAction');

export const quietFetchOverviewStatusAction = createAsyncAction<
  {
    pageState: MonitorOverviewPageState;
    scopeStatusByLocation?: boolean;
    statusFilter?: string;
    // Timer refreshes skip the loading flag so the table/progress bar does not flicker.
    silent?: boolean;
  },
  PaginatedOverviewStatus
>('quietFetchOverviewStatusAction');

/**
 * Fetch the next page of monitors and merge it into the current overview status
 * instead of replacing it. Powers the card view's infinite scroll: the server
 * still paginates by monitor, and each appended page is accumulated client-side
 * (deduped by `configId`) so the already-rendered cards stay put.
 */
export const appendOverviewStatusAction = createAsyncAction<
  { pageState: MonitorOverviewPageState; scopeStatusByLocation?: boolean; statusFilter?: string },
  PaginatedOverviewStatus
>('appendOverviewStatusAction');

/**
 * Supplementary lookup that promotes `pending` monitors which stopped reporting
 * before the overview window started to `stale`. Triggered automatically after
 * each overview status load (see `augmentStaleStatusEffect`).
 */
export const fetchStaleStatusAction = createAsyncAction<
  { pageState: MonitorOverviewPageState; monitorQueryIds: string[] },
  OverviewStaleStatus
>('fetchStaleStatusAction');

export const clearOverviewStatusErrorAction = createAction<void>('clearOverviewStatusErrorAction');
export const initialLoadReported = createAction<void>('initialLoadReported');
