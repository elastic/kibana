/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ReactReduxContextValue } from 'react-redux';
import { createDispatchHook, createSelectorHook } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { panelsReducer, uiReducer } from './reducers';
import type { State } from './state';
import { initialState } from './state';

export const store = configureStore({
  reducer: {
    panels: panelsReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

const panelsSelector = createSelector(stateSelector, (state) => state.panels);
export const selectPanels = createSelector(panelsSelector, (state) => state);

const uiSelector = createSelector(stateSelector, (state) => state.ui);
export const selectPushVsOverlay = createSelector(uiSelector, (state) => state.pushVsOverlay);
export const selectMainSize = createSelector(uiSelector, (state) => state.mainSize);
export const selectChildSize = createSelector(uiSelector, (state) => state.childSize);
export const selectHasChildBackground = createSelector(
  uiSelector,
  (state) => state.hasChildBackground
);
