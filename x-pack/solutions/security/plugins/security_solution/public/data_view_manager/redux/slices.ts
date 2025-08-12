/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { DataViewSpec, DataView } from '@kbn/data-views-plugin/common';
import type { DataViewManagerScopeName } from '../constants';
import { SLICE_PREFIX } from '../constants';
import type {
  ScopedDataViewSelectionState,
  SharedDataViewSelectionState,
  SignalIndexMetadata,
} from './types';
import { selectDataViewAsync, type SelectDataViewAsyncPayload } from './actions';

export const initialScopeState: ScopedDataViewSelectionState = {
  dataViewId: null,
  status: 'pristine',
};

export const initialSharedState: SharedDataViewSelectionState = {
  dataViews: [],
  adhocDataViews: [],
  status: 'pristine',
  signalIndex: null,
  defaultDataViewId: null,
  alertDataViewId: null,
};

export const sharedDataViewManagerSlice = createSlice({
  name: `${SLICE_PREFIX}/shared`,
  initialState: initialSharedState,
  reducers: {
    setDataViews: (state, action: PayloadAction<DataViewSpec[]>) => {
      state.dataViews = action.payload;
      state.status = 'ready';
    },
    setSignalIndex: (state, action: PayloadAction<SignalIndexMetadata>) => {
      state.signalIndex = action.payload;
    },
    setDataViewId: (
      state,
      action: PayloadAction<{ defaultDataViewId: string; alertDataViewId: string }>
    ) => {
      state.defaultDataViewId = action.payload.defaultDataViewId;
      state.alertDataViewId = action.payload.alertDataViewId;
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
    init: (state, _: PayloadAction<SelectDataViewAsyncPayload[]>) => {
      state.status = 'loading';
    },
    error: (state) => {
      state.status = 'error';
    },
  },
});

export const createDataViewSelectionSlice = <T extends DataViewManagerScopeName>(scopeName: T) =>
  createSlice({
    name: `${SLICE_PREFIX}/${scopeName}`,
    initialState: initialScopeState,
    reducers: {
      setSelectedDataView: (state, action: PayloadAction<string>) => {
        state.dataViewId = action.payload ?? null;
        state.status = 'ready';
      },
      dataViewSelectionError: (state, _: PayloadAction<string>) => {
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
