/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { createDispatchHook, createSelectorHook, ReactReduxContextValue } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { panelsReducer, uiReducer } from './reducers';
import { initialState, State } from './state';
import {
  clearAllUserWidthsFromLocalStorageMiddleware,
  savePushVsOverlayToLocalStorageMiddleware,
  saveUserFlyoutWidthsToLocalStorageMiddleware,
  saveUserSectionWidthsToLocalStorageMiddleware,
} from './middlewares';

export const store = configureStore({
  reducer: {
    panels: panelsReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: [
    savePushVsOverlayToLocalStorageMiddleware,
    saveUserSectionWidthsToLocalStorageMiddleware,
    saveUserFlyoutWidthsToLocalStorageMiddleware,
    clearAllUserWidthsFromLocalStorageMiddleware,
  ],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

const panelsSelector = createSelector(stateSelector, (state) => state.panels);
export const selectPanelsById = (id: string) =>
  createSelector(panelsSelector, (state) => state.byId[id] || {});
export const selectNeedsSync = () => createSelector(panelsSelector, (state) => state.needsSync);
export const selectHistoryById = (id: string) =>
  createSelector(stateSelector, (state) => state.panels.byId[id].history || []);

const uiSelector = createSelector(stateSelector, (state) => state.ui);
export const selectPushVsOverlay = createSelector(uiSelector, (state) => state.pushVsOverlay);
export const selectDefaultWidths = createSelector(uiSelector, (state) => state.defaultWidths);
export const selectUserFlyoutWidths = createSelector(uiSelector, (state) => state.userFlyoutWidths);
export const selectUserSectionWidths = createSelector(
  uiSelector,
  (state) => state.userSectionWidths
);
