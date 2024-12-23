/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  DEFAULT_THROTTLING,
  ServiceLocations,
  ThrottlingOptions,
} from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '../utils/http_error';

import {
  getServiceLocations,
  getServiceLocationsSuccess,
  getServiceLocationsFailure,
} from './actions';

export interface ServiceLocationsState {
  locations: ServiceLocations;
  throttling: ThrottlingOptions | null;
  loading: boolean;
  error: IHttpSerializedFetchError | null;
  locationsLoaded?: boolean;
}

const initialState: ServiceLocationsState = {
  locations: [],
  throttling: DEFAULT_THROTTLING,
  loading: false,
  locationsLoaded: false,
  error: null,
};

export const serviceLocationsReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getServiceLocations, (state) => {
      state.loading = true;
      state.locationsLoaded = true;
    })
    .addCase(getServiceLocationsSuccess, (state, action) => {
      state.loading = false;
      state.error = null;
      state.locations = action.payload.locations;
      state.throttling = action.payload.throttling || DEFAULT_THROTTLING;
    })
    .addCase(getServiceLocationsFailure, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
