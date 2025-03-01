/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { DataViewPickerScopeName } from '../constants';
import {
  createDataViewSelectionSlice,
  initialScopeState,
  initialSharedState,
  shared,
} from './slices';

export const scopes = {
  [DataViewPickerScopeName.default]: createDataViewSelectionSlice(DataViewPickerScopeName.default),
  [DataViewPickerScopeName.timeline]: createDataViewSelectionSlice(
    DataViewPickerScopeName.timeline
  ),
  [DataViewPickerScopeName.detections]: createDataViewSelectionSlice(
    DataViewPickerScopeName.detections
  ),
  [DataViewPickerScopeName.analyzer]: createDataViewSelectionSlice(
    DataViewPickerScopeName.analyzer
  ),
} as const;

export const dataViewPickerReducer = combineReducers({
  [DataViewPickerScopeName.default]: scopes[DataViewPickerScopeName.default].reducer,
  [DataViewPickerScopeName.timeline]: scopes[DataViewPickerScopeName.timeline].reducer,
  [DataViewPickerScopeName.detections]: scopes[DataViewPickerScopeName.detections].reducer,
  [DataViewPickerScopeName.analyzer]: scopes[DataViewPickerScopeName.analyzer].reducer,
  shared: shared.reducer,
});

export type DataviewPickerState = ReturnType<typeof dataViewPickerReducer>;

export interface RootState {
  dataViewPicker: DataviewPickerState;
}

export const initialDataViewPickerState: RootState = {
  dataViewPicker: {
    shared: initialSharedState,
    [DataViewPickerScopeName.default]: initialScopeState,
    [DataViewPickerScopeName.timeline]: initialScopeState,
    [DataViewPickerScopeName.detections]: initialScopeState,
    [DataViewPickerScopeName.analyzer]: initialScopeState,
  },
};
