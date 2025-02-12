/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { DataViewPickerScopeName } from '../constants';
import type { RootState } from './reducer';

export const sourcererAdapterSelector = (scope: DataViewPickerScopeName) =>
  createSelector([(state: RootState) => state.dataViewPicker], (dataViewPicker) => {
    const scopedState = dataViewPicker[scope];

    return {
      ...scopedState,
      dataView: scopedState.dataView ? scopedState.dataView : { title: '', id: '' },
      indicesExist: !!dataViewPicker[scope]?.dataView?.title?.split(',')?.length,
    };
  });

export const sharedStateSelector = createSelector(
  [(state: RootState) => state.dataViewPicker],
  (dataViewPicker) => dataViewPicker.shared
);
