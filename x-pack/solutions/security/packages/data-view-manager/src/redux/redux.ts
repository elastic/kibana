/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ReactReduxContextValue } from 'react-redux-v7';
import { createDispatchHook, createSelectorHook } from 'react-redux-v7';
import { configureStore, createListenerMiddleware } from 'redux-toolkit-v1';

import { dataViewManagerReducer, initialDataViewManagerState } from './reducer';
import type { RootState } from './reducer';

/**
 * Listener middleware instance for the data view manager store. Async listeners
 * (data view initialization and selection) are added to this instance at runtime.
 */
export const listenerMiddleware = createListenerMiddleware();

/**
 * The data view manager owns its own redux store, fully isolated from any host
 * application store. Consumers interact with it exclusively through the hooks
 * and components exposed by this package.
 */
export const store = configureStore({
  reducer: {
    dataViewManager: dataViewManagerReducer,
  },
  preloadedState: initialDataViewManagerState,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    // Data view payloads (DataView instances) are intentionally non-serializable,
    // so the serializability/immutability dev checks are disabled.
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).prepend(listenerMiddleware.middleware),
});

/**
 * Dedicated react-redux context so the store is not shared with the host
 * application's default redux context.
 */
export const Context = createContext<ReactReduxContextValue<RootState>>({
  store,
  storeState: initialDataViewManagerState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);
