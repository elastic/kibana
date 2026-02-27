/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Provider as ReduxProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  savePushVsOverlayToLocalStorageMiddleware,
  saveUserSectionWidthsToLocalStorageMiddleware,
  saveUserFlyoutWidthsToLocalStorageMiddleware,
} from '../store/middlewares';
import { ExpandableFlyoutContextProvider } from '../context';
import { panelsReducer, uiReducer } from '../store/reducers';
import { Context } from '../store/redux';
import type { State } from '../store/state';
import { initialState } from '../store/state';

interface TestProviderProps {
  state?: State;
  urlKey?: string;
}

export const TestProvider: FC<PropsWithChildren<TestProviderProps>> = ({
  children,
  state = initialState,
  urlKey,
}) => {
  const store = configureStore({
    reducer: {
      panels: panelsReducer,
      ui: uiReducer,
    },
    devTools: false,
    preloadedState: state,
    middleware: [
      savePushVsOverlayToLocalStorageMiddleware,
      saveUserSectionWidthsToLocalStorageMiddleware,
      saveUserFlyoutWidthsToLocalStorageMiddleware,
    ],
  });

  return (
    <I18nProvider>
      <ExpandableFlyoutContextProvider urlKey={urlKey}>
        <ReduxProvider store={store} context={Context}>
          {children}
        </ReduxProvider>
      </ExpandableFlyoutContextProvider>
    </I18nProvider>
  );
};
