/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { DataViewManagerScopeName } from '../constants';
import type { RootState } from './reducer';

export const sourcererAdapterSelector = (scope: DataViewManagerScopeName) =>
  createSelector([(state: RootState) => state.dataViewManager], (dataViewManager) => {
    const scopedState = dataViewManager[scope];

    return {
      ...scopedState,
    };
  });

export const sharedStateSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => dataViewManager.shared
);

// NOTE: This will be subject to cleanup tasks https://github.com/elastic/security-team/issues/11959
export const signalIndexNameSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => dataViewManager.shared.signalIndex?.name ?? ''
);

// NOTE: This will be subject to cleanup tasks https://github.com/elastic/security-team/issues/11959
export const signalIndexOutdatedSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => !!dataViewManager.shared.signalIndex?.isOutdated
);
