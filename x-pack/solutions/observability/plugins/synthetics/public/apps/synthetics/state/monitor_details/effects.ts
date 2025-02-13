/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { takeLeading, takeEvery, select, put } from 'redux-saga/effects';

import { ConfigKey, Ping, PingsResponse } from '../../../../../common/runtime_types';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  getMonitorLastRunAction,
  getMonitorRecentPingsAction,
  getMonitorAction,
  updateMonitorLastRunAction,
} from './actions';
import { fetchSyntheticsMonitor, fetchMonitorRecentPings, fetchLatestTestRun } from './api';
import { selectLastRunMetadata } from './selectors';

export function* fetchSyntheticsMonitorEffect() {
  yield takeLeading(
    getMonitorRecentPingsAction.get,
    fetchEffectFactory(
      fetchMonitorRecentPings,
      getMonitorRecentPingsAction.success,
      getMonitorRecentPingsAction.fail
    )
  );

  yield takeLeading(
    getMonitorLastRunAction.get,
    fetchEffectFactory(
      fetchLatestTestRun,
      getMonitorLastRunAction.success,
      getMonitorLastRunAction.fail
    )
  );

  // Additional listener on `getMonitorRecentPingsAction.success` to possibly update the `lastRun` as well
  yield takeEvery(
    getMonitorRecentPingsAction.success,
    function* (action: PayloadAction<PingsResponse>): Generator {
      // If `lastRun` and pings from `getMonitorRecentPingsAction` are of the same monitor and location AND
      // `getMonitorRecentPingsAction` fetched the latest pings than `lastRun`, update `lastRun` as well
      const lastRun = yield select(selectLastRunMetadata);
      const lastRunPing = (lastRun as { data?: Ping })?.data;
      const recentPingFromList = action.payload?.pings[0];

      if (
        lastRunPing &&
        recentPingFromList &&
        lastRunPing?.[ConfigKey.CONFIG_ID] &&
        recentPingFromList?.[ConfigKey.CONFIG_ID] &&
        lastRunPing?.[ConfigKey.CONFIG_ID] === recentPingFromList?.[ConfigKey.CONFIG_ID] &&
        lastRunPing?.observer?.geo?.name === recentPingFromList?.observer?.geo?.name &&
        new Date(lastRunPing?.timestamp) < new Date(recentPingFromList?.timestamp)
      ) {
        yield put(updateMonitorLastRunAction({ data: recentPingFromList }));
      }
    }
  );

  yield takeLeading(
    getMonitorAction.get,
    fetchEffectFactory(fetchSyntheticsMonitor, getMonitorAction.success, getMonitorAction.fail)
  );
}
