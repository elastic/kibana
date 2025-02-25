/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/common';
import type { DataViewPickerScopeName } from '../constants';
import { SLICE_PREFIX } from '../constants';
import type { ScopedDataViewSelectionState, SharedDataViewSelectionState } from './types';
import { selectDataViewAsync } from './actions';

export const initialScopeState: ScopedDataViewSelectionState = {
  dataView: null,
  status: 'pristine',
};

export const initialSharedState: SharedDataViewSelectionState = {
  dataViews: [],
  adhocDataViews: [],
  status: 'pristine',
};

export const createDataViewSelectionSlice = <T extends DataViewPickerScopeName>(scopeName: T) =>
  createSlice({
    name: `${SLICE_PREFIX}/${scopeName}`,
    initialState: initialScopeState,
    reducers: {
      setSelectedDataView: (state, action: PayloadAction<DataViewSpec>) => {
        state.dataView = action.payload;
        state.status = 'ready';
      },
      dataViewSelectionError: (state, action: PayloadAction<string>) => {
        state.status = 'error';
      },
    },
    extraReducers(builder) {
      builder.addCase(selectDataViewAsync, (state, action) => {
        if (!action.payload.scope.includes(scopeName)) {
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
