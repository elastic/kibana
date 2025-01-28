/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from '@reduxjs/toolkit';
import { PrivateLocation, SyntheticsPrivateLocations } from '../../../../../common/runtime_types';
import { createPrivateLocationAction, deletePrivateLocationAction } from './actions';
import { setIsCreatePrivateLocationFlyoutVisible, getPrivateLocationsAction } from './actions';
import { IHttpSerializedFetchError } from '../utils/http_error';

export interface PrivateLocationsState {
  data?: SyntheticsPrivateLocations | null;
  loading: boolean;
  createLoading?: boolean;
  deleteLoading?: boolean;
  error: IHttpSerializedFetchError | null;
  isManageFlyoutOpen?: boolean;
  isCreatePrivateLocationFlyoutVisible?: boolean;
  newLocation?: PrivateLocation;
}

const initialState: PrivateLocationsState = {
  data: null,
  loading: false,
  error: null,
  isManageFlyoutOpen: false,
  isCreatePrivateLocationFlyoutVisible: false,
  createLoading: false,
};

export const privateLocationsStateReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(getPrivateLocationsAction.get, (state) => {
      state.loading = true;
    })
    .addCase(getPrivateLocationsAction.success, (state, action) => {
      state.data = action.payload;
      state.loading = false;
    })
    .addCase(getPrivateLocationsAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
    })
    .addCase(createPrivateLocationAction.get, (state) => {
      state.createLoading = true;
    })
    .addCase(createPrivateLocationAction.success, (state, action) => {
      state.newLocation = action.payload;
      state.createLoading = false;
      state.data = null;
      state.isCreatePrivateLocationFlyoutVisible = false;
    })
    .addCase(createPrivateLocationAction.fail, (state, action) => {
      state.error = action.payload;
      state.createLoading = false;
    })
    .addCase(deletePrivateLocationAction.get, (state) => {
      state.deleteLoading = true;
    })
    .addCase(deletePrivateLocationAction.success, (state, action) => {
      state.deleteLoading = false;
      state.data = null;
    })
    .addCase(deletePrivateLocationAction.fail, (state, action) => {
      state.error = action.payload;
      state.deleteLoading = false;
    })
    .addCase(setIsCreatePrivateLocationFlyoutVisible, (state, action) => {
      state.isCreatePrivateLocationFlyoutVisible = action.payload;
    });
});
