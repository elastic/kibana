/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchOverviewStatusAction, quietFetchOverviewStatusAction } from './actions';
import { fetchOverviewStatus } from './api';

export function* fetchOverviewStatusEffect() {
  yield debounce(
    300, // Only take the latest while ignoring any intermediate triggers
    [fetchOverviewStatusAction.get, quietFetchOverviewStatusAction.get],
    fetchEffectFactory(
      fetchOverviewStatus,
      fetchOverviewStatusAction.success,
      fetchOverviewStatusAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}
