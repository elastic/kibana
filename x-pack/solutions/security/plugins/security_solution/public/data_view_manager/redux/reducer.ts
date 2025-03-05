/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from '@reduxjs/toolkit';

import { DataViewManagerScopeName } from '../constants';
import {
  createDataViewSelectionSlice,
  initialScopeState,
  initialSharedState,
  sharedDataViewManagerSlice,
} from './slices';

export const scopes = {
  [DataViewManagerScopeName.default]: createDataViewSelectionSlice(
    DataViewManagerScopeName.default
  ),
  [DataViewManagerScopeName.timeline]: createDataViewSelectionSlice(
    DataViewManagerScopeName.timeline
  ),
  [DataViewManagerScopeName.detections]: createDataViewSelectionSlice(
    DataViewManagerScopeName.detections
  ),
  [DataViewManagerScopeName.analyzer]: createDataViewSelectionSlice(
    DataViewManagerScopeName.analyzer
  ),
} as const;

export const dataViewManagerReducer = combineReducers({
  [DataViewManagerScopeName.default]: scopes[DataViewManagerScopeName.default].reducer,
  [DataViewManagerScopeName.timeline]: scopes[DataViewManagerScopeName.timeline].reducer,
  [DataViewManagerScopeName.detections]: scopes[DataViewManagerScopeName.detections].reducer,
  [DataViewManagerScopeName.analyzer]: scopes[DataViewManagerScopeName.analyzer].reducer,
  shared: sharedDataViewManagerSlice.reducer,
});

export type DataviewPickerState = ReturnType<typeof dataViewManagerReducer>;

export interface RootState {
  dataViewManager: DataviewPickerState;
}

export const initialDataViewManagerState: RootState = {
  dataViewManager: {
    shared: initialSharedState,
    [DataViewManagerScopeName.default]: initialScopeState,
    [DataViewManagerScopeName.timeline]: initialScopeState,
    [DataViewManagerScopeName.detections]: initialScopeState,
    [DataViewManagerScopeName.analyzer]: initialScopeState,
  },
};
