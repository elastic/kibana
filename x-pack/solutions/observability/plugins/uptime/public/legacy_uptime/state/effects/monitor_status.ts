/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getMonitorStatusAction,
  getMonitorStatusActionSuccess,
  getMonitorStatusActionFail,
} from '../actions';
import { fetchMonitorStatus } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchMonitorStatusEffect() {
  yield takeLatest(
    getMonitorStatusAction,
    fetchEffectFactory(
      fetchMonitorStatus,
      getMonitorStatusActionSuccess,
      getMonitorStatusActionFail
    )
  );
}
