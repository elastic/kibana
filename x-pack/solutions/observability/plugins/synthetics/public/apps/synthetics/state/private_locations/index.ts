/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from 'redux-toolkit-v1';
import type {
  PrivateLocation,
  SyntheticsPrivateLocations,
} from '../../../../../common/runtime_types';
import {
  createPrivateLocationAction,
  deletePrivateLocationAction,
  editPrivateLocationAction,
  setPrivateLocationToEdit,
} from './actions';
import { setIsPrivateLocationFlyoutVisible, getPrivateLocationsAction } from './actions';
import type { IHttpSerializedFetchError } from '../utils/http_error';

export interface PrivateLocationsState {
  data?: SyntheticsPrivateLocations | null;
  loading: boolean;
  createLoading?: boolean;
  editLoading?: boolean;
  deleteLoading?: boolean;
  error: IHttpSerializedFetchError | null;
  isManageFlyoutOpen?: boolean;
  isPrivateLocationFlyoutVisible?: boolean;
  newLocation?: PrivateLocation;
  privateLocationToEdit?: PrivateLocation;
}

const initialState: PrivateLocationsState = {
  data: null,
  loading: false,
  error: null,
  isManageFlyoutOpen: false,
  isPrivateLocationFlyoutVisible: false,
  createLoading: false,
  editLoading: false,
  privateLocationToEdit: undefined,
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
      state.isPrivateLocationFlyoutVisible = false;
    })
    .addCase(createPrivateLocationAction.fail, (state, action) => {
      state.error = action.payload;
      state.createLoading = false;
    })
    .addCase(editPrivateLocationAction.get, (state) => {
      state.editLoading = true;
    })
    .addCase(editPrivateLocationAction.success, (state, action) => {
      state.editLoading = false;
      state.privateLocationToEdit = undefined;
      state.data = null;
      state.isPrivateLocationFlyoutVisible = false;
    })
    .addCase(editPrivateLocationAction.fail, (state, action) => {
      state.editLoading = false;
      state.error = action.payload;
      // A 5xx can follow a partially committed edit (e.g. the revert after a failed schedule). Close the
      // editor and reload so a second save is compared against what was persisted.
      if ((action.payload.body.statusCode ?? 0) >= 500) {
        state.privateLocationToEdit = undefined;
        state.data = null;
        state.isPrivateLocationFlyoutVisible = false;
      }
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
    .addCase(setIsPrivateLocationFlyoutVisible, (state, action) => {
      state.isPrivateLocationFlyoutVisible = action.payload;
    })
    .addCase(setPrivateLocationToEdit, (state, action) => {
      state.privateLocationToEdit = action.payload;
    });
});
