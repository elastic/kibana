/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ReactReduxContextValue } from 'react-redux';
import { createSelectorHook } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { reducer } from './reducers';
import type { State } from './state';
import { initialState } from './state';

export const store = configureStore({
  reducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: [],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

export const selectExperimentalFeature = () =>
  createSelector(stateSelector, (state) => state.experimentalFeatures);
