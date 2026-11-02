/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchPrivateLocationAgentStats } from './api';
import { getAgentStatsAction } from './actions';

export function* fetchAgentStatsEffect() {
  // takeLatest (not takeLeading): a Refresh dispatched mid-fetch cancels the
  // in-flight request and restarts, so an explicit refresh always wins.
  yield takeLatest(
    getAgentStatsAction.get,
    fetchEffectFactory(
      fetchPrivateLocationAgentStats,
      getAgentStatsAction.success,
      getAgentStatsAction.fail
    )
  );
}
