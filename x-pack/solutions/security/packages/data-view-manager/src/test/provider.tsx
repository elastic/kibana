/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { Provider as ReduxProvider } from 'react-redux-v7';
import { configureStore } from 'redux-toolkit-v1';

import { dataViewManagerReducer, initialDataViewManagerState } from '../redux/reducer';
import type { RootState } from '../redux/reducer';
import { Context } from '../redux/redux';
import { DataViewManagerDependenciesProvider } from '../context';
import type { DataViewManagerDependencies } from '../context';

export interface DataViewManagerTestProviderProps {
  /**
   * Preloaded state for the data view manager store. Defaults to the pristine
   * initial state.
   */
  state?: RootState;
  /**
   * Host-supplied dependencies (services + factories). Tests that exercise
   * dependency-consuming hooks should pass mocks; tests that mock those hooks can
   * omit this.
   */
  dependencies?: DataViewManagerDependencies;
}

/**
 * Test-only provider for the data view manager. Unlike the production
 * `DataViewManagerProvider`, this creates a **fresh, isolated store per render**
 * (seeded with `state`) so tests never share or leak store state, and it does
 * not register the async initialization listeners. It reuses the package's real
 * redux `Context`, so the package hooks resolve against this store.
 */
export const DataViewManagerTestProvider: FC<
  PropsWithChildren<DataViewManagerTestProviderProps>
> = ({ children, state = initialDataViewManagerState, dependencies = {} as DataViewManagerDependencies }) => {
  const store = useMemo(
    () =>
      configureStore({
        reducer: {
          dataViewManager: dataViewManagerReducer,
        },
        preloadedState: state,
        devTools: false,
        // Data view payloads are intentionally non-serializable; the async
        // listeners are intentionally omitted so seeded state stays stable.
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
          }),
      }),
    [state]
  );

  return (
    <ReduxProvider store={store} context={Context}>
      <DataViewManagerDependenciesProvider dependencies={dependencies}>
        {children}
      </DataViewManagerDependenciesProvider>
    </ReduxProvider>
  );
};
