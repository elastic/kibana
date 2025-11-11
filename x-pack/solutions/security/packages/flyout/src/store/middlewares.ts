/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, Dispatch } from '@reduxjs/toolkit';
import { changePushVsOverlayAction } from './actions';
import { FLYOUT_LOCAL_STORAGE, PUSH_VS_OVERLAY_LOCAL_STORAGE } from '../constants';

/**
 * Middleware to save the push vs overlay state to local storage
 */
export const savePushVsOverlayToLocalStorageMiddleware =
  () => (next: Dispatch) => (action: Action) => {
    if (!action.type) {
      return next(action);
    }

    if (changePushVsOverlayAction.match(action) && action.payload.savedToLocalStorage) {
      const currentStringValue = localStorage.getItem(FLYOUT_LOCAL_STORAGE);
      const currentJsonValue = currentStringValue ? JSON.parse(currentStringValue) : {};

      currentJsonValue[PUSH_VS_OVERLAY_LOCAL_STORAGE] = action.payload.type;

      localStorage.setItem(FLYOUT_LOCAL_STORAGE, JSON.stringify(currentJsonValue));
    }

    return next(action);
  };
