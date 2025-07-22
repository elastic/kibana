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

/**
 * Define registered scopes array.
 */
const REGISTERED_SCOPES = [
  DataViewManagerScopeName.default,
  DataViewManagerScopeName.timeline,
  DataViewManagerScopeName.detections,
  DataViewManagerScopeName.analyzer,
  DataViewManagerScopeName.explore,
] as const;

/**
 * Helper function to create objects with Registered Scope names as keys
 */
const createScopeMap = <T>(
  valueCreator: (scopeName: DataViewManagerScopeName) => T
): Record<DataViewManagerScopeName, T> => {
  return REGISTERED_SCOPES.reduce((acc, scopeName) => {
    acc[scopeName] = valueCreator(scopeName);
    return acc;
  }, {} as Record<DataViewManagerScopeName, T>);
};

/*
 * Create scopes object
 */
export const scopes = createScopeMap(createDataViewSelectionSlice);

/**
 * Create DataViewManager reducer
 */
export const dataViewManagerReducer = combineReducers({
  ...createScopeMap((scopeName) => scopes[scopeName].reducer),
  shared: sharedDataViewManagerSlice.reducer,
});

export type DataviewPickerState = ReturnType<typeof dataViewManagerReducer>;

export interface RootState {
  dataViewManager: DataviewPickerState;
}

/**
 * Create initial state
 */
export const initialDataViewManagerState: RootState = {
  dataViewManager: {
    ...createScopeMap(() => initialScopeState),
    shared: initialSharedState,
  },
};
