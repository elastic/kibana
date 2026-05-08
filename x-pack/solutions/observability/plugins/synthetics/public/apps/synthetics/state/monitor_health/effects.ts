/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorsHealth } from './api';
import { fetchMonitorHealthAction } from './actions';

export function* fetchMonitorHealthEffect() {
  yield debounce(
    100,
    fetchMonitorHealthAction.get,
    fetchEffectFactory(
      fetchMonitorsHealth,
      fetchMonitorHealthAction.success,
      fetchMonitorHealthAction.fail
    )
  );
}
