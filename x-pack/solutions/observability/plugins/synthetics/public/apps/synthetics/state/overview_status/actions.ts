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
  {
    pageState: MonitorOverviewPageState;
    scopeStatusByLocation?: boolean;
    statusFilter?: string;
    // Grouped views have no pager; remainder pages are filled until `total`.
    fillAll?: boolean;
  },
  PaginatedOverviewStatus
>('fetchOverviewStatusAction');

export const quietFetchOverviewStatusAction = createAsyncAction<
  {
    pageState: MonitorOverviewPageState;
    scopeStatusByLocation?: boolean;
    statusFilter?: string;
    // Timer refreshes skip the loading flag so the table/progress bar does not flicker.
    silent?: boolean;
    // Loaded card-window size when a silent refresh is clamped to the route
    // `perPage` max. Remainder pages are requested until this many configs are
    // covered. See `refreshRemainingCardWindowEffect`.
    refreshThrough?: number;
    // Grouped views have no pager; remainder pages are filled until `total`
    // (appended, not clipped to already-loaded keys).
    fillAll?: boolean;
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
  {
    pageState: MonitorOverviewPageState;
    scopeStatusByLocation?: boolean;
    statusFilter?: string;
    // Remainder pages of a clamped card-window refresh. Skips the loading
    // flag and does not cancel that refresh (unlike user-driven infinite scroll).
    silent?: boolean;
    // Remainder pages of a grouped full-set fill. Dropped if grouping is cancelled.
    fillAll?: boolean;
  },
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
