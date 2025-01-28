/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorStatusHeatmap as api } from './api';

import { getMonitorStatusHeatmapAction, quietGetMonitorStatusHeatmapAction } from './actions';

export function* fetchMonitorStatusHeatmap() {
  yield takeLatest(
    getMonitorStatusHeatmapAction.get,
    fetchEffectFactory(
      api,
      getMonitorStatusHeatmapAction.success,
      getMonitorStatusHeatmapAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}

export function* quietFetchMonitorStatusHeatmap() {
  yield takeLatest(
    quietGetMonitorStatusHeatmapAction.get,
    fetchEffectFactory(
      api,
      getMonitorStatusHeatmapAction.success,
      getMonitorStatusHeatmapAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}
