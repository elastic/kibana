/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/common';
import type { AnyAction } from '@reduxjs/toolkit';
import { combineReducers, createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DataViewPickerScopeName, SLICE_PREFIX } from '../constants';
import type { SharedDataViewSelectionState } from './types';
import { type ScopedDataViewSelectionState } from './types';

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
  id?: string | null;
  patterns?: string[];
  scope: DataViewPickerScopeName;
}>(`${SLICE_PREFIX}/selectDataView`);

const createDataViewSelectionSlice = <T extends string>(scopeName: T) =>
  createSlice({
    name: `${SLICE_PREFIX}/${scopeName}`,
    initialState: initialScopeState,
    reducers: {
      setSelectedDataView: (state, action: PayloadAction<DataViewSpec>) => {
        state.dataView = action.payload;
        state.status = 'ready';
      },
      dataViewSelectionError: (state, action: AnyAction) => {
        state.status = 'error';
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
    addDataView: (state, action: PayloadAction<DataView>) => {
      const dataViewSpec = action.payload.toSpec();

      if (action.payload.isPersisted()) {
        if (state.dataViews.find((dv) => dv.id === dataViewSpec.id)) {
          return;
        }

        state.dataViews.push(dataViewSpec);
      } else {
        if (state.adhocDataViews.find((dv) => dv.title === dataViewSpec.title)) {
          return;
        }

        state.adhocDataViews.push(dataViewSpec);
      }
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
