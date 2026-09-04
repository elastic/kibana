/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { put, select, takeLatest } from 'redux-saga/effects';
import { uniq } from 'lodash';
import type { MonitorOverviewPageState } from '..';
import type { OverviewStatus } from '../../../../../common/runtime_types';
import { selectOverviewPageState } from '../overview/selectors';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  appendOverviewStatusAction,
  fetchOverviewStatusAction,
  fetchStaleStatusAction,
  quietFetchOverviewStatusAction,
} from './actions';
import { fetchOverviewStatus, fetchStaleStatus } from './api';
import { selectOverviewStatusReducer } from './selectors';
import { getNextWindowRefreshPage } from './window_refresh';

export function* fetchOverviewStatusEffect() {
  yield takeLatest(
    [fetchOverviewStatusAction.get, quietFetchOverviewStatusAction.get],
    fetchEffectFactory(
      fetchOverviewStatus,
      fetchOverviewStatusAction.success,
      fetchOverviewStatusAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}

/**
 * Runs on its own effect (not the shared `takeLatest` above) so an append page
 * request and a full replace/refresh never cancel each other — both land and
 * are reconciled by the reducer (append merges, replace overwrites).
 */
export function* appendOverviewStatusEffect() {
  yield takeLatest(
    appendOverviewStatusAction.get,
    fetchEffectFactory(
      fetchOverviewStatus,
      appendOverviewStatusAction.success,
      appendOverviewStatusAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}

export function* fetchStaleStatusEffect() {
  yield takeLatest(
    fetchStaleStatusAction.get,
    fetchEffectFactory(
      fetchStaleStatus,
      fetchStaleStatusAction.success,
      fetchStaleStatusAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}

/**
 * Worker that, given a completed overview status load, probes any `pending`
 * monitors for a last-known run *before* the window so genuinely stale monitors
 * (those that stopped reporting before the window started) can be promoted from
 * `pending` to `stale`. It only fires for the windowed overview — without a date
 * range there's no "before the window" to look back at.
 */
export function* augmentStaleStatusWorker(
  action: ReturnType<typeof fetchOverviewStatusAction.success>
) {
  const status = action.payload as OverviewStatus;
  const pendingConfigs = status?.pendingConfigs ?? {};
  const monitorQueryIds = uniq(
    Object.values(pendingConfigs).map((config) => config.monitorQueryId)
  ).filter(Boolean);
  if (monitorQueryIds.length === 0) {
    return;
  }

  const pageState: MonitorOverviewPageState = yield select(selectOverviewPageState);
  if (!pageState?.dateRangeStart || !pageState?.dateRangeEnd) {
    return;
  }

  yield put(fetchStaleStatusAction.get({ pageState, monitorQueryIds }));
}

/**
 * After each overview status load, run {@link augmentStaleStatusWorker}. Kept off
 * the main overview request so the page renders fast — the stale promotion lands
 * as a follow-up update once the supplementary lookup resolves.
 */
export function* augmentStaleStatusEffect() {
  yield takeLatest(fetchOverviewStatusAction.success, augmentStaleStatusWorker);
}

/**
 * After a clamped card-window refresh or a grouped full-set fill, fetch the
 * remaining pages one at a time (the route `perPage` max cannot cover the
 * whole result in one request).
 */
export function* refreshRemainingCardWindowWorker(
  action:
    | ReturnType<typeof fetchOverviewStatusAction.success>
    | ReturnType<typeof appendOverviewStatusAction.success>
) {
  const overviewStatus: ReturnType<typeof selectOverviewStatusReducer> = yield select(
    selectOverviewStatusReducer
  );
  const target = overviewStatus.refreshThrough ?? overviewStatus.fillThrough;
  if (target == null || overviewStatus.fillAllInFlight) {
    return;
  }
  const incoming = action.payload;
  const next = getNextWindowRefreshPage(incoming.page, incoming.perPage, target);
  if (!next) {
    return;
  }
  const pageState: MonitorOverviewPageState = yield select(selectOverviewPageState);
  yield put(
    appendOverviewStatusAction.get({
      pageState: { ...pageState, page: next.page, perPage: next.perPage },
      scopeStatusByLocation: overviewStatus.lastRequest?.scopeStatusByLocation,
      statusFilter: overviewStatus.lastRequest?.statusFilter,
      silent: true,
      ...(overviewStatus.fillThrough != null ? { fillAll: true } : {}),
    })
  );
}

export function* refreshRemainingCardWindowEffect() {
  yield takeLatest(
    [fetchOverviewStatusAction.success, appendOverviewStatusAction.success],
    refreshRemainingCardWindowWorker
  );
}
