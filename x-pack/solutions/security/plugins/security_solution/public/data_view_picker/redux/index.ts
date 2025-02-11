/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  combineReducers,
  createSlice,
  createSelector,
  createAction,
  type PayloadAction,
} from '@reduxjs/toolkit';

import { DataViewPickerScopeName, SLICE_PREFIX } from '../constants';

export interface ScopedDataViewSelectionState {
  dataView: DataViewSpec | null;
  /**
   * There are several states the picker can be in internally:
   * - pristine - not initialized yet
   * - loading
   * - error - some kind of a problem during data init
   * - ready - ready to provide index information to the client
   */
  status: 'pristine' | 'loading' | 'error' | 'ready';
}

export interface SharedDataViewSelectionState {
  dataViews: DataViewSpec[];
  adhocDataViews: DataViewSpec[];
  status: 'pristine' | 'loading' | 'error' | 'ready';
}

export const initialScopeState: ScopedDataViewSelectionState = {
  dataView: null,
  status: 'pristine',
};

export const initialSharedState: SharedDataViewSelectionState = {
  dataViews: [],
  adhocDataViews: [],
  status: 'pristine',
};

export const selectDataViewAsync = createAction<{
  id?: string;
  patterns?: string[];
  scope: DataViewPickerScopeName;
}>(`${SLICE_PREFIX}/selectDataView`);

const createDataViewSelectionSlice = <T extends string>(scopeName: T) =>
  createSlice({
    name: `${SLICE_PREFIX}/${scopeName}`,
    initialState: initialScopeState,
    reducers: {
      setSelectedDataView: (state, action: PayloadAction<DataViewSpec>) => {
        console.log('setSelectedDataView', action.payload);

        state.dataView = action.payload;
        state.status = 'ready';
      },
    },
    extraReducers(builder) {
      builder.addCase(selectDataViewAsync, (state, action) => {
        if (action.payload.scope !== scopeName) {
          return state;
        }

        state.status = 'loading';
      });
    },
  });

export const shared = createSlice({
  name: `${SLICE_PREFIX}/shared`,
  initialState: initialSharedState,
  reducers: {
    setDataViews: (state, action: PayloadAction<DataViewSpec[]>) => {
      state.dataViews = action.payload;
    },
    addAdhocDataView: (state, action: PayloadAction<DataViewSpec>) => {
      if (state.adhocDataViews.find((dv) => dv.title === action.payload.title)) {
        return;
      }

      state.adhocDataViews.push(action.payload);
    },
    init: (state) => {
      state.status = 'loading';
    },
    error: (state) => {
      state.status = 'error';
    },
  },
});

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
